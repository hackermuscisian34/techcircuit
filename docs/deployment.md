# Production Deployment Guide: CANON / FIDELIS

## 1. Overview

This guide provides instructions for deploying CANON / FIDELIS in a production environment with secure defaults, persistent storage, cryptographic secret management, and health observability.

---

## 2. Prerequisites

- **Operating System**: Linux (Ubuntu 22.04 LTS / Debian 12 recommended)
- **Runtimes**:
  - Python 3.12+ (or Python 3.14)
  - Node.js 20+ LTS
- **Database**:
  - SQLite (with persistent volume mount) or PostgreSQL 15+
- **Reverse Proxy**: Caddy 2 or Nginx with TLS termination

---

## 3. Production Configuration Checklist

Create `/backend/.env` with production settings:

```bash
# 1. Generate a 256-bit URL-safe secret
python scripts/generate_secret.py
```

Sample `/backend/.env`:
```ini
ENVIRONMENT=production
PROJECT_NAME="CANON / FIDELIS"
VERSION="1.0.0"

# Security Secrets (Generated with scripts/generate_secret.py)
SECRET_KEY="<YOUR_GENERATED_64_CHAR_SECRET_KEY>"
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Strictly disable development conveniences in production
ENABLE_DEV_PERSONA_SWITCHING=false
ENABLE_DEMO_ACCOUNTS=false

# Allowed Frontend Origins (NEVER use '*' with credentials)
CORS_ORIGINS=["https://brand.yourdomain.com"]

# Database & Storage
DATABASE_URL=sqlite:///./canon.db
STORAGE_DIR=/var/lib/fidelis/storage

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_AUTH_PER_MINUTE=20
RATE_LIMIT_REVIEWS_PER_MINUTE=40
RATE_LIMIT_UPLOADS_PER_MINUTE=30
RATE_LIMIT_DEFAULT_PER_MINUTE=150
```

---

## 4. Database Initialization & Alembic Migrations

Never rely on automatic table creation in production. Use Alembic versioned migrations:

```bash
cd backend

# Apply all database migrations to the latest head
.venv/bin/alembic upgrade head

# Verify migration status
.venv/bin/alembic current
```

---

## 5. Initial Administrator Provisioning

Do not use default or hardcoded demo credentials in production. Provision the primary administrator account using the secure CLI provisioning tool:

```bash
# Run administrator provisioning
python scripts/provision_admin.py \
  --email "security-admin@yourdomain.com" \
  --full-name "Primary System Administrator" \
  --workspace-id "ws-enterprise-001" \
  --workspace-name "Enterprise Brand Workspace"
```

The tool enforces password complexity (minimum 12 characters, uppercase, lowercase, numbers, and symbols) and logs the provisioning event to the cryptographic audit chain.

---

## 6. Starting Services

### 6.1 Backend Service
Run Uvicorn with multiple workers behind a reverse proxy:

```bash
cd backend
.venv/bin/uvicorn app.main:app \
  --host 127.0.0.1 \
  --port 8000 \
  --workers 4 \
  --proxy-headers \
  --forwarded-allow-ips="127.0.0.1"
```

### 6.2 Frontend Service
Build and run the Next.js production server:

```bash
cd frontend
npm ci
npm run build
npm run start -- -p 3000
```

---

## 7. Health Checks & Monitoring

Configure container orchestrator (Docker / Kubernetes / Systemd) probes:

| Probe | Endpoint | Expected Status | Purpose |
| :--- | :--- | :---: | :--- |
| **Liveness** | `GET http://127.0.0.1:8000/health/live` | `200 OK` | Process responsiveness check |
| **Readiness** | `GET http://127.0.0.1:8000/health/ready` | `200 OK` | Database connection & storage directory write verification |
| **Diagnostic** | `GET http://127.0.0.1:8000/health` | `200 OK` | Active model provider status |

---

## 8. Reverse Proxy Configuration (Caddyfile Example)

```caddyfile
brand.yourdomain.com {
    tls internal_or_acme_email@yourdomain.com

    # Security Headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    # Backend API routes
    handle /api/* {
        reverse_proxy 127.0.0.1:8000
    }

    # Health check routes
    handle /health* {
        reverse_proxy 127.0.0.1:8000
    }

    # Frontend Application
    handle {
        reverse_proxy 127.0.0.1:3000
    }
}
```
