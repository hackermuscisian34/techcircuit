# Security Incident Response & Secret Rotation Playbook: CANON / FIDELIS

## 1. Incident Classification

| Severity | Definition | Examples | Response SLA |
| :--- | :--- | :--- | :---: |
| **SEV-1 (Critical)** | Compromise of system secrets, active tenant data breach, root administrator takeover | Leaked `SECRET_KEY`, cross-tenant data exfiltration, database compromise | **Immediate (< 15 min)** |
| **SEV-2 (Major)** | Compromise of an individual user account, denial of service, broken audit ledger chain | Creator credential theft, audit hash link invalidation, parser crash loop | **< 1 hour** |
| **SEV-3 (Moderate)** | Malicious upload attempt quarantined, single rate limit breach, suspicious prompt injection | Blocked SVG with hostile payload, brute-force login attempts detected | **< 4 hours** |
| **SEV-4 (Low)** | Minor misconfiguration without active exploitation | Insecure development flag on in staging, outdated documentation | **< 24 hours** |

---

## 2. Containment & Remediation Playbooks

### 2.1 Playbook A: Compromised `SECRET_KEY` (JWT Master Key)

If the production `SECRET_KEY` is suspected to be exposed:

1. **Generate New Secret**:
   ```bash
   python scripts/generate_secret.py
   ```
2. **Update Environment**:
   Update `SECRET_KEY` in `/backend/.env`.
3. **Restart Backend Service**:
   ```bash
   systemctl restart fidelis-backend
   ```
4. **Impact Assessment**:
   All outstanding user JWT tokens are immediately invalidated. Users must re-authenticate.
5. **Audit Checkpoints**:
   Re-sign audit checkpoints using the new master key to establish the new cryptographic seal.

### 2.2 Playbook B: Compromised User or Admin Account

1. **Deactivate User Immediately**:
   Connect to database or use admin API to set `is_active = False`:
   ```sql
   UPDATE users SET is_active = 0 WHERE email = 'compromised@yourdomain.com';
   ```
2. **Revoke Active Tokens**:
   Rotate `SECRET_KEY` if an administrator token was stolen, or revoke the user's sessions.
3. **Audit History Inspection**:
   Query all actions taken by the compromised actor ID:
   ```bash
   # Inspect audit ledger for actor
   sqlite3 backend/canon.db "SELECT id, sequence_number, event_type, details, created_at FROM audit_events WHERE actor_id = '<ACTOR_ID>' ORDER BY sequence_number DESC;"
   ```
4. **Reset Password with Complexity**:
   Generate a new strong password and update the user record using bcrypt hashing.

### 2.3 Playbook C: Audit Ledger Break / Tampering Detection

If `/api/v1/audit/verify` reports `is_valid: False`:

1. **Capture Diagnostic Output**:
   ```bash
   curl -s -H "Authorization: Bearer <ADMIN_TOKEN>" http://127.0.0.1:8000/api/v1/audit/verify | jq .
   ```
   Example output:
   ```json
   {
     "is_valid": false,
     "broken_event_id": "evt-77281",
     "message": "Broken chain link at block 42. Expected prev 8e7a..., got ffff..."
   }
   ```
2. **Isolate Database**:
   Immediately take an atomic snapshot of `canon.db` for forensic analysis.
3. **Forensic Analysis**:
   Inspect block `42` and block `41` to examine the modified payload or sequence divergence.
4. **Restore to Verified Snapshot**:
   If unauthorized tampering occurred, restore to the last verified backup bundle:
   ```bash
   python scripts/backup_restore.py restore --archive ./backups/<LAST_VERIFIED_BACKUP>.tar.gz
   ```

### 2.4 Playbook D: Hostile or Malicious Upload Ingestion

1. **Locate Quarantined File**:
   Search `storage/` directory for the affected asset ID.
2. **Verify Storage Containment**:
   Confirm that the file was sanitized (for SVG) or blocked by `SignatureVerifier` before execution.
3. **Purge Malicious Record**:
   Delete the database record and unlink the file:
   ```bash
   rm -f storage/assets/<WORKSPACE>/<ASSET_ID>_*
   ```
4. **Log Incident to Audit Ledger**:
   Record a security incident event in the audit trail.

---

## 3. Post-Incident Review & RCA Template

Within 48 hours of resolving any SEV-1 or SEV-2 incident, publish an RCA report including:
- **Timeline**: Discovery timestamp, containment timestamp, resolution timestamp.
- **Root Cause**: Specific software vulnerability, misconfiguration, or credential leak.
- **Data Impact**: Affected workspaces, users, documents, or audit records.
- **Corrective Actions**: New regression tests added, configuration changes deployed.
