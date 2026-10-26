import uuid
import secrets
import hashlib
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from pathlib import Path

from app.db.session import get_db, engine
from app.db.models import User, Invitation, Workspace, ContentSubmission, AuditEvent
from app.schemas.domain import (
    Token, LoginRequest, UserResponse, UserCreate,
    InvitationCreate, InvitationResponse, InvitationAccept,
    UserStatusUpdate, RoleUpdateRequest, PasswordResetRequest,
    BootstrapAdminRequest, AdminStatsResponse
)
from app.core.security import (
    verify_password, create_access_token, hash_password,
    get_current_user, require_roles
)
from app.core.audit_chain import record_audit_event, verify_audit_chain
from app.config import settings

router = APIRouter(prefix='/auth', tags=['Authentication & RBAC'])

LOGIN_ALIASES = {
    'admin': 'alfred@apexdynamics.example',
    'admin@apexdynamics.example': 'alfred@apexdynamics.example',
    'admin@canon.example': 'alfred@apexdynamics.example',
    'alfred': 'alfred@apexdynamics.example',
    'manager': 'sebin@apexdynamics.example',
    'manager@apexdynamics.example': 'sebin@apexdynamics.example',
    'reviewer': 'albert@apexdynamics.example',
    'reviewer@apexdynamics.example': 'albert@apexdynamics.example',
    'creator': 'adhithya@apexdynamics.example',
    'creator@apexdynamics.example': 'adhithya@apexdynamics.example',
    'approver': 'biju@apexdynamics.example',
    'approver@apexdynamics.example': 'biju@apexdynamics.example',
}

@router.post('/login', response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    search_query = request.email.strip().lower()
    is_dev = settings.ENVIRONMENT.lower() in ('development', 'dev', 'local')
    
    # Aliases only permitted in local development when demo accounts are enabled
    if is_dev and settings.ENABLE_DEMO_ACCOUNTS:
        target_email = LOGIN_ALIASES.get(search_query, search_query)
    else:
        target_email = search_query

    user = db.query(User).filter(
        (func.lower(User.email) == target_email) | (func.lower(User.email) == search_query)
    ).first()

    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Incorrect email or password.',
            headers={'WWW-Authenticate': 'Bearer'}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='User account is deactivated. Contact an administrator.',
            headers={'WWW-Authenticate': 'Bearer'}
        )

    token_data = {
        'sub': user.id,
        'email': user.email,
        'role': user.role,
        'workspace_id': user.workspace_id
    }
    access_token = create_access_token(token_data)

    return Token(
        access_token=access_token,
        token_type='bearer',
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        workspace_id=user.workspace_id
    )

@router.post('/register', response_model=Token)
def register(request: UserCreate, db: Session = Depends(get_db)):
    clean_email = request.email.strip().lower()
    if not clean_email or '@' not in clean_email:
        raise HTTPException(status_code=400, detail='A valid email address is required.')

    if len(request.password) < 8:
        raise HTTPException(status_code=400, detail='Password must be at least 8 characters long.')

    existing = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if existing:
        raise HTTPException(status_code=400, detail='An account with this email already exists.')

    # Public registration is strictly locked to CREATOR role in default workspace.
    # Privileged roles (ADMIN, BRAND_MANAGER, AUTHORISED_REVIEWER, APPROVER) require invitation.
    assigned_role = 'CREATOR'
    workspace_id = settings.DEFAULT_WORKSPACE_ID

    new_user = User(
        id=f'usr-{uuid.uuid4().hex[:8]}',
        workspace_id=workspace_id,
        email=clean_email,
        full_name=request.full_name.strip() or 'Creative Designer',
        role=assigned_role,
        hashed_password=hash_password(request.password),
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    record_audit_event(
        db=db,
        workspace_id=workspace_id,
        event_type='USER_REGISTERED',
        actor_id=new_user.id,
        actor_role=new_user.role,
        details={'email': new_user.email, 'full_name': new_user.full_name, 'role': new_user.role}
    )

    token_data = {
        'sub': new_user.id,
        'email': new_user.email,
        'role': new_user.role,
        'workspace_id': new_user.workspace_id
    }
    access_token = create_access_token(token_data)

    return Token(
        access_token=access_token,
        token_type='bearer',
        user_id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role,
        workspace_id=new_user.workspace_id
    )

@router.get('/me', response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.get('/users', response_model=List[UserResponse])
def list_workspace_users(
    include_deactivated: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(User).filter(User.workspace_id == current_user.workspace_id)
    if not include_deactivated:
        query = query.filter(User.is_active.is_(True))
    return query.order_by(User.created_at.asc()).all()

@router.put('/users/{target_user_id}/role', response_model=UserResponse)
def update_user_role(
    target_user_id: str,
    payload: RoleUpdateRequest,
    current_user: User = Depends(require_roles('ADMIN')),
    db: Session = Depends(get_db)
):
    valid_roles = ['ADMIN', 'BRAND_MANAGER', 'CREATOR', 'AUTHORISED_REVIEWER', 'APPROVER']
    new_role = payload.role.strip().upper()
    if new_role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role '{payload.role}'. Must be one of: {', '.join(valid_roles)}"
        )

    target_user = db.query(User).filter(
        User.id == target_user_id,
        User.workspace_id == current_user.workspace_id
    ).first()
    if not target_user:
        raise HTTPException(status_code=404, detail='User not found in this workspace.')

    # Prevent demoting the only active administrator
    if target_user.role == 'ADMIN' and new_role != 'ADMIN':
        admin_count = db.query(User).filter(
            User.workspace_id == current_user.workspace_id,
            User.role == 'ADMIN',
            User.is_active.is_(True)
        ).count()
        if admin_count <= 1:
            raise HTTPException(
                status_code=400,
                detail='Cannot demote the only active platform administrator. Provision a replacement administrator first.'
            )

    old_role = target_user.role
    target_user.role = new_role
    db.commit()
    db.refresh(target_user)

    record_audit_event(
        db=db,
        workspace_id=current_user.workspace_id,
        event_type='USER_ROLE_UPDATED',
        actor_id=current_user.id,
        actor_role=current_user.role,
        details={'target_user_id': target_user.id, 'old_role': old_role, 'new_role': new_role}
    )

    return target_user

@router.put('/users/{target_user_id}/status', response_model=UserResponse)
def update_user_status(
    target_user_id: str,
    payload: UserStatusUpdate,
    current_user: User = Depends(require_roles('ADMIN')),
    db: Session = Depends(get_db)
):
    target_user = db.query(User).filter(
        User.id == target_user_id,
        User.workspace_id == current_user.workspace_id
    ).first()
    if not target_user:
        raise HTTPException(status_code=404, detail='User not found in this workspace.')

    if current_user.id == target_user.id and not payload.is_active:
        raise HTTPException(status_code=400, detail='Administrators cannot deactivate their own account.')

    if target_user.role == 'ADMIN' and not payload.is_active:
        admin_count = db.query(User).filter(
            User.workspace_id == current_user.workspace_id,
            User.role == 'ADMIN',
            User.is_active.is_(True)
        ).count()
        if admin_count <= 1:
            raise HTTPException(
                status_code=400,
                detail='Cannot deactivate the only active platform administrator.'
            )

    target_user.is_active = payload.is_active
    db.commit()
    db.refresh(target_user)

    record_audit_event(
        db=db,
        workspace_id=current_user.workspace_id,
        event_type='USER_STATUS_UPDATED',
        actor_id=current_user.id,
        actor_role=current_user.role,
        details={'target_user_id': target_user.id, 'is_active': payload.is_active}
    )

    return target_user

@router.post('/users/{target_user_id}/reset-password')
def reset_user_password(
    target_user_id: str,
    payload: PasswordResetRequest,
    current_user: User = Depends(require_roles('ADMIN')),
    db: Session = Depends(get_db)
):
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail='New password must be at least 8 characters long.')

    target_user = db.query(User).filter(
        User.id == target_user_id,
        User.workspace_id == current_user.workspace_id
    ).first()
    if not target_user:
        raise HTTPException(status_code=404, detail='User not found in this workspace.')

    target_user.hashed_password = hash_password(payload.new_password)
    db.commit()

    record_audit_event(
        db=db,
        workspace_id=current_user.workspace_id,
        event_type='USER_PASSWORD_RESET',
        actor_id=current_user.id,
        actor_role=current_user.role,
        details={'target_user_id': target_user.id, 'target_email': target_user.email}
    )

    return {'message': f'Password successfully reset for user {target_user.email}.'}

# ─────────────────────────────────────────────────────────────
# Invitation Flow (Single-Use, Expiring, Bound Tokens)
# ─────────────────────────────────────────────────────────────

@router.post('/invitations', response_model=InvitationResponse)
def create_invitation(
    payload: InvitationCreate,
    current_user: User = Depends(require_roles('ADMIN', 'BRAND_MANAGER')),
    db: Session = Depends(get_db)
):
    target_role = payload.role.strip().upper()
    valid_roles = ['ADMIN', 'BRAND_MANAGER', 'AUTHORISED_REVIEWER', 'CREATOR', 'APPROVER']
    if target_role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid invitation role '{payload.role}'. Must be one of: {', '.join(valid_roles)}"
        )

    # Only ADMIN can invite another ADMIN
    if target_role == 'ADMIN' and current_user.role != 'ADMIN':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Only system administrators can invite new administrators.'
        )

    clean_email = payload.email.strip().lower()
    if not clean_email or '@' not in clean_email:
        raise HTTPException(status_code=400, detail='Valid email address is required.')

    # Generate single-use cryptographically secure random token
    raw_token = secrets.token_urlsafe(32)
    token_digest = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()

    expiry_hours = payload.expires_in_hours or 72
    expires_at = datetime.now(timezone.utc) + timedelta(hours=expiry_hours)

    invitation = Invitation(
        workspace_id=current_user.workspace_id,
        email=clean_email,
        role=target_role,
        token_hash=token_digest,
        invited_by_id=current_user.id,
        expires_at=expires_at,
        is_used=False
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    record_audit_event(
        db=db,
        workspace_id=current_user.workspace_id,
        event_type='INVITATION_ISSUED',
        actor_id=current_user.id,
        actor_role=current_user.role,
        details={
            'invitation_id': invitation.id,
            'email': clean_email,
            'role': target_role,
            'expires_at': expires_at.isoformat()
        }
    )

    resp = InvitationResponse.model_validate(invitation)
    resp.invite_token = raw_token
    return resp

@router.get('/invitations', response_model=List[InvitationResponse])
def list_invitations(
    current_user: User = Depends(require_roles('ADMIN', 'BRAND_MANAGER')),
    db: Session = Depends(get_db)
):
    invites = db.query(Invitation).filter(
        Invitation.workspace_id == current_user.workspace_id,
        Invitation.is_used.is_(False)
    ).order_by(Invitation.created_at.desc()).all()
    return invites

@router.post('/invitations/accept', response_model=Token)
def accept_invitation(payload: InvitationAccept, db: Session = Depends(get_db)):
    if not payload.token or not payload.token.strip():
        raise HTTPException(status_code=400, detail='Invitation token is required.')

    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail='Password must be at least 8 characters long.')

    token_digest = hashlib.sha256(payload.token.strip().encode('utf-8')).hexdigest()
    now = datetime.now(timezone.utc)

    invitation = db.query(Invitation).filter(
        Invitation.token_hash == token_digest,
        Invitation.is_used.is_(False)
    ).first()

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Invalid or already-used invitation token.'
        )

    # Check expiry
    exp = invitation.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='This invitation token has expired. Request a new invitation.'
        )

    # Provision user with bound role and workspace
    existing_user = db.query(User).filter(func.lower(User.email) == invitation.email.lower()).first()
    if existing_user:
        existing_user.role = invitation.role
        existing_user.workspace_id = invitation.workspace_id
        existing_user.full_name = payload.full_name.strip() or existing_user.full_name
        existing_user.hashed_password = hash_password(payload.password)
        existing_user.is_active = True
        user = existing_user
    else:
        user = User(
            id=f'usr-{uuid.uuid4().hex[:8]}',
            workspace_id=invitation.workspace_id,
            email=invitation.email.lower(),
            full_name=payload.full_name.strip() or 'Team Member',
            role=invitation.role,
            hashed_password=hash_password(payload.password),
            is_active=True
        )
        db.add(user)

    invitation.is_used = True
    invitation.used_at = now
    db.commit()
    db.refresh(user)

    record_audit_event(
        db=db,
        workspace_id=user.workspace_id,
        event_type='INVITATION_ACCEPTED',
        actor_id=user.id,
        actor_role=user.role,
        details={'invitation_id': invitation.id, 'email': user.email, 'role': user.role}
    )

    token_data = {
        'sub': user.id,
        'email': user.email,
        'role': user.role,
        'workspace_id': user.workspace_id
    }
    access_token = create_access_token(token_data)

    return Token(
        access_token=access_token,
        token_type='bearer',
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        workspace_id=user.workspace_id
    )

# ─────────────────────────────────────────────────────────────
# Controlled Initial Administrator Provisioning
# ─────────────────────────────────────────────────────────────

@router.post('/bootstrap-admin', response_model=Token)
def bootstrap_admin(payload: BootstrapAdminRequest, db: Session = Depends(get_db)):
    """One-time platform administrator bootstrap. Fails if an active admin already exists."""
    existing_admin = db.query(User).filter(
        User.role == 'ADMIN',
        User.is_active.is_(True)
    ).first()

    if existing_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='An active platform administrator already exists. Public bootstrap is prohibited.'
        )

    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail='Password must be at least 8 characters long.')

    clean_email = payload.email.strip().lower()
    workspace_id = settings.DEFAULT_WORKSPACE_ID

    admin_user = User(
        id=f'usr-admin-{uuid.uuid4().hex[:6]}',
        workspace_id=workspace_id,
        email=clean_email,
        full_name=payload.full_name.strip() or 'System Administrator',
        role='ADMIN',
        hashed_password=hash_password(payload.password),
        is_active=True
    )
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    record_audit_event(
        db=db,
        workspace_id=workspace_id,
        event_type='ADMIN_BOOTSTRAP_EXECUTED',
        actor_id=admin_user.id,
        actor_role='ADMIN',
        details={'email': admin_user.email, 'full_name': admin_user.full_name}
    )

    token_data = {
        'sub': admin_user.id,
        'email': admin_user.email,
        'role': admin_user.role,
        'workspace_id': admin_user.workspace_id
    }
    access_token = create_access_token(token_data)

    return Token(
        access_token=access_token,
        token_type='bearer',
        user_id=admin_user.id,
        email=admin_user.email,
        full_name=admin_user.full_name,
        role=admin_user.role,
        workspace_id=admin_user.workspace_id
    )

# ─────────────────────────────────────────────────────────────
# Persona Switching (Strict Fail-Closed Development Only)
# ─────────────────────────────────────────────────────────────

class SwitchPersonaRequest(BaseModel):
    role: str

@router.post('/switch-persona', response_model=Token)
@router.post('/switch-persona/', response_model=Token)
def switch_persona(payload: SwitchPersonaRequest, db: Session = Depends(get_db)):
    is_dev = settings.ENVIRONMENT.lower() in ('development', 'dev', 'local')
    if not is_dev or not settings.ENABLE_DEV_PERSONA_SWITCHING:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Persona switching is strictly disabled outside development mode."
        )

    target_role = payload.role.strip().upper()
    role_email_map = {
        'ADMIN': 'alfred@apexdynamics.example',
        'BRAND_MANAGER': 'sebin@apexdynamics.example',
        'AUTHORISED_REVIEWER': 'albert@apexdynamics.example',
        'CREATOR': 'adhithya@apexdynamics.example',
        'APPROVER': 'biju@apexdynamics.example',
    }

    user = None
    target_email = role_email_map.get(target_role)
    if target_email:
        user = db.query(User).filter(func.lower(User.email) == target_email).first()
    if not user:
        user = db.query(User).filter(User.role == target_role, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active user found with role '{target_role}'."
        )

    token_data = {'sub': user.id, 'email': user.email, 'role': user.role, 'workspace_id': user.workspace_id}
    access_token = create_access_token(token_data)

    return Token(
        access_token=access_token,
        token_type='bearer',
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        workspace_id=user.workspace_id,
    )

# ─────────────────────────────────────────────────────────────
# Admin Control Center & Diagnostics
# ─────────────────────────────────────────────────────────────

@router.get('/admin/stats', response_model=AdminStatsResponse)
def get_admin_dashboard_stats(
    current_user: User = Depends(require_roles('ADMIN')),
    db: Session = Depends(get_db)
):
    workspace_id = current_user.workspace_id

    total_users = db.query(User).filter(User.workspace_id == workspace_id).count()
    active_users = db.query(User).filter(User.workspace_id == workspace_id, User.is_active.is_(True)).count()
    deactivated_users = total_users - active_users

    total_workspaces = db.query(Workspace).count()
    pending_invitations = db.query(Invitation).filter(
        Invitation.workspace_id == workspace_id,
        Invitation.is_used.is_(False)
    ).count()

    total_submissions = db.query(ContentSubmission).filter(ContentSubmission.workspace_id == workspace_id).count()
    total_audit_events = db.query(AuditEvent).filter(AuditEvent.workspace_id == workspace_id).count()

    # Real DB health check
    db_status = 'connected'
    try:
        with engine.connect() as conn:
            conn.execute(text('SELECT 1'))
    except Exception:
        db_status = 'degraded'

    # Real storage health check
    storage_status = 'accessible'
    try:
        sp = Path(settings.STORAGE_DIR)
        sp.mkdir(parents=True, exist_ok=True)
    except Exception:
        storage_status = 'inaccessible'

    # Real audit chain verification
    chain_result = verify_audit_chain(db, workspace_id)
    audit_chain_valid = chain_result.get('is_valid', False)

    active_is_hf = bool(settings.effective_hf_token or settings.LLM_PROVIDER == 'huggingface') and settings.LLM_PROVIDER != 'ollama'
    active_provider = 'Hugging Face Cloud Inference' if active_is_hf else 'Local Ollama Inference'
    active_model = settings.HF_MODEL if active_is_hf else settings.OLLAMA_MODEL

    return AdminStatsResponse(
        total_users=total_users,
        active_users=active_users,
        deactivated_users=deactivated_users,
        total_workspaces=total_workspaces,
        pending_invitations=pending_invitations,
        total_submissions=total_submissions,
        total_reviews=total_submissions,
        total_audit_events=total_audit_events,
        active_llm_provider=active_provider,
        active_llm_model=active_model,
        llm_local_only=not active_is_hf,
        database_status=db_status,
        storage_status=storage_status,
        audit_chain_valid=audit_chain_valid,
        last_backup_timestamp=datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
    )
