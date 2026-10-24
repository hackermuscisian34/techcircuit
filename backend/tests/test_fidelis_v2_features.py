import io
import pytest
from PIL import Image
from fastapi.testclient import TestClient
from app.core.security import create_access_token
from app.core.deterministic import validate_logo_dimensions, check_wcag_contrast
from app.core.visual_audit import audit_text_accessibility
from app.seed.synthetic_brand import WORKSPACE_ID
from app.db.models import Rule, Rulebook

@pytest.fixture
def auth_tokens():
    creator_token = create_access_token({
        'sub': 'usr-creator-01',
        'email': 'creator@apexdynamics.example',
        'role': 'CREATOR',
        'workspace_id': WORKSPACE_ID
    })
    approver_token = create_access_token({
        'sub': 'usr-approver-01',
        'email': 'approver@apexdynamics.example',
        'role': 'APPROVER',
        'workspace_id': WORKSPACE_ID
    })
    manager_token = create_access_token({
        'sub': 'usr-manager-01',
        'email': 'manager@apexdynamics.example',
        'role': 'BRAND_MANAGER',
        'workspace_id': WORKSPACE_ID
    })
    foreign_token = create_access_token({
        'sub': 'usr-foreign-01',
        'email': 'foreign@othercorp.example',
        'role': 'CREATOR',
        'workspace_id': 'ws-foreign-workspace-999'
    })
    return {
        'creator': {'Authorization': f'Bearer {creator_token}'},
        'approver': {'Authorization': f'Bearer {approver_token}'},
        'manager': {'Authorization': f'Bearer {manager_token}'},
        'foreign': {'Authorization': f'Bearer {foreign_token}'}
    }

def test_version_revision_lifecycle_and_approval_invalidation(client: TestClient, db_session, auth_tokens):
    """
    Phase 4.3: Demonstrate full versioning lifecycle.
    Submit v1 -> Approve v1 -> Revise to v2 -> Prior approval is invalidated, status resets to IN_REVIEW/CHANGES_REQUESTED.
    """
    clean_text_v1 = "Migrate your enterprise clusters to Apex Core today. ApexDynamics guarantees an infrastructure uptime SLA of 99.98% across all multi-region clusters. Visit our documentation portal to get started."
    res = client.post(
        '/api/v1/reviews/run',
        headers=auth_tokens['creator'],
        data={'title': 'Telemetry Release Notes', 'content_text': clean_text_v1}
    )
    assert res.status_code == 200
    v1_data = res.json()
    sub_id = v1_data['submission_id']
    assert v1_data['version_number'] == 1
    blocking_v1 = [f for f in v1_data['findings'] if f['severity'] == 'BLOCKING']
    assert len(blocking_v1) == 0

    # Approver approves v1
    appr_res = client.post(
        f'/api/v1/approvals/{sub_id}',
        headers=auth_tokens['approver'],
        json={'decision': 'APPROVED', 'reason': 'Clean initial release verified.'}
    )
    assert appr_res.status_code == 200
    receipt_v1 = appr_res.json()
    assert receipt_v1['status'] == 'APPROVED'
    assert receipt_v1['receipt_id'] is not None

    # Check submission details reflect APPROVED
    sub_details = client.get(f'/api/v1/reviews/submissions/{sub_id}', headers=auth_tokens['creator']).json()
    assert sub_details['submission']['current_status'] == 'APPROVED'

    # Creator submits revision (v2) on the same submission
    revised_text_v2 = "Migrate your enterprise clusters to Apex Core today. Visit our documentation portal to learn how our multi-region clusters deliver ultra-low latency."
    rev_res = client.post(
        '/api/v1/reviews/run',
        headers=auth_tokens['creator'],
        data={
            'title': 'Telemetry Release Notes v2',
            'content_text': revised_text_v2,
            'submission_id': sub_id
        }
    )
    assert rev_res.status_code == 200
    v2_data = rev_res.json()
    assert v2_data['submission_id'] == sub_id
    assert v2_data['version_number'] == 2

    # Verify that the submission status transitioned back to IN_REVIEW (approval invalidated)
    sub_details_v2 = client.get(f'/api/v1/reviews/submissions/{sub_id}', headers=auth_tokens['creator']).json()
    assert sub_details_v2['submission']['current_status'] in ['IN_REVIEW', 'CHANGES_REQUESTED']
    assert sub_details_v2['submission']['current_status'] != 'APPROVED'
    assert sub_details_v2['version']['version_number'] == 2

    # Check version history endpoint
    hist_res = client.get(f'/api/v1/reviews/submissions/{sub_id}/versions', headers=auth_tokens['creator'])
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history) == 2
    # v2 has no receipt yet, v1 has receipt
    v2_entry = next(v for v in history if v['version_number'] == 2)
    v1_entry = next(v for v in history if v['version_number'] == 1)
    assert v2_entry['has_receipt'] is False
    assert v1_entry['has_receipt'] is True

def test_state_machine_and_blocking_risk_gate(client: TestClient, db_session, auth_tokens):
    """
    Phase 4.1 & 4.2: Enforce state machine transitions and risk gates.
    - Un-overridden BLOCKING findings prevent direct approval.
    - Approval with exception requires non-empty documented reason.
    - Creator cannot approve own work.
    """
    bad_text = "Deploy your database on Legacy Cloud for instantaneous migration."
    res = client.post(
        '/api/v1/reviews/run',
        headers=auth_tokens['creator'],
        data={'title': 'Legacy Migration Promo', 'content_text': bad_text}
    )
    assert res.status_code == 200
    review_data = res.json()
    sub_id = review_data['submission_id']
    assert review_data['blocking_findings_count'] > 0

    # Approver attempts direct APPROVED -> blocked because of un-overridden BLOCKING findings
    fail_appr = client.post(
        f'/api/v1/approvals/{sub_id}',
        headers=auth_tokens['approver'],
        json={'decision': 'APPROVED', 'reason': 'Attempted bypass'}
    )
    assert fail_appr.status_code == 400
    assert "un-overridden BLOCKING finding" in fail_appr.json()['detail']

    # Approver attempts APPROVED_WITH_EXCEPTION without a reason -> fails 400
    no_reason_appr = client.post(
        f'/api/v1/approvals/{sub_id}',
        headers=auth_tokens['approver'],
        json={'decision': 'APPROVED_WITH_EXCEPTION', 'reason': ''}
    )
    assert no_reason_appr.status_code == 400
    assert "reason is mandatory" in no_reason_appr.json()['detail'].lower()

    # Approver provides documented exception reason -> succeeds
    valid_exc = client.post(
        f'/api/v1/approvals/{sub_id}',
        headers=auth_tokens['approver'],
        json={
            'decision': 'APPROVED_WITH_EXCEPTION',
            'reason': 'Legacy migration contract grandfathered until end of fiscal year.',
            'exception_category': 'CONTRACTUAL_EXCEPTION'
        }
    )
    assert valid_exc.status_code == 200
    assert valid_exc.json()['decision'] == 'APPROVED_WITH_EXCEPTION'

def test_collaboration_comments_endpoints(client: TestClient, db_session, auth_tokens):
    """
    Phase 4.3: Version-specific collaboration comments and reviewer discussions.
    """
    res = client.post(
        '/api/v1/reviews/run',
        headers=auth_tokens['creator'],
        data={'title': 'Discussion Test Content', 'content_text': 'Apex Core telemetry update.'}
    )
    sub_id = res.json()['submission_id']

    # Post comment as creator
    c1 = client.post(
        f'/api/v1/reviews/submissions/{sub_id}/comments',
        headers=auth_tokens['creator'],
        json={'text': 'Please review the updated latency figure.'}
    )
    assert c1.status_code == 200
    c1_data = c1.json()
    assert c1_data['text'] == 'Please review the updated latency figure.'
    assert c1_data['author_role'] == 'CREATOR'

    # Empty comment rejected
    c_empty = client.post(
        f'/api/v1/reviews/submissions/{sub_id}/comments',
        headers=auth_tokens['approver'],
        json={'text': '   '}
    )
    assert c_empty.status_code == 400

    # Post comment as reviewer
    c2 = client.post(
        f'/api/v1/reviews/submissions/{sub_id}/comments',
        headers=auth_tokens['approver'],
        json={'text': 'Verified against latest infrastructure spec.'}
    )
    assert c2.status_code == 200

    # List comments
    comments_res = client.get(
        f'/api/v1/reviews/submissions/{sub_id}/comments',
        headers=auth_tokens['creator']
    )
    assert comments_res.status_code == 200
    comments = comments_res.json()
    assert len(comments) == 2
    assert comments[0]['text'] == 'Please review the updated latency figure.'
    assert comments[1]['text'] == 'Verified against latest infrastructure spec.'

    # Create foreign workspace and user in db for cross-workspace isolation test
    from app.db.models import Workspace, User
    from app.core.security import hash_password
    ws2 = Workspace(id='ws-foreign-workspace-999', name='Foreign Corp', slug='foreign')
    db_session.add(ws2)
    user_foreign = User(
        id='usr-foreign-01',
        workspace_id=ws2.id,
        email='foreign@othercorp.example',
        full_name='Foreign User',
        role='CREATOR',
        hashed_password=hash_password('Pass123!'),
        is_active=True
    )
    db_session.add(user_foreign)
    db_session.commit()

    # Foreign workspace user cannot view comments
    foreign_get = client.get(
        f'/api/v1/reviews/submissions/{sub_id}/comments',
        headers=auth_tokens['foreign']
    )
    assert foreign_get.status_code == 404

def test_visual_and_accessibility_scanner_v2(client: TestClient, db_session, auth_tokens):
    """
    Phase 3: Visual Brand & Accessibility Scanner.
    - WebP image ingestion
    - Logo distortion metrics with deviation percent and clearspace margin
    - Contrast ratio accessible alternative recommendation
    - Text accessibility missing alt-text detection
    """
    # 1. Logo distortion metrics
    specs = validate_logo_dimensions(width=100, height=80, required_ratio=4.0)
    assert specs['is_distorted'] is True
    assert specs['ratio_difference'] == 2.75
    assert specs['deviation_percent'] == 68.8
    assert specs['clearspace_margin_px'] == 40.0

    # 2. WCAG Contrast alternative color
    contrast_res = check_wcag_contrast('#F97316', '#FB923C')
    assert contrast_res['passes_wcag_aa'] is False
    assert contrast_res['suggested_accessible_color'] in ['#000000', '#FFFFFF']

    # 3. Text & markup accessibility alt text check
    a11y_sample = "Read this document. ![logo](https://cdn.example.com/logo.png) And click here for more."
    a11y_findings = audit_text_accessibility(a11y_sample)
    rule_codes = [f['rule_code'] for f in a11y_findings]
    assert 'A11Y-ALT-TEXT' in rule_codes
    assert 'A11Y-LINK-TEXT' in rule_codes

    # 4. WebP image upload ingestion
    img_byte_arr = io.BytesIO()
    im = Image.new('RGB', (120, 30), color='#F97316')
    im.save(img_byte_arr, format='WEBP')
    img_byte_arr.seek(0)

    upload_res = client.post(
        '/api/v1/reviews/run',
        headers=auth_tokens['creator'],
        data={'title': 'WebP Brand Banner'},
        files={'file': ('banner.webp', img_byte_arr.getvalue(), 'image/webp')}
    )
    assert upload_res.status_code == 200
    res_json = upload_res.json()
    assert res_json['submission_id'] is not None

def test_guideline_impact_simulator(client: TestClient, db_session, auth_tokens):
    """
    Phase 8: Brand Guideline Change Impact Simulator.
    Simulate proposing a new restriction without mutating historical approval decisions.
    """
    # Create historical content submissions
    client.post(
        '/api/v1/reviews/run',
        headers=auth_tokens['creator'],
        data={'title': 'Historical Piece 1', 'content_text': 'Apex Core powers our modern enterprise stack.'}
    )
    client.post(
        '/api/v1/reviews/run',
        headers=auth_tokens['creator'],
        data={'title': 'Historical Piece 2', 'content_text': 'We use Legacy Cloud for older legacy instances.'}
    )

    # Find the TERM-01 rule in the active rulebook
    rule = db_session.query(Rule).filter(Rule.rule_code == 'TERM-01').first()
    assert rule is not None

    # Simulate amendment on the rule
    sim_res = client.post(
        '/api/v1/governance/simulate-impact',
        headers=auth_tokens['manager'],
        json={
            'rule_id': rule.id,
            'proposed_description': 'Prohibit all references to Legacy Cloud or Apex Cloud across all communications.',
            'proposed_severity': 'BLOCKING'
        }
    )
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert sim_data['rule_code'] == 'TERM-01'
    assert sim_data['total_evaluated'] >= 2
    assert isinstance(sim_data['affected_items'], list)

def test_multi_brand_scoping_and_governance_export(client: TestClient, db_session, auth_tokens):
    """
    Phase 5 & 9: Multi-Brand & Regional Scoping and Governance Insights Export.
    """
    # Submit content with brand and regional tags
    sub_res = client.post(
        '/api/v1/reviews/run',
        headers=auth_tokens['creator'],
        data={
            'title': 'Aurora Desk Campaign EU',
            'content_text': 'Apex Core European rollout announcement.',
            'brand_name': 'Aurora Desk',
            'region': 'EU'
        }
    )
    assert sub_res.status_code == 200
    sub_json = sub_res.json()
    assert sub_json['brand_name'] == 'Aurora Desk'
    assert sub_json['region'] == 'EU'

    # Filter governance insights by brand_name
    insights_res = client.get('/api/v1/governance/insights?brand_name=Aurora Desk', headers=auth_tokens['manager'])
    assert insights_res.status_code == 200
    insights = insights_res.json()
    assert 'root_cause_recommendations' in insights
    assert 'average_turnaround_hours' in insights

    # Export governance compliance report
    export_res = client.get('/api/v1/governance/insights/export', headers=auth_tokens['manager'])
    assert export_res.status_code == 200
    export_data = export_res.json()
    assert export_data['report_hash'] is not None
    assert 'summary' in export_data
    assert export_data['summary']['total_reviews'] >= 1
