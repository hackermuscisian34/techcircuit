#!/usr/bin/env python3
"""
TECHCIRCUIT / FIDELIS Backup and Disaster Recovery Utility.

Provides robust, consistent backup, verification, and restoration
for both the application database (SQLite / PostgreSQL) and asset storage.
"""

import argparse
import hashlib
import json
import os
import shutil
import sqlite3
import sys
import tarfile
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

# Add backend directory to sys.path so app config and models can be imported
PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.config import settings

def calculate_sha256(filepath: Path) -> str:
    """Calculate SHA256 hash of a file."""
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            sha.update(chunk)
    return sha.hexdigest()

def get_db_stats(db_path: Path) -> dict:
    """Extract table record counts for backup verification."""
    stats = {}
    if not db_path.exists():
        return stats

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    tables = [
        "workspaces", "users", "rulebooks", "rules", "facts",
        "brand_assets", "content_submissions", "audit_events", "audit_checkpoints"
    ]
    for table in tables:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            stats[table] = cursor.fetchone()[0]
        except Exception:
            stats[table] = 0
    conn.close()
    return stats

def backup_sqlite(src_db: Path, dest_db: Path):
    """Use SQLite online backup API to ensure a transactionally consistent copy."""
    src_conn = sqlite3.connect(str(src_db))
    dest_conn = sqlite3.connect(str(dest_db))
    with dest_conn:
        src_conn.backup(dest_conn)
    dest_conn.close()
    src_conn.close()

def create_backup(output_dir: Path, tag: str = "") -> Path:
    """Create a complete backup bundle of the database and asset storage."""
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    bundle_name = f"techcircuit_backup_{timestamp}"
    if tag:
        bundle_name += f"_{tag}"

    temp_dir = Path(tempfile.mkdtemp(prefix="fidelis_backup_"))
    try:
        staging_dir = temp_dir / bundle_name
        staging_dir.mkdir()

        # 1. Database backup
        db_url = settings.DATABASE_URL
        db_engine = "sqlite" if db_url.startswith("sqlite") else "postgresql"
        db_file_name = "database.sqlite"
        staging_db_path = staging_dir / db_file_name

        if db_engine == "sqlite":
            clean_path = db_url.replace("sqlite:///", "")
            source_db = (BACKEND_DIR / clean_path).resolve()
            if not source_db.exists():
                raise FileNotFoundError(f"Source database file not found at {source_db}")
            backup_sqlite(source_db, staging_db_path)
            db_stats = get_db_stats(staging_db_path)
        else:
            raise NotImplementedError("PostgreSQL pg_dump integration requires active PG container/env")

        # 2. Asset storage backup
        storage_src = Path(settings.STORAGE_DIR).resolve()
        staging_storage = staging_dir / "storage"
        staging_storage.mkdir()
        asset_count = 0
        asset_hashes = {}

        if storage_src.exists():
            for root, _, files in os.walk(storage_src):
                for file in files:
                    rel_path = Path(root).relative_to(storage_src) / file
                    dest_file = staging_storage / rel_path
                    dest_file.parent.mkdir(parents=True, exist_ok=True)
                    src_file = Path(root) / file
                    shutil.copy2(src_file, dest_file)
                    asset_count += 1
                    asset_hashes[str(rel_path)] = calculate_sha256(src_file)

        # 3. Create Manifest
        manifest = {
            "version": settings.VERSION,
            "project": settings.PROJECT_NAME,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "database_engine": db_engine,
            "database_file": db_file_name,
            "database_sha256": calculate_sha256(staging_db_path),
            "database_stats": db_stats,
            "asset_count": asset_count,
            "asset_hashes": asset_hashes,
        }

        manifest_path = staging_dir / "manifest.json"
        with open(manifest_path, "w") as f:
            json.dump(manifest, f, indent=2)

        # 4. Create compressed archive
        archive_path = output_dir / f"{bundle_name}.tar.gz"
        with tarfile.open(archive_path, "w:gz") as tar:
            tar.add(staging_dir, arcname=bundle_name)

        archive_sha = calculate_sha256(archive_path)
        sha_path = output_dir / f"{bundle_name}.tar.gz.sha256"
        with open(sha_path, "w") as f:
            f.write(f"{archive_sha}  {archive_path.name}\n")

        print(f"[SUCCESS] Backup bundle created successfully:")
        print(f"  Archive: {archive_path} ({archive_path.stat().st_size:,} bytes)")
        print(f"  SHA256:  {archive_sha}")
        print(f"  Records: {db_stats}")
        print(f"  Assets:  {asset_count} files")
        return archive_path
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

def verify_backup(archive_path: Path) -> dict:
    """Verify backup integrity, manifest format, database consistency, and checksums."""
    if not archive_path.exists():
        raise FileNotFoundError(f"Backup archive not found at {archive_path}")

    # Check sha256 sidecar file if available
    sha_file = archive_path.parent / f"{archive_path.name}.sha256"
    if sha_file.exists():
        expected_sha = sha_file.read_text().split()[0].strip()
        actual_sha = calculate_sha256(archive_path)
        if expected_sha != actual_sha:
            raise ValueError(f"Checksum mismatch! Expected: {expected_sha}, Got: {actual_sha}")

    temp_dir = Path(tempfile.mkdtemp(prefix="fidelis_verify_"))
    try:
        with tarfile.open(archive_path, "r:gz") as tar:
            tar.extractall(temp_dir)

        # Locate extracted bundle dir
        subdirs = [p for p in temp_dir.iterdir() if p.is_dir()]
        if not subdirs:
            raise ValueError("Malformed archive: no root directory")
        bundle_dir = subdirs[0]

        manifest_file = bundle_dir / "manifest.json"
        if not manifest_file.exists():
            raise ValueError("Malformed archive: manifest.json missing")

        with open(manifest_file, "r") as f:
            manifest = json.load(f)

        db_file = bundle_dir / manifest["database_file"]
        if not db_file.exists():
            raise ValueError("Database file missing in archive")

        actual_db_sha = calculate_sha256(db_file)
        if actual_db_sha != manifest["database_sha256"]:
            raise ValueError("Database file SHA256 does not match manifest!")

        # SQLite integrity check
        conn = sqlite3.connect(str(db_file))
        cursor = conn.cursor()
        cursor.execute("PRAGMA integrity_check")
        integrity = cursor.fetchone()[0]
        conn.close()
        if integrity != "ok":
            raise ValueError(f"SQLite integrity check failed: {integrity}")

        # Verify asset hashes
        storage_dir = bundle_dir / "storage"
        for rel_path_str, expected_hash in manifest.get("asset_hashes", {}).items():
            asset_path = storage_dir / rel_path_str
            if not asset_path.exists():
                raise ValueError(f"Missing asset in backup: {rel_path_str}")
            if calculate_sha256(asset_path) != expected_hash:
                raise ValueError(f"Corrupted asset checksum: {rel_path_str}")

        print(f"[VERIFIED] Archive {archive_path.name} is intact and cryptographically valid.")
        print(f"  Database records: {manifest['database_stats']}")
        print(f"  Assets verified: {len(manifest['asset_hashes'])}")
        return manifest
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

def restore_backup(archive_path: Path, target_db_path: Path = None, target_storage_dir: Path = None):
    """Restore database and asset storage from a verified backup archive."""
    manifest = verify_backup(archive_path)

    temp_dir = Path(tempfile.mkdtemp(prefix="fidelis_restore_"))
    try:
        with tarfile.open(archive_path, "r:gz") as tar:
            tar.extractall(temp_dir)

        bundle_dir = [p for p in temp_dir.iterdir() if p.is_dir()][0]

        # Determine target destinations
        if not target_db_path:
            clean_path = settings.DATABASE_URL.replace("sqlite:///", "")
            target_db_path = (BACKEND_DIR / clean_path).resolve()

        if not target_storage_dir:
            target_storage_dir = Path(settings.STORAGE_DIR).resolve()

        # Ensure directories exist
        target_db_path.parent.mkdir(parents=True, exist_ok=True)
        target_storage_dir.mkdir(parents=True, exist_ok=True)

        # Atomic copy for DB
        src_db = bundle_dir / manifest["database_file"]
        backup_sqlite(src_db, target_db_path)

        # Restore storage files
        src_storage = bundle_dir / "storage"
        if src_storage.exists():
            for root, _, files in os.walk(src_storage):
                for file in files:
                    rel_path = Path(root).relative_to(src_storage) / file
                    dest_file = target_storage_dir / rel_path
                    dest_file.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(Path(root) / file, dest_file)

        print(f"[SUCCESS] Restore completed successfully.")
        print(f"  Restored Database: {target_db_path}")
        print(f"  Restored Storage:  {target_storage_dir}")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

def test_cycle():
    """Execute end-to-end backup, verify, and mock restore into isolated temporary sandbox."""
    print("=== STARTING BACKUP & RESTORE RECOVERY DRILL ===")
    drill_dir = Path(tempfile.mkdtemp(prefix="fidelis_drill_"))
    try:
        # Step 1: Backup
        backup_archive = create_backup(output_dir=drill_dir, tag="drill")
        assert backup_archive.exists(), "Backup archive file was not generated"

        # Step 2: Verification
        manifest = verify_backup(backup_archive)
        assert manifest is not None, "Verification failed"

        # Step 3: Isolated Restore
        restore_db = drill_dir / "restored_canon.db"
        restore_storage = drill_dir / "restored_storage"
        restore_backup(backup_archive, target_db_path=restore_db, target_storage_dir=restore_storage)

        # Step 4: Validate restored contents
        assert restore_db.exists(), "Restored DB file not found"
        restored_stats = get_db_stats(restore_db)
        print(f"[DRILL RESULT] Restored DB stats: {restored_stats}")
        for k, v in manifest["database_stats"].items():
            assert restored_stats.get(k) == v, f"Count mismatch for {k}: expected {v}, got {restored_stats.get(k)}"

        print("=== BACKUP & RESTORE DRILL PASSED: 100% VERIFIED ===")
    finally:
        shutil.rmtree(drill_dir, ignore_errors=True)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CANON / FIDELIS Backup & Disaster Recovery Tool")
    subparsers = parser.add_subparsers(dest="action", required=True)

    backup_parser = subparsers.add_parser("backup", help="Create a complete backup bundle")
    backup_parser.add_argument("--output-dir", default=str(PROJECT_ROOT / "backups"), help="Directory to save backup archives")
    backup_parser.add_argument("--tag", default="", help="Optional label to append to backup filename")

    verify_parser = subparsers.add_parser("verify", help="Verify backup archive integrity")
    verify_parser.add_argument("--archive", required=True, help="Path to .tar.gz backup archive")

    restore_parser = subparsers.add_parser("restore", help="Restore database and asset storage from backup archive")
    restore_parser.add_argument("--archive", required=True, help="Path to .tar.gz backup archive")
    restore_parser.add_argument("--target-db", default=None, help="Optional override for target SQLite database path")
    restore_parser.add_argument("--target-storage", default=None, help="Optional override for target storage directory")

    drill_parser = subparsers.add_parser("test-cycle", help="Run end-to-end backup and restore test cycle in sandbox")

    args = parser.parse_args()

    if args.action == "backup":
        create_backup(Path(args.output_dir), args.tag)
    elif args.action == "verify":
        verify_backup(Path(args.archive))
    elif args.action == "restore":
        target_db = Path(args.target_db) if args.target_db else None
        target_storage = Path(args.target_storage) if args.target_storage else None
        restore_backup(Path(args.archive), target_db, target_storage)
    elif args.action == "test-cycle":
        test_cycle()
