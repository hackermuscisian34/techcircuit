import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import ContentSubmission, ContentVersion, ApprovalDecision, ReviewReceipt, User, Finding, BrandAsset
from app.schemas.domain import ApprovalDecisionCreate, ApprovalDecisionResponse, ReviewReceiptResponse, ContentSubmissionResponse, BrandAssetResponse, BrandAssetApproval
from app.core.security import get_current_user, require_roles
from app.core.audit_chain import record_audit_event
from app.config import settings
router = APIRouter(prefix='/approvals', tags=['Human Approval Workflow'])
ALLOWED_APPROVER_ROLES = ['ADMIN', 'BRAND_MANAGER', 'AUTHORISED_REVIEWER', 'APPROVER']

@router.get('/queue', response_model=List[ContentSubmissionResponse])
def get_approval_queue(current_user: User=Depends(require_roles(*ALLOWED_APPROVER_ROLES)), db: Session=Depends(get_db)):
    submissions = db.query(ContentSubmission).filter(ContentSubmission.workspace_id == current_user.workspace_id, ContentSubmission.current_status.in_(['SUBMITTED', 'CHANGES_REQUESTED'])).order_by(ContentSubmission.created_at.desc()).all()
    results = []
    for s in submissions:
        res = ContentSubmissionResponse.model_validate(s)
        res.creator_name = s.creator.full_name if s.creator else 'Unknown Creator'
        results.append(res)
    return results

@router.post('/{submission_id}', response_model=Dict[str, Any])
def submit_approval_decision(submission_id: str, payload: ApprovalDecisionCreate, current_user: User=Depends(require_roles(*ALLOWED_APPROVER_ROLES)), db: Session=Depends(get_db)):
    sub = db.query(ContentSubmission).filter(ContentSubmission.id == submission_id, ContentSubmission.workspace_id == current_user.workspace_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail='Submission not found.')
    approver = current_user
    if approver.id == sub.creator_id and approver.role != 'ADMIN':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Creators are not permitted to approve their own submissions.')
    if payload.decision == 'APPROVED_WITH_EXCEPTION' and (not payload.reason):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Documented reason is mandatory when approving with an exception.')
    latest_version = db.query(ContentVersion).filter(ContentVersion.submission_id == sub.id).order_by(ContentVersion.version_number.desc()).first()
    if not latest_version:
        raise HTTPException(status_code=400, detail='No content version available to approve.')
    decision_record = ApprovalDecision(content_version_id=latest_version.id, approver_id=approver.id, decision=payload.decision, reason=payload.reason, exception_category=payload.exception_category)
    db.add(decision_record)
    sub.current_status = payload.decision
    db.flush()
    receipt = None
    if payload.decision in ['APPROVED', 'APPROVED_WITH_EXCEPTION']:
        findings = db.query(Finding).filter(Finding.content_version_id == latest_version.id).all()
        verified_count = sum((1 for f in findings if f.verification_status == 'VERIFIED'))
        advisory_count = sum((1 for f in findings if f.severity == 'ADVISORY'))
        receipt = ReviewReceipt(submission_id=sub.id, content_version_id=latest_version.id, content_hash=latest_version.content_hash, rulebook_version=latest_version.rulebook_version, approver_id=approver.id, final_verdict=payload.decision, verified_findings_count=verified_count, advisory_count=advisory_count, model_disclosure={'provider': 'Local Ollama Inference', 'model': settings.OLLAMA_MODEL, 'local_only': True, 'prompt_injection_screened': True})
        db.add(receipt)
        db.flush()
    db.commit()
    record_audit_event(db=db, workspace_id=sub.workspace_id, event_type='APPROVAL_DECISION', actor_id=approver.id, actor_role=approver.role, details={'submission_id': sub.id, 'version_id': latest_version.id, 'decision': payload.decision, 'reason': payload.reason, 'content_hash': latest_version.content_hash, 'receipt_id': receipt.id if receipt else None})
    return {'submission_id': sub.id, 'decision': payload.decision, 'approver': approver.full_name, 'status': sub.current_status, 'receipt_id': receipt.id if receipt else None, 'content_hash': latest_version.content_hash}

@router.get('/assets', response_model=List[BrandAssetResponse])
def get_asset_approval_queue(current_user: User=Depends(require_roles(*ALLOWED_APPROVER_ROLES)), db: Session=Depends(get_db)):
    assets = db.query(BrandAsset).filter(BrandAsset.workspace_id == current_user.workspace_id, BrandAsset.status == 'PENDING_APPROVAL').order_by(BrandAsset.created_at.desc()).all()
    return assets

@router.post('/assets/{asset_id}', response_model=Dict[str, Any])
def submit_asset_approval_decision(asset_id: str, payload: BrandAssetApproval, current_user: User=Depends(require_roles(*ALLOWED_APPROVER_ROLES)), db: Session=Depends(get_db)):
    asset = db.query(BrandAsset).filter(BrandAsset.id == asset_id, BrandAsset.workspace_id == current_user.workspace_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail='Brand asset not found.')
    decision_upper = payload.decision.upper().strip()
    if decision_upper not in ['APPROVED', 'REJECTED']:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Decision must be either 'APPROVED' or 'REJECTED'.")
    now = datetime.now(timezone.utc)
    asset.status = decision_upper
    asset.approved_by_id = current_user.id
    asset.approved_by_name = current_user.full_name
    asset.approved_at = now
    asset.rejection_reason = payload.reason if decision_upper == 'REJECTED' else None
    asset.updated_at = now
    meta = dict(asset.metadata_json or {})
    approval_hash = None
    receipt_id = f'RCPT-ASSET-{asset.id[:8].upper()}'
    if decision_upper == 'APPROVED':
        if asset.file_path:
            full_path = Path(settings.BASE_DIR) / asset.file_path
            if full_path.exists():
                with open(full_path, 'rb') as f:
                    approval_hash = hashlib.sha256(f.read()).hexdigest()
        if not approval_hash:
            approval_hash = hashlib.sha256(f'{asset.id}:{now.isoformat()}'.encode()).hexdigest()
        meta['approval_hash'] = approval_hash
        meta['receipt_id'] = receipt_id
        meta['approved_by'] = current_user.full_name
        meta['approved_at'] = now.isoformat()
    asset.metadata_json = meta
    db.commit()
    db.refresh(asset)
    record_audit_event(db=db, workspace_id=current_user.workspace_id, event_type='ASSET_APPROVAL_DECISION', actor_id=current_user.id, actor_role=current_user.role, details={'asset_id': asset.id, 'name': asset.name, 'decision': decision_upper, 'reason': payload.reason, 'approver': current_user.email, 'receipt_id': receipt_id if decision_upper == 'APPROVED' else None, 'content_hash': approval_hash})
    return {'asset_id': asset.id, 'name': asset.name, 'decision': decision_upper, 'approver': current_user.full_name, 'status': asset.status, 'receipt_id': receipt_id if decision_upper == 'APPROVED' else None, 'content_hash': approval_hash}
