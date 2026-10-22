from datetime import datetime, timezone
import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import ContentSubmission, ContentVersion, IntentCard, ExtractedClaim, Finding, Rulebook, Rule, Fact, AuditEvent, User
from app.schemas.domain import ReviewResultResponse, ContentSubmissionResponse, FindingResponse, ExtractedClaimResponse, IntentCardResponse, FindingDecisionUpdate
from app.core.security import sanitize_and_redact_content, get_current_user
from app.core.audit_chain import calculate_sha256, record_audit_event
from app.core.intent_lock import intent_lock
from app.core.claim_ledger import claim_ledger
from app.core.deterministic import check_terminology_rules
from app.core.citation import CitationVerifier
from app.core.parser import parse_uploaded_file, read_uploaded_file_safely
from app.core.visual_audit import analyze_image_asset, audit_text_accessibility
from app.core.llm_provider import llm_client
from app.config import settings
router = APIRouter(prefix='/reviews', tags=['Content Review'])

@router.post('/run', response_model=ReviewResultResponse)
async def submit_and_review_content(title: str=Form(...), content_text: Optional[str]=Form(None), file: Optional[UploadFile]=File(None), current_user: User=Depends(get_current_user), db: Session=Depends(get_db)):
    creator_id = current_user.id
    workspace_id = current_user.workspace_id
    raw_content = ''
    content_type = 'TEXT'
    filename = None
    image_findings = []
    if file:
        filename = file.filename or 'uploaded_file'
        content_type = filename.split('.')[-1].upper() if '.' in filename else 'FILE'
        try:
            content_bytes = await read_uploaded_file_safely(file, settings.MAX_UPLOAD_SIZE_MB)
            raw_content = parse_uploaded_file(filename, content_bytes)
            if content_type in ['PNG', 'JPG', 'JPEG']:
                img_analysis = analyze_image_asset(content_bytes, filename)
                image_findings = img_analysis.get('visual_findings', [])
        except ValueError as ve:
            if 'exceeds maximum permitted size' in str(ve):
                raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(ve))
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    elif content_text:
        raw_content = content_text
    else:
        raise HTTPException(status_code=400, detail='Must provide text or upload a document file.')
    if not raw_content.strip():
        raise HTTPException(status_code=400, detail='Submitted content cannot be empty.')
    redacted_content, redaction_map = sanitize_and_redact_content(raw_content)
    content_hash = calculate_sha256(raw_content)
    active_rulebook = db.query(Rulebook).filter(Rulebook.workspace_id == workspace_id, Rulebook.status == 'ACTIVE').first()
    rulebook_version = active_rulebook.version if active_rulebook else '1.0.0'
    active_rules = db.query(Rule).filter(Rule.rulebook_id == active_rulebook.id).all() if active_rulebook else []
    intent_data = await intent_lock.build_intent_card(redacted_content)
    extracted_claim_dicts = await claim_ledger.extract_claims(redacted_content)
    verified_claims = claim_ledger.verify_claims_against_vault(db, workspace_id, extracted_claim_dicts)
    rule_dicts = [{'id': r.id, 'rule_code': r.rule_code, 'category': r.category, 'severity': r.severity, 'enforcement_type': r.enforcement_type, 'source_quote': r.source_quote, 'source_section': r.source_section, 'description': r.description, 'pass_example': r.pass_example, 'fail_example': r.fail_example} for r in active_rules]
    candidate_findings = check_terminology_rules(raw_content, rule_dicts)
    for vc in verified_claims:
        if vc['status'] in ['STALE', 'CONTRADICTED', 'NEEDS_PROOF']:
            claim_text = vc['claim_text']
            start_idx = raw_content.find(claim_text)
            end_idx = start_idx + len(claim_text) if start_idx != -1 else 0
            start_idx = max(0, start_idx)
            severity = 'BLOCKING' if vc['status'] in ['STALE', 'CONTRADICTED'] else 'WARNING'
            candidate_findings.append({'rule_id': None, 'rule_code': f"CLAIM-{vc['status']}", 'category': 'Claims', 'severity': severity, 'span_start': start_idx, 'span_end': end_idx, 'matched_text': claim_text, 'source_quote': 'Approved Fact Vault Requirement', 'source_section': 'Fact Ledger', 'explanation': vc['reasoning'], 'evidence_status': 'VERIFIED', 'confidence_tier': 'DETERMINISTIC', 'suggested_correction': None, 'verification_status': 'VERIFIED'})
    for vf in image_findings:
        candidate_findings.append({'rule_id': None, 'rule_code': vf['rule_code'], 'category': vf.get('category', 'Visual'), 'severity': vf.get('severity', 'WARNING'), 'span_start': 0, 'span_end': len(filename or 'image'), 'matched_text': filename or 'image asset', 'source_quote': 'Approved Visual Brand Identity Standards', 'source_section': 'Brand Guidelines', 'explanation': vf['explanation'], 'evidence_status': 'VERIFIED', 'confidence_tier': 'DETERMINISTIC', 'suggested_correction': None, 'verification_status': 'VERIFIED'})
    a11y_findings = audit_text_accessibility(raw_content)
    for af in a11y_findings:
        candidate_findings.append({'rule_id': None, 'rule_code': af['rule_code'], 'category': af.get('category', 'Accessibility'), 'severity': af.get('severity', 'ADVISORY'), 'span_start': af.get('span_start', 0), 'span_end': af.get('span_end', len(af.get('matched_text', ''))), 'matched_text': af.get('matched_text', ''), 'source_quote': 'WCAG 2.2 Editorial Accessibility Standard', 'source_section': 'Accessibility Guidelines', 'explanation': af['explanation'], 'evidence_status': 'VERIFIED', 'confidence_tier': 'DETERMINISTIC', 'suggested_correction': None, 'verification_status': 'VERIFIED'})
    tone_rules = [r for r in active_rules if r.category == 'Tone']
    model_disclosure = {'provider': 'Local Ollama Inference', 'model': settings.OLLAMA_MODEL, 'is_local': True, 'is_fallback': False, 'prompt_injection_screened': True, 'redacted_tokens_count': len(redaction_map)}
    if tone_rules:
        tone_prompt = f"Analyze this marketing text against the following brand voice requirement:\nRule: {tone_rules[0].description}\nPass Example: {tone_rules[0].pass_example}\nFail Example: {tone_rules[0].fail_example}\n\nReturn JSON: 'has_violation' (boolean), 'matched_phrase' (string), 'explanation' (string), 'suggested_rewrite' (string)"
        ai_res = await llm_client.generate_structured(tone_prompt, redacted_content)
        model_disclosure = ai_res.get('disclosure', model_disclosure)
        ai_tone_data = ai_res.get('result', {})
        if ai_tone_data.get('has_violation'):
            matched_phrase = ai_tone_data.get('matched_phrase', '')
            s_idx = raw_content.find(matched_phrase) if matched_phrase else 0
            e_idx = s_idx + len(matched_phrase) if matched_phrase and s_idx != -1 else 0
            s_idx = max(0, s_idx)
            candidate_findings.append({'rule_id': tone_rules[0].id, 'rule_code': tone_rules[0].rule_code, 'category': 'Tone', 'severity': tone_rules[0].severity, 'span_start': s_idx, 'span_end': e_idx, 'matched_text': matched_phrase or raw_content[:40], 'source_quote': tone_rules[0].source_quote, 'source_section': tone_rules[0].source_section, 'explanation': ai_tone_data.get('explanation', 'Tone departs from measured brand voice.'), 'evidence_status': 'PENDING', 'confidence_tier': 'EVIDENCE_BACKED_AI', 'suggested_correction': ai_tone_data.get('suggested_rewrite'), 'verification_status': 'PENDING'})
    verifier = CitationVerifier(db)
    verified_findings = verifier.verify_all(candidate_findings, active_rulebook.id if active_rulebook else '', raw_content)
    suggestion_res = intent_lock.generate_minimal_suggestion(raw_content, verified_findings)
    suggested_full_text = suggestion_res['suggested_text']
    diff_html = suggestion_res['diff_html']
    preservation_res = intent_lock.verify_intent_preservation(raw_content, suggested_full_text, intent_data)
    intent_data['preservation_status'] = preservation_res['status']
    submission = ContentSubmission(workspace_id=workspace_id, creator_id=creator_id, title=title, content_type=content_type, original_filename=filename, current_status='SUBMITTED')
    db.add(submission)
    db.flush()
    version = ContentVersion(submission_id=submission.id, version_number=1, raw_text=raw_content, redacted_text=redacted_content, content_hash=content_hash, rulebook_version=rulebook_version)
    db.add(version)
    db.flush()
    ic_record = IntentCard(content_version_id=version.id, purpose=intent_data['purpose'], target_audience=intent_data['target_audience'], call_to_action=intent_data['call_to_action'], must_keep_facts=intent_data['must_keep_facts'], product_names=intent_data['product_names'], numerical_claims=intent_data['numerical_claims'], tone_constraints=intent_data['tone_constraints'], preservation_status=intent_data['preservation_status'])
    db.add(ic_record)
    persisted_claims = []
    for vc in verified_claims:
        claim_obj = ExtractedClaim(content_version_id=version.id, matched_fact_id=vc.get('matched_fact_id'), claim_text=vc['claim_text'], claim_type=vc['claim_type'], status=vc['status'], reasoning=vc['reasoning'])
        db.add(claim_obj)
        persisted_claims.append(claim_obj)
    persisted_findings = []
    blocking_count = 0
    warning_count = 0
    advisory_count = 0
    for vf in verified_findings:
        sev = vf['severity']
        if sev == 'BLOCKING':
            blocking_count += 1
        elif sev == 'WARNING':
            warning_count += 1
        else:
            advisory_count += 1
        finding_obj = Finding(content_version_id=version.id, rule_id=vf.get('rule_id'), category=vf['category'], severity=vf['severity'], span_start=vf.get('span_start', 0), span_end=vf.get('span_end', 0), matched_text=vf.get('matched_text', ''), source_quote=vf.get('source_quote'), source_section=vf.get('source_section'), explanation=vf['explanation'], evidence_status=vf.get('evidence_status', 'VERIFIED'), confidence_tier=vf.get('confidence_tier', 'DETERMINISTIC'), suggested_correction=vf.get('suggested_correction'), verification_status=vf.get('verification_status', 'VERIFIED'), rejection_reason=vf.get('rejection_reason'), user_decision='PENDING')
        db.add(finding_obj)
        persisted_findings.append(finding_obj)
    overall_status = 'CHANGES_REQUESTED' if blocking_count > 0 else 'WARNING' if warning_count > 0 else 'CLEAN'
    submission.current_status = 'CHANGES_REQUESTED' if blocking_count > 0 else 'SUBMITTED'
    db.commit()
    record_audit_event(db=db, workspace_id=workspace_id, event_type='REVIEW_EXECUTED', actor_id=creator_id, actor_role='CREATOR', details={'submission_id': submission.id, 'version_id': version.id, 'content_hash': content_hash, 'blocking_findings': blocking_count, 'advisory_findings': advisory_count, 'rulebook_version': rulebook_version})
    return ReviewResultResponse(submission_id=submission.id, version_id=version.id, version_number=1, content_hash=content_hash, rulebook_version=rulebook_version, overall_status=overall_status, blocking_findings_count=blocking_count, warning_findings_count=warning_count, advisory_findings_count=advisory_count, intent_preservation_status=intent_data['preservation_status'], findings=[FindingResponse(id=pf.id, content_version_id=pf.content_version_id, rule_id=pf.rule_id, rule_code=vf.get('rule_code'), category=pf.category, severity=pf.severity, span_start=pf.span_start, span_end=pf.span_end, matched_text=pf.matched_text, source_quote=pf.source_quote, source_section=pf.source_section, explanation=pf.explanation, evidence_status=pf.evidence_status, confidence_tier=pf.confidence_tier, suggested_correction=pf.suggested_correction, verification_status=pf.verification_status, rejection_reason=pf.rejection_reason, user_decision=pf.user_decision, created_at=pf.created_at) for pf, vf in zip(persisted_findings, verified_findings)], claims=[ExtractedClaimResponse(id=pc.id, content_version_id=pc.content_version_id, matched_fact_id=pc.matched_fact_id, claim_text=pc.claim_text, claim_type=pc.claim_type, status=pc.status, reasoning=pc.reasoning) for pc in persisted_claims], intent_card=IntentCardResponse.model_validate(ic_record), diff_html=diff_html, suggested_full_text=suggested_full_text, model_disclosure=model_disclosure)

@router.get('/submissions', response_model=List[ContentSubmissionResponse])
def list_submissions(current_user: User=Depends(get_current_user), db: Session=Depends(get_db)):
    submissions = db.query(ContentSubmission).filter(ContentSubmission.workspace_id == current_user.workspace_id).order_by(ContentSubmission.created_at.desc()).all()
    results = []
    for s in submissions:
        res = ContentSubmissionResponse.model_validate(s)
        res.creator_name = s.creator.full_name if s.creator else 'Unknown Creator'
        results.append(res)
    return results

@router.get('/submissions/{submission_id}', response_model=Dict[str, Any])
def get_submission_details(submission_id: str, current_user: User=Depends(get_current_user), db: Session=Depends(get_db)):
    sub = db.query(ContentSubmission).filter(ContentSubmission.id == submission_id, ContentSubmission.workspace_id == current_user.workspace_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail='Submission not found.')
    latest_version = db.query(ContentVersion).filter(ContentVersion.submission_id == sub.id).order_by(ContentVersion.version_number.desc()).first()
    findings = db.query(Finding).filter(Finding.content_version_id == latest_version.id).all() if latest_version else []
    claims = db.query(ExtractedClaim).filter(ExtractedClaim.content_version_id == latest_version.id).all() if latest_version else []
    intent_card = db.query(IntentCard).filter(IntentCard.content_version_id == latest_version.id).first() if latest_version else None
    return {'submission': ContentSubmissionResponse.model_validate(sub), 'version': {'id': latest_version.id if latest_version else None, 'version_number': latest_version.version_number if latest_version else 1, 'content_hash': latest_version.content_hash if latest_version else None, 'raw_text': latest_version.raw_text if latest_version else '', 'rulebook_version': latest_version.rulebook_version if latest_version else '1.0.0'}, 'findings': [FindingResponse.model_validate(f) for f in findings], 'claims': [ExtractedClaimResponse.model_validate(c) for c in claims], 'intent_card': IntentCardResponse.model_validate(intent_card) if intent_card else None}

@router.put('/findings/{finding_id}/decision')
def update_finding_decision(finding_id: str, payload: FindingDecisionUpdate, current_user: User=Depends(get_current_user), db: Session=Depends(get_db)):
    finding = db.query(Finding).join(ContentVersion, Finding.content_version_id == ContentVersion.id).join(ContentSubmission, ContentVersion.submission_id == ContentSubmission.id).filter(Finding.id == finding_id, ContentSubmission.workspace_id == current_user.workspace_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail='Finding not found.')
    finding.user_decision = payload.user_decision
    db.commit()
    if payload.user_decision == 'OVERRIDDEN':
        record_audit_event(db=db, workspace_id=current_user.workspace_id, event_type='OVERRIDE_LOGGED', actor_id=current_user.id, actor_role=current_user.role, details={'finding_id': finding.id, 'rule_id': finding.rule_id, 'reason': payload.override_reason or 'Operational context justification'})
    return {'message': 'Finding decision recorded', 'finding_id': finding.id, 'decision': payload.user_decision}
