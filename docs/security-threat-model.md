# Security Threat Model & Risk Analysis: CANON / FIDELIS

## 1. Scope & Objective

This document defines the formal threat model for the CANON / FIDELIS application. It applies STRIDE methodology to evaluate threat actors, attack vectors, mitigations, and residual risks across the platform.

---

## 2. Threat Actor Profiles

| Threat Actor | Motivation | Capabilities | Target Assets |
| :--- | :--- | :--- | :--- |
| **Anonymous External Attacker** | Data theft, disruption, unauthorized access | Unauthenticated web requests, forged tokens, malformed payloads | Database, user credentials, brand guidelines, API availability |
| **Malicious Authenticated Creator** | Exceed authority, self-approve non-compliant promotional copy | Authenticated JWT with `CREATOR` role | Content approval queue, audit chain, fact vault |
| **Rogue Reviewer / Approver** | Sabotage brand reputation, falsify compliance | Authenticated JWT with `APPROVER` or `AUTHORISED_REVIEWER` role | Approval decisions, audit records, fact definitions |
| **Hostile Content Author (Prompt Injector)** | Hijack LLM pipeline, override brand rules, exfiltrate internal data | Promotional copy containing adversarial prompt directives | Review engine, LLM inference prompt context |
| **Cross-Tenant Competitor** | Industrial espionage, viewing competitor rulebooks/assets | Valid credentials in a separate workspace | Competitor assets, draft submissions, unreleased facts |

---

## 3. STRIDE Threat Analysis & Defense Controls

### 3.1 Spoofing Identity
- **Threat**: Forging JWT tokens or calling `/auth/switch-persona` to assume an administrator identity.
- **Controls**:
  - `switch-persona` is strictly gated behind `ENVIRONMENT == 'development'` and `ENABLE_DEV_PERSONA_SWITCHING == True`. Outside development, it fails closed with `403 Forbidden`.
  - Production fails fast at startup if `SECRET_KEY` is missing, shorter than 32 characters, or identical to development defaults.
  - JWTs require HS256 cryptographic signatures with strictly validated expiration (`exp`), subject (`sub`), role, and `workspace_id`.
  - Regression tests verify forged signatures, expired tokens, and missing claims are rejected with `401 Unauthorized`.

### 3.2 Tampering with Data
- **Threat**: Altering audit events, modifying approved facts, or falsifying review receipts.
- **Controls**:
  - Audit events are chained via SHA-256: each event's `prev_event_hash` references the predecessor's hash.
  - Periodic audit checkpoints are signed with HMAC-SHA256.
  - Modification of past audit records causes chain verification to fail with precise identification of the tampered block ID.
  - Fact vault modification (`PUT`, `DELETE`) is restricted to `ADMIN` and `BRAND_MANAGER` roles and logged to the audit ledger.

### 3.3 Repudiation
- **Threat**: An approver denies approving a misleading claim, or a creator denies submitting copyright-infringing content.
- **Controls**:
  - Every approval and review event records actor ID, actor role, submission content hash, timestamp, and client correlation ID in the tamper-evident ledger.
  - Dual custody prevents creators from approving their own work.

### 3.4 Information Disclosure
- **Threat**: Cross-tenant data leakage (accessing competitor submissions, rulebooks, or brand assets); directory traversal via file uploads.
- **Controls**:
  - Multi-tenant scoping: all queries enforce `workspace_id == current_user.workspace_id`.
  - Cross-tenant requests return `404 Not Found` rather than `403 Forbidden` to prevent resource enumeration.
  - Path traversal is eliminated by `FilenameFilter.clean()` and `StorageLocator.resolve_destination()`.
  - Production error responses redact stack traces and database internals.

### 3.5 Denial of Service (DoS)
- **Threat**: Uploading decompression bombs (zip/image bombs), oversized documents, or flooding review/auth endpoints.
- **Controls**:
  - Sliding-window rate limiter throttles authentication (20 req/min), reviews (40 req/min), and uploads (30 req/min).
  - Maximum upload limits enforced at the stream level (`MAX_UPLOAD_SIZE_MB = 15MB`, `MAX_ASSET_UPLOAD_SIZE_MB = 25MB`).
  - Image dimension verification and parser timeouts prevent memory exhaustion.

### 3.6 Elevation of Privilege
- **Threat**: A regular user registers with `role: "ADMIN"`, or sends a PUT request to upgrade their own role.
- **Controls**:
  - Public registration forces `role = "CREATOR"` regardless of client input.
  - Role upgrades via `/api/v1/auth/users/{id}/role` require authenticated `ADMIN` role.
  - Server-side role checks (`require_roles(...)`) guard all sensitive endpoints.

---

## 4. Role-Based Access Control (RBAC) Matrix

| Endpoint / Operation | CREATOR | AUTHORISED_REVIEWER | APPROVER | BRAND_MANAGER | ADMIN |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Run Content Review (`POST /reviews/run`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| List Submissions (`GET /reviews/submissions`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Approvals Queue (`GET /approvals/queue`) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Approve / Reject Submission (`POST /approvals/{id}`) | ❌ | ❌ | ✅ (non-author) | ✅ (non-author) | ✅ (non-author) |
| Upload Brand Asset (`POST /assets/upload`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Approve Brand Asset (`PUT /assets/{id}/status`) | ❌ | ❌ | ❌ | ✅ (non-uploader) | ✅ (non-uploader) |
| Extract Facts (`POST /facts/extract`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Certified Fact (`POST /facts`) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Modify / Delete Fact (`PUT/DELETE /facts/{id}`) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Publish Rulebook (`POST /rulebooks/publish`) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Change User Roles (`PUT /auth/users/{id}/role`) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Verify Audit Ledger (`GET /audit/verify`) | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 5. Residual Risks & Ongoing Mitigations

1. **Adversarial LLM Prompt Injection**:
   - *Risk*: A sophisticated prompt injection might influence the text tone suggestions generated by the LLM.
   - *Mitigation*: The LLM is strictly advisory. It cannot alter database state, change verdict severities, approve content, or disable deterministic rules.
2. **Database Administrator Tampering**:
   - *Risk*: An attacker with direct physical access to the SQLite database file could recompute the entire hash chain from genesis.
   - *Mitigation*: HMAC checkpoints signed with an external secret stored in environment variables detect unauthorized chain recreation. In high-assurance environments, checkpoints should be mirrored to immutable append-only object storage (S3 Object Lock).
