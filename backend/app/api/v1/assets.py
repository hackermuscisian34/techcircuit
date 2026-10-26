import io
import json
import mimetypes
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from fastapi.security import HTTPAuthorizationCredentials
from app.config import settings
from app.db.session import get_db
from app.db.models import BrandAsset, User, Workspace
from app.schemas.domain import BrandAssetResponse, BrandAssetCreate, BrandAssetUpdate, BrandAssetApproval, BrandAssetStats, BrandColorCreate
from app.core.security import get_current_user, get_optional_current_user, require_roles, http_bearer
from app.core.audit_chain import record_audit_event
from app.core.parser import read_uploaded_file_safely, validate_file_signature
from app.core.visual_audit import analyze_image_asset
from app.core.asset_storage import sanitize_filename, sanitize_svg, get_asset_storage_path, extract_image_metadata, evaluate_color_accessibility
router = APIRouter(prefix='/assets', tags=['Brand Asset Management'])

@router.get('', response_model=List[BrandAssetResponse])
@router.get('/', response_model=List[BrandAssetResponse])
def list_assets(category: Optional[str]=Query(None, description='Filter by category'), status: Optional[str]=Query(None, description='Filter by approval status'), search: Optional[str]=Query(None, description='Search by name or description'), sort: Optional[str]=Query('newest', description='Sort order: newest, oldest, name_asc, name_desc, updated'), current_user: User=Depends(get_current_user), db: Session=Depends(get_db)):
    query = db.query(BrandAsset).filter(BrandAsset.workspace_id == current_user.workspace_id)
    if category and category.upper() != 'ALL':
        query = query.filter(BrandAsset.category == category.upper())
    if status and status.upper() != 'ALL':
        query = query.filter(BrandAsset.status == status.upper())
    if search and search.strip():
        term = f'%{search.strip().lower()}%'
        query = query.filter(or_(BrandAsset.name.ilike(term), BrandAsset.description.ilike(term), BrandAsset.file_format.ilike(term), BrandAsset.intended_usage.ilike(term)))
    if sort == 'oldest':
        query = query.order_by(asc(BrandAsset.created_at))
    elif sort == 'name_asc':
        query = query.order_by(asc(BrandAsset.name))
    elif sort == 'name_desc':
        query = query.order_by(desc(BrandAsset.name))
    elif sort == 'updated':
        query = query.order_by(desc(BrandAsset.updated_at))
    else:
        query = query.order_by(desc(BrandAsset.created_at))
    assets = query.all()
    return assets

@router.get('/stats', response_model=BrandAssetStats)
def get_asset_stats(current_user: User=Depends(get_current_user), db: Session=Depends(get_db)):
    assets = db.query(BrandAsset).filter(BrandAsset.workspace_id == current_user.workspace_id).all()
    total = len(assets)
    approved = sum((1 for a in assets if a.status == 'APPROVED'))
    pending = sum((1 for a in assets if a.status == 'PENDING_APPROVAL'))
    archived = sum((1 for a in assets if a.status == 'ARCHIVED'))
    rejected = sum((1 for a in assets if a.status == 'REJECTED'))
    cat_summary: Dict[str, int] = {'LOGOS': 0, 'TYPOGRAPHY': 0, 'COLORS': 0, 'MARKETING': 0, 'GUIDELINES': 0, 'OTHER': 0}
    for a in assets:
        if a.status != 'ARCHIVED':
            c = a.category.upper() if a.category else 'OTHER'
            cat_summary[c] = cat_summary.get(c, 0) + 1
    return BrandAssetStats(total_assets=total, approved_assets=approved, pending_approval=pending, archived_assets=archived, rejected_assets=rejected, categories_summary=cat_summary)

@router.post('', response_model=BrandAssetResponse)
@router.post('/', response_model=BrandAssetResponse)
@router.post('/upload', response_model=BrandAssetResponse)
@router.post('/upload/', response_model=BrandAssetResponse)
async def upload_asset(name: str=Form(...), category: str=Form(...), description: Optional[str]=Form(None), intended_usage: Optional[str]=Form(None), version: Optional[str]=Form('1.0.0'), metadata_json: Optional[str]=Form(None), file: Optional[UploadFile]=File(None), current_user: User=Depends(get_current_user), db: Session=Depends(get_db)):
    workspace_id = current_user.workspace_id
    cat_upper = category.upper().strip()
    valid_categories = {'LOGOS', 'TYPOGRAPHY', 'COLORS', 'MARKETING', 'GUIDELINES', 'OTHER'}
    if cat_upper not in valid_categories:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid category '{category}'. Must be one of: {', '.join(sorted(valid_categories))}")
    file_bytes: Optional[bytes] = None
    clean_fn: Optional[str] = None
    ext: str = ''
    file_rel_path: Optional[str] = None
    file_size = 0
    mime_type: Optional[str] = None
    parsed_meta: Dict[str, Any] = {}
    if metadata_json:
        try:
            parsed_meta = json.loads(metadata_json)
        except Exception:
            parsed_meta = {}
    if file and file.filename:
        file_bytes = await read_uploaded_file_safely(file, max_size_mb=settings.MAX_ASSET_UPLOAD_SIZE_MB)
        file_size = len(file_bytes)
        clean_fn = sanitize_filename(file.filename)
        ext = clean_fn.lower().split('.')[-1] if '.' in clean_fn else ''
        dotted_ext = f'.{ext}'
        if dotted_ext not in settings.ALLOWED_ASSET_EXTENSIONS:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported file format '{dotted_ext}'. Allowed: {', '.join(settings.ALLOWED_ASSET_EXTENSIONS)}")
        if ext == 'svg':
            file_bytes = sanitize_svg(file_bytes)
            mime_type = 'image/svg+xml'
            img_meta = extract_image_metadata(file_bytes, 'svg')
            parsed_meta.update({k: v for k, v in img_meta.items() if v is not None})
        elif ext in ['png', 'jpg', 'jpeg', 'webp']:
            validate_file_signature(clean_fn, file_bytes)
            img_meta = extract_image_metadata(file_bytes, ext)
            parsed_meta.update({k: v for k, v in img_meta.items() if v is not None})
            mime_type = f"image/{('jpeg' if ext in ['jpg', 'jpeg'] else ext)}"
        elif ext == 'pdf':
            validate_file_signature(clean_fn, file_bytes)
            mime_type = 'application/pdf'
        elif ext in ['ttf', 'woff', 'woff2']:
            mime_type = f'font/{ext}'
        else:
            mime_type = mimetypes.guess_type(clean_fn)[0] or 'application/octet-stream'
    initial_status = 'PENDING_APPROVAL'
    if current_user.role in ['ADMIN', 'BRAND_MANAGER']:
        initial_status = 'APPROVED'
    now = datetime.now(timezone.utc)
    new_asset = BrandAsset(workspace_id=workspace_id, name=name.strip(), category=cat_upper, description=description.strip() if description else None, intended_usage=intended_usage.strip() if intended_usage else None, file_name=clean_fn, file_format=ext.upper() if ext else parsed_meta.get('format') or 'SPEC', file_size_bytes=file_size, mime_type=mime_type, version=version or '1.0.0', status=initial_status, metadata_json=parsed_meta, uploader_id=current_user.id, uploader_name=current_user.full_name, uploader_email=current_user.email, approved_by_id=current_user.id if initial_status == 'APPROVED' else None, approved_by_name=current_user.full_name if initial_status == 'APPROVED' else None, approved_at=now if initial_status == 'APPROVED' else None)
    db.add(new_asset)
    db.commit()
    db.refresh(new_asset)
    if file_bytes and clean_fn:
        dest_path = get_asset_storage_path(workspace_id, new_asset.id, clean_fn)
        with open(dest_path, 'wb') as f_out:
            f_out.write(file_bytes)
        setattr(new_asset, 'file_path', str(dest_path.relative_to(settings.BASE_DIR)))
        db.commit()
        db.refresh(new_asset)
    record_audit_event(db=db, workspace_id=workspace_id, event_type='ASSET_UPLOADED', actor_id=current_user.id, actor_role=current_user.role, details={'asset_id': new_asset.id, 'name': new_asset.name, 'category': new_asset.category, 'format': new_asset.file_format, 'status': new_asset.status})
    return new_asset

@router.post('/color', response_model=BrandAssetResponse)
@router.post('/color/', response_model=BrandAssetResponse)
@router.post('/colors', response_model=BrandAssetResponse)
@router.post('/colors/', response_model=BrandAssetResponse)
def add_brand_color(payload: BrandColorCreate, current_user: User=Depends(get_current_user), db: Session=Depends(get_db)):
    hex_clean = payload.hex.strip()
    if not re.match('^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$', hex_clean):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid HEX color code '{payload.hex}'. Must be in format #RGB or #RRGGBB.")
    a11y = evaluate_color_accessibility(hex_clean)
    meta = {'hex': hex_clean.upper(), 'rgb': a11y['rgb'], 'rgb_values': a11y['rgb_values'], 'role': payload.role, 'contrast_on_white': a11y['contrast_on_white'], 'contrast_on_dark': a11y['contrast_on_dark'], 'recommended_bg': a11y['recommended_bg'], 'best_contrast_ratio': a11y['best_contrast_ratio'], 'passes_aa_normal': a11y['passes_aa_normal'], 'passes_aa_large': a11y['passes_aa_large'], 'passes_aaa': a11y['passes_aaa'], 'wcag_rating': a11y['wcag_rating']}
    now = datetime.now(timezone.utc)
    new_asset = BrandAsset(workspace_id=current_user.workspace_id, name=payload.name.strip(), category='COLORS', description=f'{payload.role} color palette token ({hex_clean.upper()})', intended_usage=payload.intended_usage or f'{payload.role} UI and marketing palette', file_name=f"{payload.name.lower().replace(' ', '_')}.hex", file_format='HEX', file_size_bytes=len(hex_clean), mime_type='text/plain', version='1.0.0', status='APPROVED', metadata_json=meta, uploader_id=current_user.id, uploader_name=current_user.full_name, uploader_email=current_user.email, approved_by_id=current_user.id, approved_by_name=current_user.full_name, approved_at=now)
    db.add(new_asset)
    db.commit()
    db.refresh(new_asset)
    record_audit_event(db=db, workspace_id=current_user.workspace_id, event_type='BRAND_COLOR_REGISTERED', actor_id=current_user.id, actor_role=current_user.role, details={'asset_id': new_asset.id, 'name': new_asset.name, 'hex': hex_clean.upper(), 'role': payload.role, 'wcag_rating': a11y['wcag_rating']})
    return new_asset

@router.get('/{asset_id}', response_model=BrandAssetResponse)
def get_asset_detail(asset_id: str, current_user: User=Depends(get_current_user), db: Session=Depends(get_db)):
    asset = db.query(BrandAsset).filter(BrandAsset.id == asset_id, BrandAsset.workspace_id == current_user.workspace_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Brand asset not found.')
    return asset

@router.put('/{asset_id}', response_model=BrandAssetResponse)
def update_asset(asset_id: str, payload: BrandAssetUpdate, current_user: User=Depends(get_current_user), db: Session=Depends(get_db)):
    asset = db.query(BrandAsset).filter(BrandAsset.id == asset_id, BrandAsset.workspace_id == current_user.workspace_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Brand asset not found.')
    if payload.name is not None:
        setattr(asset, 'name', payload.name.strip())
    if payload.category is not None:
        setattr(asset, 'category', payload.category.upper().strip())
    if payload.description is not None:
        setattr(asset, 'description', payload.description.strip())
    if payload.intended_usage is not None:
        setattr(asset, 'intended_usage', payload.intended_usage.strip())
    if payload.version is not None:
        setattr(asset, 'version', payload.version.strip())
    if payload.metadata_json is not None:
        setattr(asset, 'metadata_json', payload.metadata_json)
    setattr(asset, 'updated_at', datetime.now(timezone.utc))
    db.commit()
    db.refresh(asset)
    record_audit_event(db=db, workspace_id=current_user.workspace_id, event_type='ASSET_METADATA_UPDATED', actor_id=current_user.id, actor_role=current_user.role, details={'asset_id': asset.id, 'name': asset.name})
    return asset
import hashlib
import hmac
import time
ALLOWED_ASSET_APPROVER_ROLES = ['ADMIN', 'BRAND_MANAGER', 'AUTHORISED_REVIEWER', 'APPROVER']

@router.get('/{asset_id}/preview-ticket')
def get_asset_preview_ticket(
    asset_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    asset = db.query(BrandAsset).filter(
        BrandAsset.id == asset_id,
        BrandAsset.workspace_id == current_user.workspace_id
    ).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Brand asset not found.')

    expiry = int(time.time()) + 300  # 5 minutes
    payload_str = f"{asset_id}:{current_user.id}:{current_user.workspace_id}:{expiry}"
    sig = hmac.new(settings.SECRET_KEY.encode('utf-8'), payload_str.encode('utf-8'), hashlib.sha256).hexdigest()
    ticket = f"{payload_str}:{sig}"
    return {'ticket': ticket, 'expires_at': expiry, 'asset_id': asset_id}

@router.post('/{asset_id}/approval', response_model=BrandAssetResponse)
@router.post('/{asset_id}/approve', response_model=BrandAssetResponse)
def update_asset_approval(asset_id: str, payload: BrandAssetApproval, current_user: User=Depends(require_roles(*ALLOWED_ASSET_APPROVER_ROLES)), db: Session=Depends(get_db)):
    asset = db.query(BrandAsset).filter(BrandAsset.id == asset_id, BrandAsset.workspace_id == current_user.workspace_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Brand asset not found.')
    if asset.uploader_id and current_user.id == asset.uploader_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Uploaders are not permitted to approve their own brand assets."
        )
    decision_upper = payload.decision.upper().strip()
    if decision_upper not in ['APPROVED', 'REJECTED']:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Decision must be either 'APPROVED' or 'REJECTED'.")
    now = datetime.now(timezone.utc)
    setattr(asset, 'status', decision_upper)
    setattr(asset, 'approved_by_id', current_user.id)
    setattr(asset, 'approved_by_name', current_user.full_name)
    setattr(asset, 'approved_at', now)
    setattr(asset, 'rejection_reason', payload.reason if decision_upper == 'REJECTED' else None)
    setattr(asset, 'updated_at', now)
    meta = dict(asset.metadata_json or {})
    if decision_upper == 'APPROVED':
        approval_hash = None
        if asset.file_path:
            full_path = Path(settings.BASE_DIR) / asset.file_path
            if full_path.exists():
                with open(full_path, 'rb') as f:
                    approval_hash = hashlib.sha256(f.read()).hexdigest()
        if not approval_hash:
            approval_hash = hashlib.sha256(f'{asset.id}:{now.isoformat()}'.encode()).hexdigest()
        meta['approval_hash'] = approval_hash
        meta['receipt_id'] = f'RCPT-ASSET-{asset.id[:8].upper()}'
        meta['approved_by'] = current_user.full_name
        meta['approved_at'] = now.isoformat()
    setattr(asset, 'metadata_json', meta)
    db.commit()
    db.refresh(asset)
    record_audit_event(db=db, workspace_id=current_user.workspace_id, event_type='ASSET_APPROVAL_DECISION', actor_id=current_user.id, actor_role=current_user.role, details={'asset_id': asset.id, 'decision': decision_upper, 'reason': payload.reason, 'approver': current_user.email, 'receipt_id': meta.get('receipt_id'), 'approval_hash': meta.get('approval_hash')})
    return asset

@router.post('/{asset_id}/archive', response_model=BrandAssetResponse)
def archive_asset(asset_id: str, current_user: User=Depends(get_current_user), db: Session=Depends(get_db)):
    asset = db.query(BrandAsset).filter(BrandAsset.id == asset_id, BrandAsset.workspace_id == current_user.workspace_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Brand asset not found.')
    setattr(asset, 'status', 'ARCHIVED')
    setattr(asset, 'updated_at', datetime.now(timezone.utc))
    db.commit()
    db.refresh(asset)
    record_audit_event(db=db, workspace_id=current_user.workspace_id, event_type='ASSET_ARCHIVED', actor_id=current_user.id, actor_role=current_user.role, details={'asset_id': asset.id, 'name': asset.name})
    return asset

@router.delete('/{asset_id}')
def delete_asset(asset_id: str, current_user: User=Depends(require_roles('ADMIN', 'BRAND_MANAGER')), db: Session=Depends(get_db)):
    asset = db.query(BrandAsset).filter(BrandAsset.id == asset_id, BrandAsset.workspace_id == current_user.workspace_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Brand asset not found.')
    if asset.file_path:
        full_path = Path(settings.BASE_DIR) / asset.file_path
        if full_path.exists():
            try:
                os.remove(full_path)
            except Exception:
                pass
    db.delete(asset)
    db.commit()
    record_audit_event(db=db, workspace_id=current_user.workspace_id, event_type='ASSET_DELETED', actor_id=current_user.id, actor_role=current_user.role, details={'asset_id': asset_id, 'name': asset.name})
    return {'detail': 'Brand asset successfully deleted.'}

@router.get('/{asset_id}/download')
def download_asset(
    asset_id: str,
    auth: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer),
    db: Session = Depends(get_db)
):
    current_user = get_current_user(auth=auth, db=db)
    asset = db.query(BrandAsset).filter(
        BrandAsset.id == asset_id,
        BrandAsset.workspace_id == current_user.workspace_id
    ).first()
    if not asset or not asset.file_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Asset file not found.')
    full_path = Path(asset.file_path) if Path(asset.file_path).is_absolute() else Path(settings.BASE_DIR) / asset.file_path
    try:
        resolved_path = full_path.resolve()
        base_dir_resolved = Path(settings.BASE_DIR).resolve()
        if not resolved_path.is_relative_to(base_dir_resolved):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Access denied: path traversal attempt.')
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid file path.')
    if not full_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Stored asset file is missing from disk.')
    media_type = asset.mime_type or 'application/octet-stream'
    filename = asset.file_name or f"{asset.name}.{asset.file_format.lower()}"
    return FileResponse(
        path=str(full_path),
        filename=filename,
        media_type=media_type,
        content_disposition_type='attachment'
    )

def generate_preview_ticket(asset_id: str, user_id: str, workspace_id: str, secret_key: str, expires_in_seconds: int = 120) -> str:
    expires_at = int(time.time()) + expires_in_seconds
    payload_str = f"{asset_id}:{user_id}:{workspace_id}:{expires_at}"
    sig = hmac.new(secret_key.encode('utf-8'), payload_str.encode('utf-8'), hashlib.sha256).hexdigest()
    return f"{payload_str}:{sig}"

def verify_preview_ticket(ticket: str, asset_id: str, secret_key: str) -> Optional[str]:
    parts = ticket.strip().split(':')
    if len(parts) != 5:
        return None
    t_asset_id, t_user_id, t_ws_id, t_exp_str, t_sig = parts
    if t_asset_id != asset_id:
        return None
    try:
        exp_int = int(t_exp_str)
    except ValueError:
        return None
    if time.time() > exp_int:
        return None
    payload_str = f"{t_asset_id}:{t_user_id}:{t_ws_id}:{t_exp_str}"
    expected_sig = hmac.new(secret_key.encode('utf-8'), payload_str.encode('utf-8'), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(t_sig, expected_sig):
        return None
    return t_ws_id

@router.post('/{asset_id}/preview-ticket')
def create_asset_preview_ticket(
    asset_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    asset = db.query(BrandAsset).filter(
        BrandAsset.id == asset_id,
        BrandAsset.workspace_id == current_user.workspace_id
    ).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Brand asset not found.')
    ticket = generate_preview_ticket(asset.id, current_user.id, current_user.workspace_id, settings.SECRET_KEY, expires_in_seconds=180)
    return {'asset_id': asset.id, 'ticket': ticket, 'expires_in_seconds': 180}

@router.get('/{asset_id}/preview')
def preview_asset(
    asset_id: str,
    ticket: Optional[str] = Query(None, description="Short-lived scoped preview ticket"),
    auth: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer),
    db: Session = Depends(get_db)
):
    target_workspace_id = None
    if auth and auth.credentials:
        current_user = get_current_user(auth=auth, db=db)
        target_workspace_id = current_user.workspace_id
    elif ticket:
        target_workspace_id = verify_preview_ticket(ticket, asset_id, settings.SECRET_KEY)
        if not target_workspace_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid or expired preview ticket.')
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Authentication credentials or preview ticket required.',
            headers={'WWW-Authenticate': 'Bearer'}
        )

    asset = db.query(BrandAsset).filter(
        BrandAsset.id == asset_id,
        BrandAsset.workspace_id == target_workspace_id
    ).first()
    if not asset or not asset.file_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Asset file not found.')
    full_path = Path(asset.file_path) if Path(asset.file_path).is_absolute() else Path(settings.BASE_DIR) / asset.file_path
    try:
        resolved_path = full_path.resolve()
        base_dir_resolved = Path(settings.BASE_DIR).resolve()
        if not resolved_path.is_relative_to(base_dir_resolved):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Access denied: path traversal attempt.')
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid file path.')
    if not full_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Stored asset file is missing.')

    media_type = asset.mime_type or 'application/octet-stream'
    response_headers = {
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
    }
    # Enforce strict sandbox and CSP for SVG previews to prevent XSS in application origin
    if 'svg' in media_type.lower() or full_path.suffix.lower() == '.svg':
        response_headers['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'; sandbox"

    return FileResponse(
        path=str(full_path),
        media_type=media_type,
        content_disposition_type='inline',
        headers=response_headers
    )

@router.post('/{asset_id}/audit-logo')
@router.get('/{asset_id}/audit-logo')
def audit_logo_asset(asset_id: str, current_user: User=Depends(get_current_user), db: Session=Depends(get_db)):
    asset = db.query(BrandAsset).filter(BrandAsset.id == asset_id, BrandAsset.workspace_id == current_user.workspace_id).first()
    if not asset or not asset.file_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Asset file not found.')
    full_path = Path(settings.BASE_DIR) / asset.file_path
    if not full_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Asset file is missing.')
    with open(full_path, 'rb') as f:
        content_bytes = f.read()
    result = analyze_image_asset(content_bytes, asset.file_name or 'logo.png')
    return {'asset_id': asset.id, 'name': asset.name, 'aspect_ratio': result.get('aspect_ratio'), 'width': result.get('width'), 'height': result.get('height'), 'dominant_colors': result.get('dominant_colors', []), 'visual_findings': result.get('visual_findings', []), 'is_compliant': len(result.get('visual_findings', [])) == 0}
