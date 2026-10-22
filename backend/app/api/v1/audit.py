from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import AuditEvent, ReviewReceipt, User, ContentSubmission
from app.schemas.domain import AuditEventResponse, AuditChainVerificationResult, ReviewReceiptResponse
from app.core.security import get_current_user
from app.core.audit_chain import verify_audit_chain
from app.config import settings
router = APIRouter(prefix='/audit', tags=['Tamper-Evident Audit Trail'])

@router.get('/events', response_model=List[AuditEventResponse])
def list_audit_events(current_user: User=Depends(get_current_user), db: Session=Depends(get_db)):
    events = db.query(AuditEvent).filter(AuditEvent.workspace_id == current_user.workspace_id).order_by(AuditEvent.created_at.desc()).limit(100).all()
    return [AuditEventResponse.model_validate(e) for e in events]

@router.get('/verify', response_model=AuditChainVerificationResult)
def verify_workspace_audit_chain(current_user: User=Depends(get_current_user), db: Session=Depends(get_db)):
    verification_data = verify_audit_chain(db, current_user.workspace_id)
    return AuditChainVerificationResult(**verification_data)

@router.get('/receipt/{receipt_id}', response_model=ReviewReceiptResponse)
def get_review_receipt(receipt_id: str, current_user: User=Depends(get_current_user), db: Session=Depends(get_db)):
    receipt = db.query(ReviewReceipt).join(ContentSubmission, ReviewReceipt.submission_id == ContentSubmission.id).filter(ReviewReceipt.id == receipt_id, ContentSubmission.workspace_id == current_user.workspace_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail='Review receipt not found.')
    approver = db.query(User).filter(User.id == receipt.approver_id).first() if receipt.approver_id else None
    res = ReviewReceiptResponse.model_validate(receipt)
    res.approver_name = approver.full_name if approver else 'System Attestation'
    return res
