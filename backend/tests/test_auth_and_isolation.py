import pytest
from datetime import timedelta
from app.db.models import Workspace, User, ContentSubmission, ContentVersion
from app.core.security import create_access_token, hash_password

def get_auth_headers(user_id: str, email: str, role: str, workspace_id: str) -> dict:
    token = create_access_token({'sub': user_id, 'email': email, 'role': role, 'workspace_id': workspace_id})
    return {'Authorization': f'Bearer {token}'}

def test_login_success_and_jwt_claims(client, db_session):
    res = client.post('/api/v1/auth/login', json={'email': 'creator@apexdynamics.example', 'password': 'Password123!'})
    assert res.status_code == 200
    data = res.json()
    assert 'access_token' in data
    assert data['role'] == 'CREATOR'
    assert data['workspace_id'] == 'ws-apexdynamics-001'

def test_login_invalid_password_rejected(client):
    res = client.post('/api/v1/auth/login', json={'email': 'creator@apexdynamics.example', 'password': 'WrongPassword!'})
    assert res.status_code == 401
    assert 'Incorrect email or password' in res.json()['detail']

def test_protected_routes_reject_unauthenticated(client):
    res_me = client.get('/api/v1/auth/me')
    assert res_me.status_code == 401
    res_facts = client.get('/api/v1/facts')
    assert res_facts.status_code == 401
    res_submissions = client.get('/api/v1/reviews/submissions')
    assert res_submissions.status_code == 401
    res_queue = client.get('/api/v1/approvals/queue')
    assert res_queue.status_code == 401

def test_protected_routes_reject_invalid_token(client):
    res = client.get('/api/v1/auth/me', headers={'Authorization': 'Bearer forged-fake-token-12345'})
    assert res.status_code == 401

def test_registration_prevents_role_escalation(client):
    res = client.post('/api/v1/auth/register', json={'email': 'attacker@external.com', 'full_name': 'Privilege Attacker', 'password': 'HackerPassword123!', 'role': 'ADMIN'})
    assert res.status_code == 200
    data = res.json()
    assert data['role'] == 'CREATOR'

def test_role_enforcement_approvals(client):
    creator_headers = get_auth_headers('usr-creator-01', 'creator@apexdynamics.io', 'CREATOR', 'ws-apexdynamics-001')
    approver_headers = get_auth_headers('usr-approver-01', 'approver@apexdynamics.io', 'APPROVER', 'ws-apexdynamics-001')
    res_queue_creator = client.get('/api/v1/approvals/queue', headers=creator_headers)
    assert res_queue_creator.status_code == 403
    res_queue_approver = client.get('/api/v1/approvals/queue', headers=approver_headers)
    assert res_queue_approver.status_code == 200

def test_admin_only_role_modification(client, db_session):
    creator_headers = get_auth_headers('usr-creator-01', 'creator@apexdynamics.io', 'CREATOR', 'ws-apexdynamics-001')
    admin_headers = get_auth_headers('usr-admin-01', 'admin@apexdynamics.io', 'ADMIN', 'ws-apexdynamics-001')
    res_creator = client.put('/api/v1/auth/users/usr-creator-01/role', headers=creator_headers, json={'role': 'ADMIN'})
    assert res_creator.status_code == 403
    res_admin = client.put('/api/v1/auth/users/usr-creator-01/role', headers=admin_headers, json={'role': 'AUTHORISED_REVIEWER'})
    assert res_admin.status_code == 200
    assert res_admin.json()['role'] == 'AUTHORISED_REVIEWER'

def test_cross_workspace_isolation(client, db_session):
    ws2 = Workspace(id='ws-competitor-002', name='Competitor Corp', slug='competitor')
    db_session.add(ws2)
    user_ws2 = User(id='usr-comp-01', workspace_id=ws2.id, email='dev@competitor.com', full_name='Competitor User', role='CREATOR', hashed_password=hash_password('Pass123!'), is_active=True)
    db_session.add(user_ws2)
    sub_ws2 = ContentSubmission(id='sub-secret-002', workspace_id=ws2.id, creator_id=user_ws2.id, title='Super Confidential Competitor Launch', content_type='TEXT', current_status='SUBMITTED')
    db_session.add(sub_ws2)
    db_session.commit()
    apex_headers = get_auth_headers('usr-creator-01', 'creator@apexdynamics.io', 'CREATOR', 'ws-apexdynamics-001')
    res_detail = client.get(f'/api/v1/reviews/submissions/{sub_ws2.id}', headers=apex_headers)
    assert res_detail.status_code == 404
    res_list = client.get('/api/v1/reviews/submissions', headers=apex_headers)
    assert res_list.status_code == 200
    submissions = res_list.json()
    submission_ids = [s['id'] for s in submissions]
    assert sub_ws2.id not in submission_ids
    apex_approver_headers = get_auth_headers('usr-approver-01', 'approver@apexdynamics.io', 'APPROVER', 'ws-apexdynamics-001')
    res_approve = client.post(f'/api/v1/approvals/{sub_ws2.id}', headers=apex_approver_headers, json={'decision': 'APPROVED'})
    assert res_approve.status_code == 404

def test_persona_switching_disabled_when_flag_off(client, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, 'ENABLE_DEV_PERSONA_SWITCHING', False)
    res = client.post('/api/v1/auth/switch-persona', json={'role': 'ADMIN'})
    assert res.status_code == 403
    assert 'disabled' in res.json()['detail']

def test_expired_jwt_rejected(client):
    import jwt
    from datetime import datetime, timezone, timedelta
    from app.config import settings

    past = datetime.now(timezone.utc) - timedelta(hours=2)
    payload = {
        'sub': 'usr-creator-01',
        'email': 'creator@apexdynamics.io',
        'role': 'CREATOR',
        'workspace_id': 'ws-apexdynamics-001',
        'exp': past
    }
    expired_token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    res = client.get('/api/v1/auth/me', headers={'Authorization': f'Bearer {expired_token}'})
    assert res.status_code == 401
    assert 'expired' in res.json()['detail'].lower() or 'invalid' in res.json()['detail'].lower()

def test_forged_jwt_signature_rejected(client):
    import jwt
    from datetime import datetime, timezone, timedelta
    payload = {
        'sub': 'usr-admin-01',
        'email': 'admin@apexdynamics.io',
        'role': 'ADMIN',
        'workspace_id': 'ws-apexdynamics-001',
        'exp': datetime.now(timezone.utc) + timedelta(hours=1)
    }
    forged_token = jwt.encode(payload, 'wrong-fake-secret-key-321-at-least-32-chars-long', algorithm='HS256')
    res = client.get('/api/v1/auth/me', headers={'Authorization': f'Bearer {forged_token}'})
    assert res.status_code == 401

def test_missing_sub_or_workspace_jwt_rejected(client):
    import jwt
    from datetime import datetime, timezone, timedelta
    from app.config import settings

    payload_no_sub = {
        'email': 'admin@apexdynamics.io',
        'role': 'ADMIN',
        'workspace_id': 'ws-apexdynamics-001',
        'exp': datetime.now(timezone.utc) + timedelta(hours=1)
    }
    token_no_sub = jwt.encode(payload_no_sub, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    res = client.get('/api/v1/auth/me', headers={'Authorization': f'Bearer {token_no_sub}'})
    assert res.status_code == 401

def test_anonymous_cannot_download_or_preview_assets(client):
    res_down = client.get('/api/v1/assets/asset-12345/download')
    assert res_down.status_code == 401
    res_prev = client.get('/api/v1/assets/asset-12345/preview')
    assert res_prev.status_code == 401

def test_cross_workspace_asset_isolation(client, db_session):
    from app.db.models import BrandAsset
    ws_other = Workspace(id='ws-other-corp-999', name='Other Corp', slug='other-corp')
    db_session.add(ws_other)
    asset_other = BrandAsset(
        id='asset-confidential-999',
        workspace_id=ws_other.id,
        name='Competitor Logo',
        category='LOGO',
        file_path='storage/sample.png',
        file_size_bytes=1024,
        mime_type='image/png',
        status='APPROVED'
    )
    db_session.add(asset_other)
    db_session.commit()

    apex_headers = get_auth_headers('usr-creator-01', 'creator@apexdynamics.io', 'CREATOR', 'ws-apexdynamics-001')
    res_down = client.get(f'/api/v1/assets/{asset_other.id}/download', headers=apex_headers)
    assert res_down.status_code == 404
    res_prev = client.get(f'/api/v1/assets/{asset_other.id}/preview', headers=apex_headers)
    assert res_prev.status_code == 404

def test_self_approval_prevention_on_submissions(client, db_session):
    # A user who creates a submission cannot approve their own submission even if they hold APPROVER role
    dual_user = User(
        id='usr-dual-role-01',
        workspace_id='ws-apexdynamics-001',
        email='dual@apexdynamics.io',
        full_name='Dual Role User',
        role='APPROVER',
        hashed_password=hash_password('Pass123!'),
        is_active=True
    )
    db_session.add(dual_user)
    sub = ContentSubmission(
        id='sub-self-approval-01',
        workspace_id='ws-apexdynamics-001',
        creator_id=dual_user.id,
        title='Self Authored Campaign',
        content_type='TEXT',
        current_status='SUBMITTED'
    )
    db_session.add(sub)
    db_session.commit()

    dual_headers = get_auth_headers(dual_user.id, dual_user.email, 'APPROVER', 'ws-apexdynamics-001')
    res_approve = client.post(f'/api/v1/approvals/{sub.id}', headers=dual_headers, json={'decision': 'APPROVED', 'rationale': 'I like my work'})
    assert res_approve.status_code == 403
    assert 'own submissions' in res_approve.json()['detail']

def test_cross_workspace_rulebook_isolation(client, db_session):
    from app.db.models import Rulebook
    ws_comp = Workspace(id='ws-rulebook-comp-001', name='Comp Rulebook Inc', slug='comp-rulebook')
    db_session.add(ws_comp)
    user_comp = User(
        id='usr-comp-rulebook-01',
        workspace_id=ws_comp.id,
        email='lead@comprulebook.io',
        full_name='Comp Lead',
        role='CREATOR',
        hashed_password=hash_password('Pass123!'),
        is_active=True
    )
    db_session.add(user_comp)
    rulebook_comp = Rulebook(
        id='rb-comp-001',
        workspace_id=ws_comp.id,
        title='Competitor Guidelines',
        status='ACTIVE'
    )
    db_session.add(rulebook_comp)
    db_session.commit()

    # User in workspace A calling active rulebook receives ONLY Apex Dynamics rulebook
    apex_headers = get_auth_headers('usr-creator-01', 'creator@apexdynamics.io', 'CREATOR', 'ws-apexdynamics-001')
    res_apex = client.get('/api/v1/rulebooks/active', headers=apex_headers)
    assert res_apex.status_code == 200
    assert res_apex.json()['workspace_id'] == 'ws-apexdynamics-001'
    assert res_apex.json()['id'] != rulebook_comp.id

    # User in workspace B calling active rulebook receives ONLY workspace B rulebook
    comp_headers = get_auth_headers(user_comp.id, user_comp.email, 'CREATOR', ws_comp.id)
    res_comp = client.get('/api/v1/rulebooks/active', headers=comp_headers)
    assert res_comp.status_code == 200
    assert res_comp.json()['workspace_id'] == ws_comp.id
    assert res_comp.json()['id'] == rulebook_comp.id
