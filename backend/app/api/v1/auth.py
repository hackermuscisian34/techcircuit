import uuid
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.db.models import User
from app.schemas.domain import Token, LoginRequest, UserResponse, UserCreate
from app.core.security import verify_password, create_access_token, hash_password, get_current_user, require_roles
from app.config import settings
router = APIRouter(prefix='/auth', tags=['Authentication'])

class RoleUpdateRequest(BaseModel):
    role: str
LOGIN_ALIASES = {'admin': 'alfred@apexdynamics.example', 'admin@apexdynamics.example': 'alfred@apexdynamics.example', 'admin@canon.example': 'alfred@apexdynamics.example', 'alfred': 'alfred@apexdynamics.example', 'alfred biju': 'alfred@apexdynamics.example', 'alfred.biju@apexdynamics.example': 'alfred@apexdynamics.example', 'manager': 'sebin@apexdynamics.example', 'manager@apexdynamics.example': 'sebin@apexdynamics.example', 'manager@canon.example': 'sebin@apexdynamics.example', 'sebin': 'sebin@apexdynamics.example', 'sebin sabu': 'sebin@apexdynamics.example', 'sebin.sabu@apexdynamics.example': 'sebin@apexdynamics.example', 'reviewer': 'albert@apexdynamics.example', 'reviewer@apexdynamics.example': 'albert@apexdynamics.example', 'reviewer@canon.example': 'albert@apexdynamics.example', 'albert': 'albert@apexdynamics.example', 'albert biju': 'albert@apexdynamics.example', 'albert.biju@apexdynamics.example': 'albert@apexdynamics.example', 'creator': 'adhithya@apexdynamics.example', 'creator@apexdynamics.example': 'adhithya@apexdynamics.example', 'creator@canon.example': 'adhithya@apexdynamics.example', 'adhithya': 'adhithya@apexdynamics.example', 'adhithya biju': 'adhithya@apexdynamics.example', 'adhithya.biju@apexdynamics.example': 'adhithya@apexdynamics.example', 'approver': 'biju@apexdynamics.example', 'approver@apexdynamics.example': 'biju@apexdynamics.example', 'approver@canon.example': 'biju@apexdynamics.example', 'biju': 'biju@apexdynamics.example'}

@router.post('/login', response_model=Token)
def login(request: LoginRequest, db: Session=Depends(get_db)):
    search_query = request.email.strip().lower()
    target_email = LOGIN_ALIASES.get(search_query, search_query)
    user = db.query(User).filter((func.lower(User.email) == target_email) | (func.lower(User.email) == search_query)).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Incorrect email or password', headers={'WWW-Authenticate': 'Bearer'})
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='User account is deactivated.', headers={'WWW-Authenticate': 'Bearer'})
    token_data = {'sub': user.id, 'email': user.email, 'role': user.role, 'workspace_id': user.workspace_id}
    access_token = create_access_token(token_data)
    return Token(access_token=access_token, token_type='bearer', user_id=user.id, email=user.email, full_name=user.full_name, role=user.role, workspace_id=user.workspace_id)

@router.post('/register', response_model=Token)
def register(request: UserCreate, db: Session=Depends(get_db)):
    clean_email = request.email.strip().lower()
    existing = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if existing:
        raise HTTPException(status_code=400, detail='An account with this email already exists.')
    workspace_id = settings.DEFAULT_WORKSPACE_ID
    requested_role = (request.role or 'CREATOR').strip().upper()
    if requested_role == 'ADMIN':
        assigned_role = 'CREATOR'
    elif requested_role in ['CREATOR', 'BRAND_MANAGER', 'AUTHORISED_REVIEWER', 'APPROVER']:
        assigned_role = requested_role
    else:
        assigned_role = 'CREATOR'
    new_user = User(id=f'usr-{uuid.uuid4().hex[:8]}', workspace_id=workspace_id, email=clean_email, full_name=request.full_name.strip(), role=assigned_role, hashed_password=hash_password(request.password), is_active=True)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    token_data = {'sub': new_user.id, 'email': new_user.email, 'role': new_user.role, 'workspace_id': new_user.workspace_id}
    access_token = create_access_token(token_data)
    return Token(access_token=access_token, token_type='bearer', user_id=new_user.id, email=new_user.email, full_name=new_user.full_name, role=new_user.role, workspace_id=new_user.workspace_id)

@router.get('/me', response_model=UserResponse)
def get_current_user_profile(current_user: User=Depends(get_current_user)):
    return current_user

@router.get('/users', response_model=List[UserResponse])
def list_workspace_users(current_user: User=Depends(get_current_user), db: Session=Depends(get_db)):
    users = db.query(User).filter(User.workspace_id == current_user.workspace_id, User.is_active.is_(True)).all()
    return users

@router.put('/users/{target_user_id}/role', response_model=UserResponse)
def update_user_role(target_user_id: str, payload: RoleUpdateRequest, current_user: User=Depends(require_roles('ADMIN')), db: Session=Depends(get_db)):
    valid_roles = ['ADMIN', 'BRAND_MANAGER', 'CREATOR', 'AUTHORISED_REVIEWER', 'APPROVER']
    if payload.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role '{payload.role}'. Must be one of: {', '.join(valid_roles)}")
    target_user = db.query(User).filter(User.id == target_user_id, User.workspace_id == current_user.workspace_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail='User not found in this workspace.')
    target_user.role = payload.role
    db.commit()
    db.refresh(target_user)
    return target_user
