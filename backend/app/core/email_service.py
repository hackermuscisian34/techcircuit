import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)

ROLE_LABELS: Dict[str, str] = {
    "ADMIN": "Platform Administrator (ADMIN)",
    "BRAND_MANAGER": "Brand Manager (BRAND_MANAGER)",
    "AUTHORISED_REVIEWER": "Compliance Reviewer (AUTHORISED_REVIEWER)",
    "CREATOR": "Content Creator (CREATOR)",
    "APPROVER": "Executive Approver (APPROVER)",
}

def generate_invitation_html(
    recipient_email: str,
    role: str,
    raw_token: str,
    expires_at: datetime,
    invited_by_name: str,
    invite_url: str,
    workspace_name: str = "ApexDynamics"
) -> str:
    role_display = ROLE_LABELS.get(role, role)
    expires_str = expires_at.strftime("%B %d, %Y at %H:%M UTC")

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to join FIDELIS</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #FFFBF7;
      color: #201815;
      margin: 0;
      padding: 24px;
    }}
    .email-wrapper {{
      max-width: 580px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border: 1px solid #F4E2D3;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(32, 24, 21, 0.05);
    }}
    .email-header {{
      background: linear-gradient(135deg, #FF8A3D, #FF5F0F);
      color: #FFFFFF;
      padding: 32px 28px;
      text-align: center;
    }}
    .email-header h1 {{
      margin: 0;
      font-size: 24px;
      font-weight: 900;
      letter-spacing: -0.5px;
    }}
    .email-header p {{
      margin: 8px 0 0 0;
      font-size: 13px;
      opacity: 0.95;
      font-weight: 500;
    }}
    .email-body {{
      padding: 32px 28px;
    }}
    .greeting {{
      font-size: 15px;
      font-weight: bold;
      color: #201815;
      margin-bottom: 12px;
    }}
    .intro-text {{
      font-size: 13.5px;
      line-height: 1.6;
      color: #5C4B40;
      margin-bottom: 24px;
    }}
    .role-badge {{
      display: inline-block;
      background-color: #FFF2E7;
      color: #D95D0D;
      border: 1px solid #FDBA74;
      font-size: 12px;
      font-weight: bold;
      padding: 4px 12px;
      border-radius: 8px;
      font-family: monospace;
      margin: 4px 0;
    }}
    .cta-container {{
      text-align: center;
      margin: 32px 0;
    }}
    .cta-button {{
      display: inline-block;
      background: linear-gradient(135deg, #FF8A3D, #FF5F0F);
      color: #FFFFFF !important;
      text-decoration: none;
      font-weight: 800;
      font-size: 14px;
      padding: 14px 28px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(255, 95, 15, 0.25);
    }}
    .token-box {{
      background-color: #FFF9F3;
      border: 1px solid #F4E2D3;
      border-radius: 14px;
      padding: 16px 20px;
      margin: 24px 0;
    }}
    .token-label {{
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #7C6A5E;
      margin-bottom: 6px;
    }}
    .token-value {{
      font-family: monospace;
      font-size: 13px;
      color: #D95D0D;
      word-break: break-all;
      font-weight: bold;
      user-select: all;
    }}
    .expiry-note {{
      font-size: 11.5px;
      color: #A49184;
      margin-top: 8px;
    }}
    .email-footer {{
      border-top: 1px solid #F4E2D3;
      padding: 20px 28px;
      font-size: 11px;
      color: #A49184;
      line-height: 1.5;
      text-align: center;
      background-color: #FFFDFB;
    }}
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-header">
      <h1>FIDELIS · Brand Governance</h1>
      <p>Workspace Access & Role Provisioning</p>
    </div>
    <div class="email-body">
      <div class="greeting">Hello,</div>
      <div class="intro-text">
        <strong>{invited_by_name}</strong> has invited you to join the <strong>{workspace_name}</strong> workspace on the FIDELIS platform.
        <br><br>
        Your designated governance role:
        <br>
        <span class="role-badge">{role_display}</span>
      </div>

      <div class="cta-container">
        <a href="{invite_url}" class="cta-button" target="_blank" rel="noopener noreferrer">
          Accept Invitation & Activate Account
        </a>
      </div>

      <div class="token-box">
        <div class="token-label">Single-Use Security Token</div>
        <div class="token-value">{raw_token}</div>
        <div class="expiry-note">
          This token is cryptographically signed and valid until <strong>{expires_str}</strong>. It can only be used once.
        </div>
      </div>

      <div class="intro-text" style="font-size: 12px;">
        If the button above does not work, copy and paste this link into your browser:
        <br>
        <a href="{invite_url}" style="color: #FF5F0F; word-break: break-all;">{invite_url}</a>
      </div>
    </div>
    <div class="email-footer">
      This is an automated invitation dispatched by the FIDELIS Brand Governance Platform.
      <br>If you did not expect this invitation, please ignore this email.
    </div>
  </div>
</body>
</html>"""


def generate_invitation_text(
    recipient_email: str,
    role: str,
    raw_token: str,
    expires_at: datetime,
    invited_by_name: str,
    invite_url: str,
    workspace_name: str = "ApexDynamics"
) -> str:
    role_display = ROLE_LABELS.get(role, role)
    expires_str = expires_at.strftime("%B %d, %Y at %H:%M UTC")

    return f"""FIDELIS · Brand Governance Platform
Workspace Access & Role Provisioning

Hello,

{invited_by_name} has invited you to join the {workspace_name} workspace.
Your designated governance role: {role_display}

To accept your invitation and activate your account, click the link below:
{invite_url}

Your single-use security token:
{raw_token}

This token is valid until {expires_str} (single-use only).

--
FIDELIS Brand Governance Platform
"""


def send_invitation_email(
    recipient_email: str,
    role: str,
    raw_token: str,
    expires_at: datetime,
    invited_by_name: str = "Platform Administrator",
    invite_url: Optional[str] = None,
    workspace_name: str = "ApexDynamics"
) -> Dict[str, Any]:
    """
    Sends an automated invitation email containing the single-use token and activation link.
    If SMTP credentials are provided in settings, dispatches via SMTP.
    Otherwise, gracefully simulates and logs dispatch for development/testing.
    """
    clean_email = recipient_email.strip().lower()
    clean_url = invite_url or f"http://localhost:3000/login?invite={raw_token}"
    role_label = ROLE_LABELS.get(role, role)

    subject = f"You're invited to join {workspace_name} on FIDELIS ({role_label})"

    html_content = generate_invitation_html(
        recipient_email=clean_email,
        role=role,
        raw_token=raw_token,
        expires_at=expires_at,
        invited_by_name=invited_by_name,
        invite_url=clean_url,
        workspace_name=workspace_name
    )

    text_content = generate_invitation_text(
        recipient_email=clean_email,
        role=role,
        raw_token=raw_token,
        expires_at=expires_at,
        invited_by_name=invited_by_name,
        invite_url=clean_url,
        workspace_name=workspace_name
    )

    # Check if SMTP server is configured
    smtp_host = settings.SMTP_HOST or os.environ.get("SMTP_HOST")
    smtp_port = settings.SMTP_PORT or int(os.environ.get("SMTP_PORT", 587))
    smtp_user = settings.SMTP_USER or os.environ.get("SMTP_USER")
    smtp_pass = settings.SMTP_PASSWORD or os.environ.get("SMTP_PASSWORD")

    if smtp_host:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
            msg["To"] = clean_email

            msg.attach(MIMEText(text_content, "plain", "utf-8"))
            msg.attach(MIMEText(html_content, "html", "utf-8"))

            if settings.SMTP_TLS and smtp_port == 465:
                server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=settings.SMTP_TIMEOUT_SECONDS)
            else:
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=settings.SMTP_TIMEOUT_SECONDS)
                server.ehlo()
                if settings.SMTP_TLS:
                    server.starttls()
                    server.ehlo()

            if smtp_user and smtp_pass:
                server.login(smtp_user, smtp_pass)

            server.send_message(msg)
            server.quit()

            logger.info(f"[EMAIL SERVICE] Successfully sent invitation email to {clean_email} via SMTP ({smtp_host}).")
            return {
                "success": True,
                "method": "smtp",
                "recipient": clean_email,
                "delivery_status": "SENT",
                "is_live": True,
                "message": f"Invitation email successfully delivered to {clean_email} via SMTP."
            }
        except Exception as e:
            logger.warning(f"[EMAIL SERVICE] SMTP delivery failed to {clean_email}: {e}. Falling back to recorded simulation.")
            return {
                "success": False,
                "method": "smtp_error",
                "recipient": clean_email,
                "delivery_status": "FAILED",
                "is_live": False,
                "message": f"SMTP delivery failed: {str(e)}. Please verify your SMTP credentials."
            }

    # Development / Offline mode: Record dispatch and log to console
    logger.info(f"[EMAIL SERVICE: SIMULATED] Dispatched invitation to {clean_email} with token: {raw_token}")
    print(f"\n========================================================")
    print(f"[AUTOMATIC EMAIL DISPATCH - CONSOLE SIMULATION]")
    print(f"Notice: SMTP_HOST is not configured in backend/.env.")
    print(f"To deliver live emails to client inboxes, provide SMTP credentials.")
    print(f"To: {clean_email}")
    print(f"Subject: {subject}")
    print(f"Invite URL: {clean_url}")
    print(f"Token: {raw_token}")
    print(f"Role: {role}")
    print(f"========================================================\n")

    return {
        "success": True,
        "method": "simulated",
        "recipient": clean_email,
        "delivery_status": "SIMULATED",
        "is_live": False,
        "message": f"SMTP server is not configured in backend/.env. Token and link were generated and logged to server console."
    }


def get_smtp_status() -> Dict[str, Any]:
    """Returns current SMTP connection status and masked configuration details."""
    smtp_host = settings.SMTP_HOST or os.environ.get("SMTP_HOST")
    smtp_port = settings.SMTP_PORT or int(os.environ.get("SMTP_PORT", 587))
    smtp_user = settings.SMTP_USER or os.environ.get("SMTP_USER")
    is_configured = bool(smtp_host and smtp_host.strip())

    masked_user = None
    if smtp_user:
        parts = smtp_user.split("@")
        if len(parts) == 2:
            name, domain = parts
            masked_user = f"{name[:2]}***@{domain}"
        else:
            masked_user = f"{smtp_user[:3]}***"

    return {
        "configured": is_configured,
        "host": smtp_host or "Not configured (Offline / Simulated)",
        "port": smtp_port,
        "user": masked_user,
        "has_password": bool(settings.SMTP_PASSWORD or os.environ.get("SMTP_PASSWORD")),
        "from_email": settings.SMTP_FROM_EMAIL,
        "from_name": settings.SMTP_FROM_NAME,
        "tls": settings.SMTP_TLS,
        "mode": "LIVE_SMTP" if is_configured else "LOCAL_SIMULATED",
    }


def send_test_email(recipient_email: str) -> Dict[str, Any]:
    """Sends a live test diagnostic email to verify SMTP credentials."""
    clean_email = recipient_email.strip().lower()
    smtp_host = settings.SMTP_HOST or os.environ.get("SMTP_HOST")
    smtp_port = settings.SMTP_PORT or int(os.environ.get("SMTP_PORT", 587))
    smtp_user = settings.SMTP_USER or os.environ.get("SMTP_USER")
    smtp_pass = settings.SMTP_PASSWORD or os.environ.get("SMTP_PASSWORD")

    if not smtp_host:
        return {
            "success": False,
            "message": "Cannot send test email: SMTP_HOST is not configured in backend/.env. Please enter your SMTP credentials first.",
            "delivery_status": "FAILED"
        }

    subject = "FIDELIS SMTP Configuration Test"
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    text_content = f"FIDELIS Diagnostic Email\n\nThis confirms that outgoing email via SMTP ({smtp_host}:{smtp_port}) is active and functioning properly.\nSent at: {timestamp}"
    html_content = f"""<div style="font-family: sans-serif; padding: 20px; border: 1px solid #E5E7EB; border-radius: 12px; max-width: 500px;">
        <h2 style="color: #027A48; margin-top: 0;">✓ SMTP Connected Successfully</h2>
        <p style="color: #374151; font-size: 14px;">This test confirms that FIDELIS platform emails are properly routed via <strong>{smtp_host}:{smtp_port}</strong>.</p>
        <p style="color: #6B7280; font-size: 12px;">Timestamp: {timestamp}</p>
    </div>"""

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = clean_email

        msg.attach(MIMEText(text_content, "plain", "utf-8"))
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        if settings.SMTP_TLS and smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=settings.SMTP_TIMEOUT_SECONDS)
        else:
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=settings.SMTP_TIMEOUT_SECONDS)
            server.ehlo()
            if settings.SMTP_TLS:
                server.starttls()
                server.ehlo()

        if smtp_user and smtp_pass:
            server.login(smtp_user, smtp_pass)

        server.send_message(msg)
        server.quit()

        return {
            "success": True,
            "message": f"Test email successfully sent to {clean_email} via SMTP ({smtp_host}). Please check your inbox (and Spam folder).",
            "delivery_status": "SENT"
        }
    except Exception as e:
        logger.error(f"[EMAIL SERVICE] Test email failed: {e}")
        return {
            "success": False,
            "message": f"SMTP test failed: {str(e)}",
            "delivery_status": "FAILED",
            "error_details": str(e)
        }


def update_smtp_settings(
    host: str,
    port: int,
    user: Optional[str] = None,
    password: Optional[str] = None,
    from_email: Optional[str] = None,
    from_name: Optional[str] = None,
    tls: bool = True,
    persist_to_env: bool = True
) -> Dict[str, Any]:
    """Updates runtime SMTP configuration and optionally saves to backend/.env."""
    settings.SMTP_HOST = host.strip() if host else None
    settings.SMTP_PORT = int(port)
    if user is not None:
        settings.SMTP_USER = user.strip() if user else None
    if password is not None and password.strip():
        settings.SMTP_PASSWORD = password.strip()
    if from_email and from_email.strip():
        settings.SMTP_FROM_EMAIL = from_email.strip()
    if from_name and from_name.strip():
        settings.SMTP_FROM_NAME = from_name.strip()
    settings.SMTP_TLS = tls

    # Optionally persist to backend/.env
    if persist_to_env:
        try:
            env_path = os.path.join(settings.BASE_DIR, ".env")
            env_lines = []
            existing_keys = set()
            if os.path.exists(env_path):
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        key = line.split("=")[0].strip() if "=" in line else ""
                        if key in ("SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM_EMAIL", "SMTP_FROM_NAME", "SMTP_TLS"):
                            continue
                        env_lines.append(line)

            # Append updated SMTP keys
            env_lines.append("\n# SMTP Outgoing Email Configuration\n")
            env_lines.append(f"SMTP_HOST={settings.SMTP_HOST or ''}\n")
            env_lines.append(f"SMTP_PORT={settings.SMTP_PORT}\n")
            env_lines.append(f"SMTP_USER={settings.SMTP_USER or ''}\n")
            if settings.SMTP_PASSWORD:
                env_lines.append(f"SMTP_PASSWORD={settings.SMTP_PASSWORD}\n")
            env_lines.append(f"SMTP_FROM_EMAIL={settings.SMTP_FROM_EMAIL}\n")
            env_lines.append(f"SMTP_FROM_NAME={settings.SMTP_FROM_NAME}\n")
            env_lines.append(f"SMTP_TLS={'true' if settings.SMTP_TLS else 'false'}\n")

            with open(env_path, "w", encoding="utf-8") as f:
                f.writelines(env_lines)
            logger.info("[EMAIL SERVICE] Saved updated SMTP configuration to backend/.env")
        except Exception as e:
            logger.warning(f"[EMAIL SERVICE] Could not write SMTP config to .env: {e}")

    return get_smtp_status()
