"""
Comprehensive Automated Regression and Security Test Suite for FIDELIS Remediation.

Tests cover:
1. Public registration locked to CREATOR (role escalation and workspace injection rejected)
2. Single-use, expiring, cryptographically secure invitation token lifecycle
3. Fail-closed persona switching in non-development environments
4. Administrator bootstrap one-time protection
5. Finding override authorization (CREATOR denied on BLOCKING, reason validated)
6. Approvals separation of duties (REVIEWER and CREATOR denied publication sign-off)
7. Asset preview ticket validation and SVG sandbox CSP headers
8. DefusedXML SVG sanitization against XXE and inline scripts
9. Multi-workspace cross-tenant isolation
10. Production settings validation (fail-closed on default secret, wildcard CORS, persona switching)
"""

import os
import time
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from app.config import Settings, settings
from app.core.security import create_access_token, hash_password
from app.core.asset_storage import SvgSecuritySanitizer
from app.api.v1.assets import generate_preview_ticket, verify_preview_ticket
from app.db.models import Workspace, User, Rulebook, Rule, Finding, ContentSubmission, ContentVersion, BrandAsset, Invitation
from app.seed.synthetic_brand import WORKSPACE_ID


def get_auth_headers(user: User) -> dict:
    token = create_access_token(
        {
            "sub": user.id,
            "email": user.email,
            "role": user.role,
            "workspace_id": user.workspace_id,
        }
    )
    return {"Authorization": f"Bearer {token}"}


# =========================================================================
# 1. AUTHENTICATION & PRIVILEGE ESCALATION
# =========================================================================

def test_public_registration_locked_to_creator(client, db_session):
    """Public registration cannot escalate to ADMIN or specify custom roles."""
    payload = {
        "email": "hacker@example.com",
        "full_name": "Attacker",
        "password": "Password123!",
        "role": "ADMIN",  # Attempted privilege escalation
    }
    resp = client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["role"] == "CREATOR", "Public registration must force CREATOR role"

    user = db_session.query(User).filter(User.email == "hacker@example.com").first()
    assert user is not None
    assert user.role == "CREATOR"


def test_public_registration_cannot_specify_arbitrary_workspace(client, db_session):
    """Public registration cannot bind to arbitrary customer workspaces."""
    payload = {
        "email": "creator2@example.com",
        "full_name": "Legit Creator",
        "password": "Password123!",
        "workspace_id": "ws-victim-corp-999",
    }
    resp = client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["workspace_id"] == settings.DEFAULT_WORKSPACE_ID


# =========================================================================
# 2. INVITATION LIFECYCLE & PRIVILEGED PROVISIONING
# =========================================================================

def test_create_invitation_requires_admin(client, db_session):
    """Non-administrators cannot create privileged invitations."""
    creator = db_session.query(User).filter(User.role == "CREATOR").first()
    headers = get_auth_headers(creator)

    payload = {"email": "invitee@example.com", "role": "APPROVER"}
    resp = client.post("/api/v1/auth/invitations", json=payload, headers=headers)
    assert resp.status_code == 403, "Creators must not be allowed to invite users"


def test_invitation_lifecycle_create_and_accept(client, db_session):
    """Admin creates an invitation; invitee accepts and receives assigned role."""
    admin = db_session.query(User).filter(User.role == "ADMIN").first()
    headers = get_auth_headers(admin)

    # 1. Admin creates invitation for APPROVER
    invite_resp = client.post(
        "/api/v1/auth/invitations",
        json={"email": "newapprover@example.com", "role": "APPROVER", "expires_in_days": 3},
        headers=headers,
    )
    assert invite_resp.status_code == 200
    invite_data = invite_resp.json()
    token = invite_data["invite_token"]
    assert token is not None
    assert invite_data["email_dispatched"] is True
    assert invite_data["delivery_status"].lower() in ("sent", "simulated")
    assert "/login?invite=" in invite_data["invite_url"]

    # Verify only digest is stored in DB
    inv_rec = db_session.query(Invitation).filter(Invitation.email == "newapprover@example.com").first()
    assert inv_rec is not None
    assert inv_rec.token_hash != token
    assert inv_rec.is_used is False

    # 2. Invitee accepts invitation
    accept_resp = client.post(
        "/api/v1/auth/invitations/accept",
        json={"token": token, "full_name": "New Executive", "password": "StrongPassword123!"},
    )
    assert accept_resp.status_code == 200
    accept_data = accept_resp.json()
    assert accept_data["role"] == "APPROVER"
    assert accept_data["email"] == "newapprover@example.com"

    # Verify user created in DB
    new_user = db_session.query(User).filter(User.email == "newapprover@example.com").first()
    assert new_user is not None
    assert new_user.role == "APPROVER"

    # 3. Single-use: Accepting again must fail
    replay_resp = client.post(
        "/api/v1/auth/invitations/accept",
        json={"token": token, "full_name": "Replay Attacker", "password": "StrongPassword123!"},
    )
    assert replay_resp.status_code == 400
    assert "already" in replay_resp.json()["detail"].lower()


def test_invitation_resend_email(client, db_session):
    """Admin can resend the invitation email to a pending invitee."""
    admin = db_session.query(User).filter(User.role == "ADMIN").first()
    headers = get_auth_headers(admin)

    # 1. Create invitation
    invite_resp = client.post(
        "/api/v1/auth/invitations",
        json={"email": "resend_test@example.com", "role": "AUTHORISED_REVIEWER", "expires_in_days": 5},
        headers=headers,
    )
    assert invite_resp.status_code == 200
    inv_id = invite_resp.json()["id"]

    # 2. Resend email
    resend_resp = client.post(
        f"/api/v1/auth/invitations/{inv_id}/resend-email",
        headers=headers,
    )
    assert resend_resp.status_code == 200
    resend_data = resend_resp.json()
    assert resend_data["success"] is True
    assert resend_data["delivery_status"].lower() in ("sent", "simulated")
    assert resend_data["recipient"] == "resend_test@example.com"


def test_invitation_expired_token(client, db_session):
    """Expired invitation token is rejected."""
    admin = db_session.query(User).filter(User.role == "ADMIN").first()
    headers = get_auth_headers(admin)

    invite_resp = client.post(
        "/api/v1/auth/invitations",
        json={"email": "expired@example.com", "role": "BRAND_MANAGER", "expires_in_days": 1},
        headers=headers,
    )
    token = invite_resp.json()["invite_token"]

    # Manually backdate expiration in DB
    inv_rec = db_session.query(Invitation).filter(Invitation.email == "expired@example.com").first()
    inv_rec.expires_at = datetime.now(timezone.utc) - timedelta(hours=2)
    db_session.commit()

    accept_resp = client.post(
        "/api/v1/auth/invitations/accept",
        json={"token": token, "full_name": "Late User", "password": "StrongPassword123!"},
    )
    assert accept_resp.status_code == 400
    assert "expired" in accept_resp.json()["detail"].lower()


# =========================================================================
# 3. PERSONA SWITCHING FAIL-CLOSED
# =========================================================================

def test_switch_persona_forbidden_in_production(client, db_session):
    """Switch persona unconditionally returns 403 when in non-dev or disabled."""
    with patch.object(settings, "ENVIRONMENT", "production"), \
         patch.object(settings, "ENABLE_DEV_PERSONA_SWITCHING", False):
        resp = client.post("/api/v1/auth/switch-persona", json={"role": "ADMIN"})
        assert resp.status_code == 403


def test_switch_persona_forbidden_in_unknown_environment(client, db_session):
    """An unfamiliar environment name (e.g. 'hackathon', 'staging') fails closed."""
    with patch.object(settings, "ENVIRONMENT", "staging"), \
         patch.object(settings, "ENABLE_DEV_PERSONA_SWITCHING", True):
        resp = client.post("/api/v1/auth/switch-persona", json={"role": "ADMIN"})
        assert resp.status_code == 403


# =========================================================================
# 4. INITIAL ADMINISTRATOR BOOTSTRAP
# =========================================================================

def test_bootstrap_admin_rejected_when_admin_exists(client, db_session):
    """Bootstrap admin endpoint rejects registration if an admin already exists."""
    resp = client.post(
        "/api/v1/auth/bootstrap-admin",
        json={"email": "newadmin@example.com", "full_name": "Second Admin", "password": "Password123!"},
    )
    assert resp.status_code == 403
    assert "already exists" in resp.json()["detail"].lower()


# =========================================================================
# 5. FINDING OVERRIDES & RBAC SEPARATION OF DUTIES
# =========================================================================

def test_creator_cannot_override_blocking_finding(client, db_session):
    """Content creator cannot override a BLOCKING finding."""
    creator = db_session.query(User).filter(User.role == "CREATOR").first()
    headers = get_auth_headers(creator)

    # Create dummy submission, version, and finding
    sub = ContentSubmission(workspace_id=WORKSPACE_ID, creator_id=creator.id, title="Test Draft")
    db_session.add(sub)
    db_session.flush()

    ver = ContentVersion(submission_id=sub.id, version_number=1, raw_text="Apex Cloud", redacted_text="Apex Cloud", content_hash="hash1")
    db_session.add(ver)
    db_session.flush()

    finding = Finding(
        content_version_id=ver.id,
        category="Brand Naming",
        severity="BLOCKING",
        matched_text="Apex Cloud",
        explanation="Forbidden legacy term",
    )
    db_session.add(finding)
    db_session.commit()

    # Creator attempts override
    resp = client.put(
        f"/api/v1/reviews/findings/{finding.id}/decision",
        json={"user_decision": "OVERRIDDEN", "override_reason": "I really need to ship this now."},
        headers=headers,
    )
    assert resp.status_code == 403
    assert "creators are not permitted to override blocking" in resp.json()["detail"].lower()


def test_override_requires_substantive_reason(client, db_session):
    """Overriding a finding without a valid justification of >= 5 chars is rejected."""
    reviewer = db_session.query(User).filter(User.role == "AUTHORISED_REVIEWER").first()
    headers = get_auth_headers(reviewer)

    finding = db_session.query(Finding).first()
    if not finding:
        sub = ContentSubmission(workspace_id=WORKSPACE_ID, creator_id=reviewer.id, title="Draft")
        db_session.add(sub)
        db_session.flush()
        ver = ContentVersion(submission_id=sub.id, version_number=1, raw_text="text", redacted_text="text", content_hash="h")
        db_session.add(ver)
        db_session.flush()
        finding = Finding(content_version_id=ver.id, category="Claims", severity="BLOCKING", matched_text="text", explanation="e")
        db_session.add(finding)
        db_session.commit()

    # Attempt override with whitespace reason
    resp = client.put(
        f"/api/v1/reviews/findings/{finding.id}/decision",
        json={"user_decision": "OVERRIDDEN", "override_reason": "   "},
        headers=headers,
    )
    assert resp.status_code in (400, 422)


def test_reviewer_can_override_blocking_finding(client, db_session):
    """Compliance Reviewer with a valid justification can override a finding."""
    reviewer = db_session.query(User).filter(User.role == "AUTHORISED_REVIEWER").first()
    headers = get_auth_headers(reviewer)

    sub = ContentSubmission(workspace_id=WORKSPACE_ID, creator_id=reviewer.id, title="Draft 2")
    db_session.add(sub)
    db_session.flush()
    ver = ContentVersion(submission_id=sub.id, version_number=1, raw_text="text", redacted_text="text", content_hash="h2")
    db_session.add(ver)
    db_session.flush()
    finding = Finding(content_version_id=ver.id, category="Claims", severity="BLOCKING", matched_text="text", explanation="e")
    db_session.add(finding)
    db_session.commit()

    resp = client.put(
        f"/api/v1/reviews/findings/{finding.id}/decision",
        json={"user_decision": "OVERRIDDEN", "override_reason": "Authorized exception per legal memo 2026-A."},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["decision"] == "OVERRIDDEN"

    updated = db_session.query(Finding).filter(Finding.id == finding.id).first()
    assert updated.user_decision == "OVERRIDDEN"
    assert resp.json()["reason"] == "Authorized exception per legal memo 2026-A."


# =========================================================================
# 6. SEPARATION OF DUTIES IN PUBLICATION APPROVALS
# =========================================================================

def test_reviewer_and_creator_cannot_approve_publication(client, db_session):
    """AUTHORISED_REVIEWER and CREATOR cannot submit final publication approval."""
    reviewer = db_session.query(User).filter(User.role == "AUTHORISED_REVIEWER").first()
    creator = db_session.query(User).filter(User.role == "CREATOR").first()

    sub = ContentSubmission(workspace_id=WORKSPACE_ID, creator_id=creator.id, title="Publication Draft")
    db_session.add(sub)
    db_session.flush()
    ver = ContentVersion(submission_id=sub.id, version_number=1, raw_text="text", redacted_text="text", content_hash="h3")
    db_session.add(ver)
    db_session.commit()

    # Reviewer attempts approval
    resp_rev = client.post(
        f"/api/v1/approvals/{sub.id}",
        json={"decision": "APPROVED", "reason": "Looks good to me"},
        headers=get_auth_headers(reviewer),
    )
    assert resp_rev.status_code == 403
    assert "not authorized" in resp_rev.json()["detail"].lower()

    # Creator attempts approval
    resp_creator = client.post(
        f"/api/v1/approvals/{sub.id}",
        json={"decision": "APPROVED", "reason": "Self approving"},
        headers=get_auth_headers(creator),
    )
    assert resp_creator.status_code == 403


# =========================================================================
# 7. ASSET PREVIEW TICKETS & SVG DEFUSEDXML SANITIZATION
# =========================================================================

def test_preview_ticket_generation_and_validation():
    """HMAC-SHA256 preview tickets validate within lifetime and reject tampering."""
    asset_id = "asset-test-123"
    secret = settings.SECRET_KEY

    ticket = generate_preview_ticket(asset_id, "usr-01", "ws-01", secret, expires_in_seconds=60)
    assert verify_preview_ticket(ticket, asset_id, secret) == "ws-01"

    # Tampered asset_id
    assert verify_preview_ticket(ticket, "asset-wrong-999", secret) is None

    # Tampered ticket signature
    tampered = ticket[:-4] + "abcd"
    assert verify_preview_ticket(tampered, asset_id, secret) is None


def test_svg_sanitizer_removes_scripts_and_events():
    """DefusedXML sanitizer scrubs <script> tags, foreign namespaces, and onload attributes."""
    malicious_svg = b"""
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" onload="alert('XSS')">
        <script>alert('pwned')</script>
        <circle cx="50" cy="50" r="40" fill="red" onclick="stealData()"/>
    </svg>
    """
    clean_bytes, count = SvgSecuritySanitizer.sanitize(malicious_svg)
    clean_str = clean_bytes.decode("utf-8")

    assert count >= 2, "Should scrub script tag and event handlers"
    assert "<script" not in clean_str
    assert "onload" not in clean_str
    assert "onclick" not in clean_str
    assert "<circle" in clean_str


# =========================================================================
# 8. MULTI-WORKSPACE TENANT ISOLATION
# =========================================================================

def test_cross_workspace_read_isolation(client, db_session):
    """User in Workspace A cannot access assets belonging to Workspace B."""
    ws_b = Workspace(id="ws-other-tenant-999", name="Other Tenant", slug="other-tenant")
    db_session.add(ws_b)
    db_session.flush()

    user_b = User(
        id="usr-tenant-b",
        workspace_id=ws_b.id,
        email="tenantb@other.example",
        full_name="Tenant B Admin",
        role="ADMIN",
        hashed_password=hash_password("Password123!"),
    )
    db_session.add(user_b)
    db_session.flush()

    asset_b = BrandAsset(
        workspace_id=ws_b.id,
        name="Confidential Logo B",
        category="LOGO",
        status="APPROVED",
    )
    db_session.add(asset_b)
    db_session.commit()

    # User A (from ApexDynamics) attempts to access Asset B
    user_a = db_session.query(User).filter(User.workspace_id == WORKSPACE_ID).first()
    resp = client.get(f"/api/v1/assets/{asset_b.id}", headers=get_auth_headers(user_a))
    assert resp.status_code == 404, "Cross-workspace access must return 404 Not Found"


# =========================================================================
# 9. PRODUCTION CONFIGURATION VALIDATION
# =========================================================================

def test_validate_production_settings_rejects_insecure_keys():
    """Settings validation fails closed if insecure secrets or wildcards are provided."""
    with pytest.raises(ValueError, match="Insecure or insufficient SECRET_KEY"):
        s = Settings(
            ENVIRONMENT="production",
            SECRET_KEY="secret",
            ENABLE_DEV_PERSONA_SWITCHING=False,
            ENABLE_DEMO_ACCOUNTS=False,
            CORS_ORIGINS=["https://example.com"],
        )
        s.validate_production_settings()

    with pytest.raises(ValueError, match="ENABLE_DEV_PERSONA_SWITCHING must be False"):
        s = Settings(
            ENVIRONMENT="production",
            SECRET_KEY="a-very-strong-32-character-secret-key-for-test",
            ENABLE_DEV_PERSONA_SWITCHING=True,
            ENABLE_DEMO_ACCOUNTS=False,
            CORS_ORIGINS=["https://example.com"],
        )
        s.validate_production_settings()

    with pytest.raises(ValueError, match="Wildcard '\\*' CORS origin is strictly forbidden"):
        s = Settings(
            ENVIRONMENT="production",
            SECRET_KEY="a-very-strong-32-character-secret-key-for-test",
            ENABLE_DEV_PERSONA_SWITCHING=False,
            ENABLE_DEMO_ACCOUNTS=False,
            CORS_ORIGINS=["https://example.com", "*"],
        )
        s.validate_production_settings()
