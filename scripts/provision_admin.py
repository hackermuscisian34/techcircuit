#!/usr/bin/env python3
"""
Secure Administrator Provisioning Utility for FIDELIS / CANON.
Used to initialize or update the initial administrative user in production
without relying on synthetic demo accounts or hardcoded default passwords.
"""

import sys
import os
import argparse
import getpass
from pathlib import Path

# Add backend directory to sys.path so app modules can be loaded
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.db.session import SessionLocal, engine, Base
from app.db.models import User, Workspace
from app.core.security import hash_password
from app.core.audit_chain import record_audit_event
from app.config import settings

def validate_password_strength(password: str) -> None:
    if len(password) < 10:
        raise ValueError("Password must be at least 10 characters long.")
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    if not (has_upper and has_lower and has_digit):
        raise ValueError("Password must contain at least one uppercase letter, one lowercase letter, and one digit.")

def provision_admin(email: str, password: str, full_name: str, workspace_id: str) -> None:
    validate_password_strength(password)
    clean_email = email.strip().lower()
    clean_name = full_name.strip()
    
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Ensure target workspace exists
        ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if not ws:
            ws = Workspace(
                id=workspace_id,
                name="Primary Enterprise Workspace",
                slug=f"ws-{workspace_id[:8]}"
            )
            db.add(ws)
            db.flush()

        # Check existing user
        user = db.query(User).filter(User.email == clean_email).first()
        hashed = hash_password(password)
        if user:
            user.full_name = clean_name
            user.role = "ADMIN"
            user.hashed_password = hashed
            user.workspace_id = workspace_id
            user.is_active = True
            action = "UPDATED"
        else:
            import uuid
            user = User(
                id=f"usr-{uuid.uuid4().hex[:8]}",
                workspace_id=workspace_id,
                email=clean_email,
                full_name=clean_name,
                role="ADMIN",
                hashed_password=hashed,
                is_active=True
            )
            db.add(user)
            action = "CREATED"

        db.commit()
        db.refresh(user)

        # Audit log the admin provisioning
        record_audit_event(
            db=db,
            workspace_id=workspace_id,
            event_type="ADMIN_PROVISIONED",
            actor_id=user.id,
            actor_role="ADMIN",
            details={
                "action": action,
                "email": clean_email,
                "user_id": user.id,
                "workspace_id": workspace_id
            }
        )

        print(f"SUCCESS: Administrator {action.lower()} successfully.")
        print(f"  User ID      : {user.id}")
        print(f"  Email        : {user.email}")
        print(f"  Role         : {user.role}")
        print(f"  Workspace ID : {user.workspace_id}")
    finally:
        db.close()

def main():
    parser = argparse.ArgumentParser(description="Provision an Administrator account for FIDELIS.")
    parser.add_argument("--email", help="Administrator email address")
    parser.add_argument("--fullname", help="Administrator full name", default="System Administrator")
    parser.add_argument("--workspace", help="Target workspace ID", default=settings.DEFAULT_WORKSPACE_ID)
    parser.add_argument("--password", help="Administrator password (prompted securely if omitted)")

    args = parser.parse_args()

    email = args.email or os.environ.get("ADMIN_PROVISION_EMAIL")
    if not email:
        email = input("Enter administrator email: ").strip()

    password = args.password or os.environ.get("ADMIN_PROVISION_PASSWORD")
    if not password:
        password = getpass.getpass("Enter administrator password (min 10 chars, uppercase, lowercase, digit): ")
        password_confirm = getpass.getpass("Confirm administrator password: ")
        if password != password_confirm:
            print("ERROR: Passwords do not match.", file=sys.stderr)
            sys.exit(1)

    try:
        provision_admin(
            email=email,
            password=password,
            full_name=args.fullname,
            workspace_id=args.workspace
        )
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
