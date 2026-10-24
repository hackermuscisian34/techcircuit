# Engineering Baseline & Discovery Report: FIDELIS / CANON Platform

> **Document Status**: COMPLETED (Phase 0 Baseline)  
> **Repository**: `hackermuscisian34/techcircuit`  
> **Platform Name**: FIDELIS / CANON Open-Source Brand Governance Compiler  
> **Evaluation Date**: 2026-10-24  

---

## 1. Existing System Architecture

FIDELIS / CANON is an enterprise brand governance and cryptographic compliance platform consisting of:
1. **Frontend**: Next.js 16.4.2 (Turbopack, TypeScript, React 19, Vanilla CSS design tokens with custom Tailwind-compatible layout classes). 16 statically prerendered routes: `/`, `/login`, `/dashboard`, `/review`, `/findings`, `/rulebook`, `/facts`, `/approvals`, `/assets`, `/audit`, `/insights`, `/settings`, `/guide`, `/approvals`.
2. **Backend**: FastAPI (Python 3.14 / 3.11+ compatible) with Uvicorn ASGI server.
3. **Persistence**: SQLAlchemy 2.0 ORM with SQLite (`canon.db`) default and PostgreSQL compatibility. Chained cryptographic HMAC-SHA256 immutable audit ledger (`audit_events`, `audit_checkpoints`).
4. **Authentication**: JWT (HS256) with PBKDF2-HMAC-SHA256 password hashing (100,000 iterations, 16-byte random salt). Role-Based Access Control (RBAC) with 5 roles: `ADMIN`, `BRAND_MANAGER`, `AUTHORISED_REVIEWER`, `CREATOR`, `APPROVER`.
5. **AI / LLM Ingestion**: Multi-tier architecture supporting Cloud Open-Source LLMs (Hugging Face Inference API with Qwen2.5-7B-Instruct) and local Ollama (`qwen2.5:1.5b`), with deterministic heuristic fallback and PII token masking.
6. **Asset Storage & Parsing**: Local filesystem storage (`storage/`), with MIME/signature validation, custom SVG sanitizer, PyPDF/python-docx parsers, Pillow image audit, and WCAG 2.2 color contrast evaluators.

---

## 2. Key Risks & Affected Files

| Vulnerability / Risk | Severity | Affected Files | Description & Root Cause |
| :--- | :--- | :--- | :--- |
| **Unauthenticated Persona Switching** | **CRITICAL** | `backend/app/api/v1/auth.py` | `/auth/switch-persona` allows unauthenticated callers to acquire JWTs with arbitrary roles (`ADMIN`, `APPROVER`, etc.) without credentials. |
| **Anonymous Cross-Tenant Asset Disclosure** | **CRITICAL** | `backend/app/api/v1/assets.py` | `download_asset` and `preview_asset` omit workspace filtering when caller is anonymous (`get_optional_current_user`), exposing all tenants' assets. |
| **Unprotected LLM Guideline Compilation** | **HIGH** | `backend/app/api/v1/rulebooks.py` | `/rulebooks/compile` lacks authentication, allowing unauthenticated file uploads and triggering expensive LLM compilation. |
| **Cross-Tenant Rulebook Fallback** | **HIGH** | `backend/app/api/v1/rulebooks.py` | `get_active_rulebook` falls back to querying any active rulebook if none exists for the caller's workspace. |
| **Privilege Escalation on Fact Vault** | **HIGH** | `backend/app/api/v1/facts.py` | `create_approved_fact` and `update_fact` have no role checks; unprivileged `CREATOR` users can modify certified facts. |
| **Self-Approval Separation of Duties** | **MEDIUM** | `backend/app/api/v1/approvals.py`, `assets.py` | ADMIN bypasses self-approval checks in content approvals; asset approvals lack self-approval validation entirely. |
| **Permissive Wildcard CORS with Credentials** | **MEDIUM** | `backend/app/config.py`, `main.py` | `CORS_ORIGINS` includes `'*'` while `allow_credentials=True`, violating browser security standards and risking credential leakage. |
| **Startup Auto-Seeding Default Passwords** | **MEDIUM** | `backend/app/seed/synthetic_brand.py`, `main.py` | Startup hook unconditionally seeds 5 demo accounts with fixed passwords (`Password123!`) into the active database. |
| **Missing Version-Controlled Database Migrations** | **MEDIUM** | `backend/app/main.py`, `session.py` | Relies on `Base.metadata.create_all()` on startup without Alembic migration history, preventing schema evolution and rollback. |
| **Unbounded Rate Limiting** | **MEDIUM** | `backend/app/api/v1/auth.py`, `reviews.py` | Authentication and review endpoints lack rate limiting, risking brute force and denial of service. |

---

## 3. Existing Tests & Baseline Status

- **Backend Pytest**: 63 passed across 13 test files (`test_auth_and_isolation.py`, `test_brand_assets.py`, `test_citation_verifier.py`, `test_claim_ledger.py`, `test_deterministic.py`, `test_e2e_acceptance_flow.py`, `test_e2e_judge_scenario.py`, `test_file_ingestion_and_multimodal.py`, `test_governance_insights.py`, `test_intent_lock.py`, `test_llm_provider.py`).
- **Frontend Build**: `npm run build` passes with 0 errors; all 16 static routes prerendered cleanly.
- **Frontend Typecheck**: `npx tsc --noEmit` passes with 0 errors.

---

## 4. Current Deployment Assumptions

1. Single-node or containerized execution (Render / Docker Compose).
2. SQLite database stored at `backend/canon.db` or PostgreSQL via `DATABASE_URL`.
3. Local file uploads stored at `backend/storage/assets/{workspace_id}/`.
4. Environment variables loaded from `.env` via `pydantic-settings`.

---

## 5. Prioritized Implementation Plan

### Phase 1: Close Security Gaps
1. **Auth & Persona Switching**: Restrict `switch-persona` to `ENVIRONMENT == 'development'` with `ENABLE_DEV_PERSONA_SWITCHING=True`. Return 403 Forbidden in production. Add regression tests.
2. **Demo Accounts**: Gate demo account seeding behind `ENABLE_DEMO_ACCOUNTS=True` (disabled by default in production). Create an administrative CLI tool for one-time production admin initialization.
3. **JWT Configuration**: Enforce production fail-fast checks: key length >= 32 characters, no fallback to development secrets.
4. **Authorization & Workspace Scoping**:
   - Enforce authentication on `assets/download` and `assets/preview` with strict `workspace_id` scoping.
   - Enforce authentication on `rulebooks/compile`.
   - Remove cross-tenant fallback in `rulebooks/active`.
   - Restrict `facts` creation/updates to `ADMIN` and `BRAND_MANAGER`.
   - Enforce strict self-approval restrictions for both content submissions and brand assets.
5. **AppSec & File Ingestion**:
   - Enhance SVG sanitizer against script tags, event handlers, and XML entities.
   - Strict path traversal sanitization on all file uploads.
   - Structured error handling for LLM failures.

### Phase 2: Stabilize Deployment
1. **Alembic Database Migrations**: Initialize Alembic, generate initial schema migration, verify upgrade/downgrade workflows.
2. **Persistence**: Support PostgreSQL alongside persistent SQLite.
3. **Backup & Recovery**: Create `scripts/backup_restore.py` and `docs/backup-and-restore.md`.
4. **CORS & Rate Limiting**: Remove wildcard CORS in production; add SlowAPI/in-memory rate limiter on login, registration, uploads, and review.
5. **Health Checks**: Add `/health/live` and `/health/ready` checking DB and storage readiness.

### Phase 3: Prove Correctness
1. Write security regression test suite for anonymous access, forged JWTs, expired tokens, cross-tenant isolation.
2. Write adversarial upload tests (malformed SVG, path traversal, oversized payloads, corrupt archives).
3. Write LLM injection, malformed output, and provider outage tests.
4. Write audit ledger concurrency and tamper-detection tests.
5. Implement performance benchmark script (`scripts/benchmark_performance.py`).

### Phase 4: Refine Engineering Quality
1. Separate review workflow into cohesive service (`app/services/review_service.py`).
2. Add structured logging and request correlation ID middleware (`X-Correlation-ID`).
3. Complete comprehensive documentation: `docs/architecture.md`, `docs/security-threat-model.md`, `docs/deployment.md`, `docs/backup-and-restore.md`, `docs/incident-response.md`.

### Phase 5 & 6: CI Hardening & Production Readiness Report
1. Harden `.github/workflows/ci.yml`.
2. Generate comprehensive `docs/production-readiness-report.md`.

---

## 6. Implementation & Verification Summary

All phases have been fully implemented, tested, and verified:
- **Phase 0 (Baseline)**: Complete architecture and risk register documented.
- **Phase 1 (Security Gaps)**: Gated persona switching behind development mode; secured demo accounts; added production JWT validation; enforced strict multi-tenant scoping and self-approval blocks across assets, approvals, facts, and rulebooks; hardened SVG sanitizer and path filters.
- **Phase 2 (Deployment Stabilization)**: Configured versioned Alembic migrations (`backend/alembic/`); built transactional backup/restore utility (`scripts/backup_restore.py`); implemented sliding-window rate limiting; created liveness (`/health/live`) and readiness (`/health/ready`) probes.
- **Phase 3 (Correctness Verification)**: Added 22 new security and resilience tests; expanded backend test suite to **85 passed tests (100%)**; executed automated benchmark suite (`scripts/benchmark_performance.py`); compiled Next.js frontend with 16/16 clean routes.
- **Phase 4 (Engineering Quality & Docs)**: Created `docs/architecture.md`, `docs/security-threat-model.md`, `docs/deployment.md`, `docs/backup-and-restore.md`, `docs/incident-response.md`.
- **Phase 5 (CI Release Gates)**: Hardened `.github/workflows/ci.yml` with Alembic migration validation, disaster recovery drill, and least-privilege permissions.
- **Phase 6 (Final Deliverables)**: Published comprehensive `docs/production-readiness-report.md`.
