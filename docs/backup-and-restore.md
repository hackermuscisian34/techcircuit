# Backup, Verification & Disaster Recovery Guide: CANON / FIDELIS

## 1. Overview & Objectives

In CANON / FIDELIS, persistence spans two tightly-coupled subsystems:
1. **Application Database**: Users, workspaces, compiled rulebooks, approved facts, submissions, approval decisions, and cryptographic audit ledgers.
2. **Asset Storage Directory (`storage/`)**: Uploaded logos, vector SVGs, font files, color palettes, and signed compliance receipts.

To prevent orphan assets or broken audit chains, backups must be **transactionally synchronized, cryptographically verified, and reproducibly restorable**.

- **Recovery Point Objective (RPO)**: < 1 hour (via automated hourly snapshots).
- **Recovery Time Objective (RTO)**: < 15 minutes to fully restore database and assets.

---

## 2. The Disaster Recovery Utility (`scripts/backup_restore.py`)

A unified CLI utility is provided in `scripts/backup_restore.py` to automate backup creation, manifest hashing, SQLite online snapshotting, integrity verification, and restoration.

### 2.1 Backup Structure
Each backup bundle is a compressed archive (`.tar.gz`) containing:
- `database.sqlite`: Online transactionally-consistent snapshot of SQLite database.
- `storage/`: Exact mirror of the asset filesystem.
- `manifest.json`: Metadata manifest containing app version, database engine, timestamp, table record counts, and SHA256 checksums of all database and asset files.
- `<bundle>.tar.gz.sha256`: Cryptographic checksum sidecar file.

---

## 3. Operational Procedures

### 3.1 Creating a Backup
```bash
# Generate a complete backup in ./backups/
python scripts/backup_restore.py backup --output-dir ./backups --tag "daily"
```

Example output:
```text
[SUCCESS] Backup bundle created successfully:
  Archive: ./backups/techcircuit_backup_20261024_003019_daily.tar.gz (26,495 bytes)
  SHA256:  67bf1cafbec8b034f6ed64383706ac83742b64577a0e5f9f748536dfbadf6f98
  Records: {'workspaces': 1, 'users': 5, 'rulebooks': 1, 'rules': 8, 'facts': 13, ...}
  Assets:  96 files
```

### 3.2 Verifying an Existing Backup Archive
Before relying on any backup, verify its cryptographic integrity without touching live data:

```bash
python scripts/backup_restore.py verify \
  --archive ./backups/techcircuit_backup_20261024_003019_daily.tar.gz
```

The verification process:
1. Validates the archive checksum against the `.sha256` sidecar file.
2. Unpacks the archive in an isolated temporary sandbox.
3. Performs a SQLite `PRAGMA integrity_check`.
4. Re-hashes every asset file and validates against the manifest hashes.

### 3.3 Restoring from Backup
To restore database and asset storage from a verified archive:

```bash
# Restore to configured settings destination
python scripts/backup_restore.py restore \
  --archive ./backups/techcircuit_backup_20261024_003019_daily.tar.gz

# Or restore to custom staging destination
python scripts/backup_restore.py restore \
  --archive ./backups/techcircuit_backup_20261024_003019_daily.tar.gz \
  --target-db ./restored_canon.db \
  --target-storage ./restored_storage
```

### 3.4 Automated Disaster Recovery Drill
To test the complete lifecycle (backup, verify, sandbox restore, record count validation, and cleanup) run:

```bash
python scripts/backup_restore.py test-cycle
```

Expected output:
```text
=== STARTING BACKUP & RESTORE RECOVERY DRILL ===
[SUCCESS] Backup bundle created successfully
[VERIFIED] Archive is intact and cryptographically valid
[SUCCESS] Restore completed successfully
[DRILL RESULT] Restored DB stats: {...}
=== BACKUP & RESTORE DRILL PASSED: 100% VERIFIED ===
```

---

## 4. Backup Retention & Storage Best Practices

1. **Local Disk**: Keep 7 daily backups locally on the application host.
2. **Offsite Replicated Storage**: Mirror all `.tar.gz` and `.sha256` files to encrypted, immutable cloud storage (e.g., AWS S3 with Object Lock or GCP Cloud Storage with Bucket Lock).
3. **Encryption**: In transit (TLS) and at rest (AES-256 or GPG encryption before upload).
4. **Scheduled Cron**: Schedule backups via system cron:
   ```cron
   0 * * * * cd /opt/techcircuit && python scripts/backup_restore.py backup --output-dir /var/backups/fidelis >> /var/log/fidelis_backup.log 2>&1
   ```
