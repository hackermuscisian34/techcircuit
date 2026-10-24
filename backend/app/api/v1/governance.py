from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.db.models import (
    ContentSubmission, ContentVersion, Finding, Rule, Rulebook,
    Fact, AuditEvent, ProposedAmendment, User, ApprovalDecision
)
from app.schemas.domain import (
    GovernanceInsightsResponse, CategoryStat, RepeatedRuleOverride,
    ProposedAmendmentResponse, RuleImpactSimulationRequest,
    RuleImpactSimulationResponse, AffectedItemDetail
)
from app.core.security import get_current_user, require_roles
from app.core.deterministic import check_terminology_rules
from app.core.audit_chain import calculate_sha256, record_audit_event
from app.config import settings

router = APIRouter(prefix='/governance', tags=['Governance Loop & Insights'])

@router.get('/insights', response_model=GovernanceInsightsResponse)
def get_governance_insights(
    brand_name: Optional[str] = Query(None),
    days: Optional[int] = Query(30),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    workspace_id = current_user.workspace_id
    sub_query = db.query(ContentSubmission).filter(ContentSubmission.workspace_id == workspace_id)
    if brand_name:
        sub_query = sub_query.filter(ContentSubmission.brand_name == brand_name)

    total_reviews = sub_query.count()
    passed = sub_query.filter(ContentSubmission.current_status == 'APPROVED').count()
    exceptions = sub_query.filter(ContentSubmission.current_status == 'APPROVED_WITH_EXCEPTION').count()
    rejected = sub_query.filter(ContentSubmission.current_status.in_(['CHANGES_REQUESTED', 'REJECTED'])).count()

    finding_query = db.query(Finding).join(ContentVersion, Finding.content_version_id == ContentVersion.id).join(ContentSubmission, ContentVersion.submission_id == ContentSubmission.id).filter(ContentSubmission.workspace_id == workspace_id)
    if brand_name:
        finding_query = finding_query.filter(ContentSubmission.brand_name == brand_name)

    blocking_count = finding_query.filter(Finding.severity == 'BLOCKING').count()
    advisory_count = finding_query.filter(Finding.severity == 'ADVISORY').count()

    category_counts = db.query(Finding.category, func.count(Finding.id)).join(ContentVersion, Finding.content_version_id == ContentVersion.id).join(ContentSubmission, ContentVersion.submission_id == ContentSubmission.id).filter(ContentSubmission.workspace_id == workspace_id)
    if brand_name:
        category_counts = category_counts.filter(ContentSubmission.brand_name == brand_name)
    category_counts = category_counts.group_by(Finding.category).all()
    category_stats = [CategoryStat(category=cat, count=cnt) for cat, cnt in category_counts]

    now = datetime.now(timezone.utc)
    facts_query = db.query(Fact).filter(Fact.workspace_id == workspace_id)
    if brand_name:
        facts_query = facts_query.filter((Fact.brand_name == brand_name) | (Fact.brand_name == 'Apex Dynamics'))
    all_facts = facts_query.all()
    stale_count = 0
    for f in all_facts:
        v_until = f.valid_until
        if v_until.tzinfo is None:
            v_until = v_until.replace(tzinfo=timezone.utc)
        if v_until < now:
            stale_count += 1

    ambig_count = db.query(Rule).join(Rulebook, Rule.rulebook_id == Rulebook.id).filter(
        Rulebook.workspace_id == workspace_id, Rule.ambiguity_status != 'CLEAR'
    ).count()

    overridden_findings = db.query(Finding).join(ContentVersion, Finding.content_version_id == ContentVersion.id).join(ContentSubmission, ContentVersion.submission_id == ContentSubmission.id).filter(
        ContentSubmission.workspace_id == workspace_id, Finding.user_decision == 'OVERRIDDEN'
    ).all()
    override_rule_map: Dict[str, List[Finding]] = {}
    for of in overridden_findings:
        if of.rule_id:
            override_rule_map.setdefault(of.rule_id, []).append(of)
    repeated_overrides = []
    for r_id, f_list in override_rule_map.items():
        rule = db.query(Rule).filter(Rule.id == r_id).first()
        if rule:
            repeated_overrides.append(
                RepeatedRuleOverride(
                    rule_id=rule.id,
                    rule_code=rule.rule_code,
                    rule_title=rule.title,
                    override_count=len(f_list),
                    common_reasons=['Reviewer exception override', 'Contextual operational variation']
                )
            )

    amendments = db.query(ProposedAmendment).filter(ProposedAmendment.workspace_id == workspace_id).all()
    amendment_responses = []
    for a in amendments:
        r = db.query(Rule).filter(Rule.id == a.rule_id).first()
        amendment_responses.append(
            ProposedAmendmentResponse(
                id=a.id,
                rule_id=a.rule_id,
                rule_code=r.rule_code if r else 'UNKNOWN',
                rule_title=r.title if r else 'Rule',
                trigger_reason=a.trigger_reason,
                proposed_change=a.proposed_change,
                override_count=a.override_count,
                status=a.status,
                created_at=a.created_at
            )
        )

    # Violation trends over time
    cutoff = now - timedelta(days=days or 30)
    recent_findings = finding_query.filter(Finding.created_at >= cutoff).all()
    trend_map: Dict[str, Dict[str, int]] = {}
    for rf in recent_findings:
        date_str = rf.created_at.strftime('%Y-%m-%d')
        trend_map.setdefault(date_str, {'date': date_str, 'violations': 0, 'blocking': 0})
        trend_map[date_str]['violations'] += 1
        if rf.severity == 'BLOCKING':
            trend_map[date_str]['blocking'] += 1
    violation_trends = sorted(trend_map.values(), key=lambda x: x['date'])

    # Average turnaround time calculation
    approved_subs = sub_query.filter(ContentSubmission.current_status.in_(['APPROVED', 'APPROVED_WITH_EXCEPTION'])).all()
    turnarounds = []
    for asub in approved_subs:
        latest_v = db.query(ContentVersion).filter(ContentVersion.submission_id == asub.id).order_by(ContentVersion.version_number.desc()).first()
        if latest_v and latest_v.decisions:
            first_dec = sorted(latest_v.decisions, key=lambda d: d.created_at)[0]
            delta = (first_dec.created_at - asub.created_at).total_seconds() / 3600.0
            if delta >= 0:
                turnarounds.append(delta)
    avg_turnaround = round(sum(turnarounds) / max(1, len(turnarounds)), 2) if turnarounds else 0.0

    # Root-cause recommendations derived from actual data
    root_cause_recommendations = []
    if stale_count > 0:
        root_cause_recommendations.append({
            'category': 'Fact Vault',
            'action': 'Refresh Outdated Evidence',
            'recommendation': f'{stale_count} approved fact(s) have expired. Refresh expiry dates or renew certified evidence in the Fact Vault.',
            'confidence': 'DETERMINISTIC'
        })
    if ambig_count > 0:
        root_cause_recommendations.append({
            'category': 'Brand Guidelines',
            'action': 'Clarify Ambiguous Directives',
            'recommendation': f'{ambig_count} brand rule(s) have an ambiguous status. Provide clear pass/fail boundary examples.',
            'confidence': 'DETERMINISTIC'
        })
    if repeated_overrides:
        top_ov = sorted(repeated_overrides, key=lambda x: x.override_count, reverse=True)[0]
        root_cause_recommendations.append({
            'category': 'Policy Tuning',
            'action': 'Draft Guideline Amendment',
            'recommendation': f"Rule '{top_ov.rule_code}' has {top_ov.override_count} exception override(s). Consider drafting an amendment to align policy with creator practice.",
            'confidence': 'DATA_BACKED'
        })
    if blocking_count > 0:
        root_cause_recommendations.append({
            'category': 'Creator Training',
            'action': 'Team Terminology Refresh',
            'recommendation': f'{blocking_count} blocking violation(s) detected across recent submissions. Conduct training on mandatory brand terminology and trademark marks.',
            'confidence': 'DATA_BACKED'
        })

    return GovernanceInsightsResponse(
        total_reviews=total_reviews,
        passed_reviews=passed,
        exception_reviews=exceptions,
        rejected_reviews=rejected,
        blocking_findings_count=blocking_count,
        advisory_findings_count=advisory_count,
        findings_by_category=category_stats,
        frequently_overridden_rules=repeated_overrides,
        proposed_amendments=amendment_responses,
        stale_claims_detected=stale_count,
        ambiguous_rules_count=ambig_count,
        violation_trends=violation_trends,
        average_turnaround_hours=avg_turnaround,
        root_cause_recommendations=root_cause_recommendations
    )

@router.post('/simulate-impact', response_model=RuleImpactSimulationResponse)
def simulate_guideline_impact(
    payload: RuleImpactSimulationRequest,
    current_user: User = Depends(require_roles('ADMIN', 'BRAND_MANAGER')),
    db: Session = Depends(get_db)
):
    workspace_id = current_user.workspace_id
    rule = db.query(Rule).join(Rulebook, Rule.rulebook_id == Rulebook.id).filter(
        Rule.id == payload.rule_id,
        Rulebook.workspace_id == workspace_id
    ).first()
    if not rule:
        raise HTTPException(status_code=404, detail='Rule not found in workspace rulebook.')

    # Retrieve historical ContentVersions in workspace
    historical_versions = db.query(ContentVersion).join(
        ContentSubmission, ContentVersion.submission_id == ContentSubmission.id
    ).filter(
        ContentSubmission.workspace_id == workspace_id
    ).order_by(ContentVersion.created_at.desc()).limit(100).all()

    # Build simulated rule
    temp_rule = {
        'id': rule.id,
        'rule_code': rule.rule_code,
        'category': rule.category,
        'severity': payload.proposed_severity or rule.severity,
        'enforcement_type': rule.enforcement_type,
        'source_quote': rule.source_quote,
        'source_section': rule.source_section,
        'description': payload.proposed_description,
        'pass_example': rule.pass_example,
        'fail_example': rule.fail_example
    }

    affected_items: List[AffectedItemDetail] = []
    for ver in historical_versions:
        # Was this rule violated in the historical version?
        had_previous_violation = any(f.rule_id == rule.id for f in ver.findings)

        # Test proposed rule on historical text
        simulated_findings = check_terminology_rules(ver.raw_text, [temp_rule])
        has_new_violation = len(simulated_findings) > 0

        impact_type = 'UNAFFECTED'
        explanation = 'Content satisfies both original and proposed guideline requirements.'

        if had_previous_violation and not has_new_violation:
            impact_type = 'NEWLY_COMPLIANT'
            explanation = f'Submission originally violated {rule.rule_code}, but complies with proposed amendment.'
        elif not had_previous_violation and has_new_violation:
            impact_type = 'NEWLY_NON_COMPLIANT'
            first_match = simulated_findings[0].get('matched_text', '')
            explanation = f"Content contains '{first_match}', triggering non-compliance under proposed amendment."
        elif had_previous_violation and has_new_violation:
            if payload.proposed_severity and payload.proposed_severity != rule.severity:
                impact_type = 'SEVERITY_CHANGED'
                explanation = f'Severity transitions from {rule.severity} to {payload.proposed_severity} under proposed amendment.'
            else:
                impact_type = 'UNAFFECTED'
                explanation = 'Content remains non-compliant under both versions.'

        if impact_type != 'UNAFFECTED':
            snippet = ver.raw_text[:120].strip() + ('...' if len(ver.raw_text) > 120 else '')
            affected_items.append(AffectedItemDetail(
                submission_id=ver.submission_id,
                submission_title=ver.submission.title if ver.submission else 'Untitled',
                creator_name=ver.submission.creator.full_name if (ver.submission and ver.submission.creator) else 'Unknown',
                current_status=ver.submission.current_status if ver.submission else 'UNKNOWN',
                content_snippet=snippet,
                impact_type=impact_type,
                explanation=explanation
            ))

    newly_non_compliant = sum(1 for item in affected_items if item.impact_type == 'NEWLY_NON_COMPLIANT')
    newly_compliant = sum(1 for item in affected_items if item.impact_type == 'NEWLY_COMPLIANT')
    severity_changed = sum(1 for item in affected_items if item.impact_type == 'SEVERITY_CHANGED')

    record_audit_event(
        db=db,
        workspace_id=workspace_id,
        event_type='GUIDELINE_IMPACT_SIMULATED',
        actor_id=current_user.id,
        actor_role=current_user.role,
        details={
            'rule_id': rule.id,
            'rule_code': rule.rule_code,
            'evaluated_versions': len(historical_versions),
            'newly_non_compliant': newly_non_compliant,
            'newly_compliant': newly_compliant,
            'severity_changed': severity_changed
        }
    )

    return RuleImpactSimulationResponse(
        rule_id=rule.id,
        rule_code=rule.rule_code,
        original_title=rule.title,
        original_description=rule.description,
        proposed_description=payload.proposed_description,
        total_evaluated=len(historical_versions),
        newly_non_compliant_count=newly_non_compliant,
        newly_compliant_count=newly_compliant,
        severity_changed_count=severity_changed,
        affected_items=affected_items
    )

@router.get('/insights/export', response_model=Dict[str, Any])
def export_governance_report(
    brand_name: Optional[str] = Query(None),
    current_user: User = Depends(require_roles('ADMIN', 'BRAND_MANAGER', 'AUTHORISED_REVIEWER')),
    db: Session = Depends(get_db)
):
    workspace_id = current_user.workspace_id
    insights = get_governance_insights(brand_name=brand_name, days=90, current_user=current_user, db=db)
    now_iso = datetime.now(timezone.utc).isoformat()
    report_payload = {
        'workspace_id': workspace_id,
        'brand_filter': brand_name or 'ALL',
        'generated_at': now_iso,
        'generated_by': current_user.email,
        'summary': {
            'total_reviews': insights.total_reviews,
            'passed_reviews': insights.passed_reviews,
            'exception_reviews': insights.exception_reviews,
            'rejected_reviews': insights.rejected_reviews,
            'blocking_findings_count': insights.blocking_findings_count,
            'advisory_findings_count': insights.advisory_findings_count,
            'stale_claims_detected': insights.stale_claims_detected,
            'ambiguous_rules_count': insights.ambiguous_rules_count,
            'average_turnaround_hours': insights.average_turnaround_hours
        },
        'categories': [c.model_dump() for c in insights.findings_by_category],
        'trends': insights.violation_trends,
        'root_cause_recommendations': insights.root_cause_recommendations,
        'report_hash': calculate_sha256(f"{workspace_id}:{now_iso}:{insights.total_reviews}")
    }
    record_audit_event(
        db=db,
        workspace_id=workspace_id,
        event_type='COMPLIANCE_REPORT_EXPORTED',
        actor_id=current_user.id,
        actor_role=current_user.role,
        details={'brand_filter': brand_name or 'ALL', 'total_reviews': insights.total_reviews}
    )
    return report_payload

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

