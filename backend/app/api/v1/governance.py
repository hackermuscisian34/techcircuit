from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.db.models import ContentSubmission, ContentVersion, Finding, Rule, Rulebook, Fact, AuditEvent, ProposedAmendment, User
from app.schemas.domain import GovernanceInsightsResponse, CategoryStat, RepeatedRuleOverride, ProposedAmendmentResponse
from app.core.security import get_current_user, require_roles
from app.config import settings
router = APIRouter(prefix='/governance', tags=['Governance Loop & Insights'])

@router.get('/insights', response_model=GovernanceInsightsResponse)
def get_governance_insights(current_user: User=Depends(get_current_user), db: Session=Depends(get_db)):
    workspace_id = current_user.workspace_id
    total_reviews = db.query(ContentSubmission).filter(ContentSubmission.workspace_id == workspace_id).count()
    passed = db.query(ContentSubmission).filter(ContentSubmission.workspace_id == workspace_id, ContentSubmission.current_status == 'APPROVED').count()
    exceptions = db.query(ContentSubmission).filter(ContentSubmission.workspace_id == workspace_id, ContentSubmission.current_status == 'APPROVED_WITH_EXCEPTION').count()
    rejected = db.query(ContentSubmission).filter(ContentSubmission.workspace_id == workspace_id, ContentSubmission.current_status.in_(['CHANGES_REQUESTED', 'REJECTED'])).count()
    blocking_count = db.query(Finding).join(ContentVersion, Finding.content_version_id == ContentVersion.id).join(ContentSubmission, ContentVersion.submission_id == ContentSubmission.id).filter(ContentSubmission.workspace_id == workspace_id, Finding.severity == 'BLOCKING').count()
    advisory_count = db.query(Finding).join(ContentVersion, Finding.content_version_id == ContentVersion.id).join(ContentSubmission, ContentVersion.submission_id == ContentSubmission.id).filter(ContentSubmission.workspace_id == workspace_id, Finding.severity == 'ADVISORY').count()
    category_counts = db.query(Finding.category, func.count(Finding.id)).join(ContentVersion, Finding.content_version_id == ContentVersion.id).join(ContentSubmission, ContentVersion.submission_id == ContentSubmission.id).filter(ContentSubmission.workspace_id == workspace_id).group_by(Finding.category).all()
    category_stats = [CategoryStat(category=cat, count=cnt) for cat, cnt in category_counts]
    now = datetime.now(timezone.utc)
    all_facts = db.query(Fact).filter(Fact.workspace_id == workspace_id).all()
    stale_count = 0
    for f in all_facts:
        v_until = f.valid_until
        if v_until.tzinfo is None:
            v_until = v_until.replace(tzinfo=timezone.utc)
        if v_until < now:
            stale_count += 1
    ambig_count = db.query(Rule).join(Rulebook, Rule.rulebook_id == Rulebook.id).filter(Rulebook.workspace_id == workspace_id, Rule.ambiguity_status != 'CLEAR').count()
    overridden_findings = db.query(Finding).join(ContentVersion, Finding.content_version_id == ContentVersion.id).join(ContentSubmission, ContentVersion.submission_id == ContentSubmission.id).filter(ContentSubmission.workspace_id == workspace_id, Finding.user_decision == 'OVERRIDDEN').all()
    override_rule_map: Dict[str, List[Finding]] = {}
    for of in overridden_findings:
        if of.rule_id:
            override_rule_map.setdefault(of.rule_id, []).append(of)
    repeated_overrides = []
    for r_id, f_list in override_rule_map.items():
        rule = db.query(Rule).filter(Rule.id == r_id).first()
        if rule:
            repeated_overrides.append(RepeatedRuleOverride(rule_id=rule.id, rule_code=rule.rule_code, rule_title=rule.title, override_count=len(f_list), common_reasons=['Reviewer exception override', 'Contextual operational variation']))
    amendments = db.query(ProposedAmendment).filter(ProposedAmendment.workspace_id == workspace_id).all()
    amendment_responses = []
    for a in amendments:
        r = db.query(Rule).filter(Rule.id == a.rule_id).first()
        amendment_responses.append(ProposedAmendmentResponse(id=a.id, rule_id=a.rule_id, rule_code=r.rule_code if r else 'UNKNOWN', rule_title=r.title if r else 'Rule', trigger_reason=a.trigger_reason, proposed_change=a.proposed_change, override_count=a.override_count, status=a.status, created_at=a.created_at))
    return GovernanceInsightsResponse(total_reviews=total_reviews, passed_reviews=passed, exception_reviews=exceptions, rejected_reviews=rejected, blocking_findings_count=blocking_count, advisory_findings_count=advisory_count, findings_by_category=category_stats, frequently_overridden_rules=repeated_overrides, proposed_amendments=amendment_responses, stale_claims_detected=stale_count, ambiguous_rules_count=ambig_count)

@router.post('/amendments/{amendment_id}/accept')
def accept_proposed_amendment(amendment_id: str, current_user: User=Depends(require_roles('ADMIN', 'BRAND_MANAGER')), db: Session=Depends(get_db)):
    pa = db.query(ProposedAmendment).filter(ProposedAmendment.id == amendment_id, ProposedAmendment.workspace_id == current_user.workspace_id).first()
    if not pa:
        raise HTTPException(status_code=404, detail='Proposed amendment not found.')
    rule = db.query(Rule).filter(Rule.id == pa.rule_id).first()
    if rule:
        rule.description = pa.proposed_change
        rule.ambiguity_status = 'CLEAR'
    pa.status = 'ACCEPTED'
    db.commit()
    return {'message': 'Amendment accepted and rule updated.', 'rule_code': rule.rule_code if rule else None}
