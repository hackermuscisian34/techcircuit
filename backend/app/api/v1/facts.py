from datetime import datetime, timezone
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Fact, User
from app.schemas.domain import FactResponse, FactCreate, FactUpdate
from app.core.security import get_current_user
from app.core.audit_chain import record_audit_event
from app.core.parser import parse_uploaded_file, read_uploaded_file_safely
from app.core.fact_extractor import fact_extractor
from app.config import settings
router = APIRouter(prefix='/facts', tags=['Approved Fact Vault'])

@router.get('', response_model=List[FactResponse])
def list_approved_facts(current_user: User=Depends(get_current_user), db: Session=Depends(get_db)):
    now = datetime.now(timezone.utc)
    facts = db.query(Fact).filter(Fact.workspace_id == current_user.workspace_id).all()
    results = []
    for f in facts:
        fact_res = FactResponse.model_validate(f)
        valid_until = f.valid_until
        if valid_until.tzinfo is None:
            valid_until = valid_until.replace(tzinfo=timezone.utc)
        fact_res.is_expired = valid_until < now
        results.append(fact_res)
    return results

@router.post('/extract')
async def extract_facts_from_document(file: Optional[UploadFile]=File(None), text: Optional[str]=Form(None), current_user: User=Depends(get_current_user)):
    raw_text = ''
    doc_name = 'Direct Text Input'
    if file and file.filename:
        doc_name = file.filename
        content_bytes = await read_uploaded_file_safely(file, max_size_mb=25)
        raw_text = parse_uploaded_file(file.filename, content_bytes)
    elif text and text.strip():
        raw_text = text.strip()
    else:
        raise HTTPException(status_code=400, detail='Please upload a PDF/DOCX proof file or provide document text to extract facts.')
    facts = await fact_extractor.extract_facts(raw_text, doc_name)
    return {'source_document': doc_name, 'text_length': len(raw_text), 'candidate_facts_count': len(facts), 'candidate_facts': facts}

@router.post('', response_model=FactResponse)
def create_approved_fact(payload: FactCreate, current_user: User=Depends(get_current_user), db: Session=Depends(get_db)):
    now = datetime.now(timezone.utc)
    workspace_id = current_user.workspace_id
    new_fact = Fact(workspace_id=workspace_id, fact_code=payload.fact_code, subject=payload.subject, approved_statement=payload.approved_statement, normalized_value=payload.normalized_value, normalized_unit=payload.normalized_unit, source_document=payload.source_document, source_quote=payload.source_quote, owner_name=payload.owner_name or current_user.full_name, owner_email=payload.owner_email or current_user.email, valid_from=payload.valid_from or now, valid_until=payload.valid_until, status='ACTIVE')
    db.add(new_fact)
    db.commit()
    db.refresh(new_fact)
    record_audit_event(db=db, workspace_id=workspace_id, event_type='FACT_VAULT_ADDITION', actor_id=current_user.id, actor_role=current_user.role, details={'fact_id': new_fact.id, 'fact_code': new_fact.fact_code, 'subject': new_fact.subject, 'owner': new_fact.owner_email})
    res = FactResponse.model_validate(new_fact)
    valid_until = new_fact.valid_until
    if valid_until.tzinfo is None:
        valid_until = valid_until.replace(tzinfo=timezone.utc)
    res.is_expired = valid_until < now
    return res

@router.put('/{fact_id}', response_model=FactResponse)
def update_fact(fact_id: str, payload: FactUpdate, current_user: User=Depends(get_current_user), db: Session=Depends(get_db)):
    fact = db.query(Fact).filter(Fact.id == fact_id, Fact.workspace_id == current_user.workspace_id).first()
    if not fact:
        raise HTTPException(status_code=404, detail='Fact not found.')
    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(fact, field, val)
    db.commit()
    db.refresh(fact)
    res = FactResponse.model_validate(fact)
    now = datetime.now(timezone.utc)
    valid_until = fact.valid_until
    if valid_until.tzinfo is None:
        valid_until = valid_until.replace(tzinfo=timezone.utc)
    res.is_expired = valid_until < now
    return res
