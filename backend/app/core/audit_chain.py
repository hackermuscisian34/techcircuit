import hashlib
import hmac
import json
import threading
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.db.models import AuditEvent, ReviewReceipt, AuditCheckpoint
from app.config import settings
GENESIS_PREV_HASH = '0' * 64
_MUTEX = threading.RLock()

class LedgerDigest:

    @staticmethod
    def sha256_hex(blob: str) -> str:
        return hashlib.sha256(blob.encode('utf-8')).hexdigest()

    @staticmethod
    def canonical_json(data: Any) -> str:
        return json.dumps(data, sort_keys=True, separators=(',', ':'), default=str)

    @classmethod
    def block_digest(cls, prior: str, operator: str, action: str, body_hash: str, stamp: str) -> str:
        composite = f'{prior}:{operator}:{action}:{body_hash}:{stamp}'
        return cls.sha256_hex(composite)

    @staticmethod
    def hmac_signature(secret_key: str, message: bytes) -> str:
        return hmac.new(secret_key.encode('utf-8'), message, hashlib.sha256).hexdigest()

class ChainAuditor:

    @staticmethod
    def inspect_block(prior_expected: str, event_node: AuditEvent) -> Optional[str]:
        if event_node.prev_event_hash != prior_expected:
            return f'Broken chain link at block {event_node.sequence_number}. Expected prev {prior_expected}, got {event_node.prev_event_hash}.'
        canon_hash = LedgerDigest.sha256_hex(LedgerDigest.canonical_json(event_node.details))
        std_hash = LedgerDigest.sha256_hex(json.dumps(event_node.details, sort_keys=True, default=str))
        if event_node.payload_hash not in (canon_hash, std_hash):
            return f'Tampered payload detected at block {event_node.sequence_number}.'
        epoch = event_node.timestamp_str if hasattr(event_node, 'timestamp_str') and event_node.timestamp_str else event_node.created_at.isoformat()
        recomputed = LedgerDigest.block_digest(prior_expected, event_node.actor_id, event_node.event_type, event_node.payload_hash, epoch)
        if recomputed != event_node.current_event_hash:
            return f'Invalid signature/hash at block {event_node.sequence_number}.'
        return None

    @classmethod
    def audit_ledger(cls, session: Session, tenant_id: str) -> Dict[str, Any]:
        records = session.query(AuditEvent).filter(AuditEvent.workspace_id == tenant_id).order_by(AuditEvent.sequence_number.asc(), AuditEvent.created_at.asc()).all()
        total = len(records)
        if total == 0:
            return {'is_valid': True, 'total_events': 0, 'verified_events': 0, 'broken_event_id': None, 'message': 'Audit chain is empty. Clean state.'}
        cursor_hash = GENESIS_PREV_HASH
        idx = 0
        while idx < total:
            target = records[idx]
            fault = cls.inspect_block(cursor_hash, target)
            if fault:
                return {'is_valid': False, 'total_events': total, 'verified_events': idx, 'broken_event_id': target.id, 'message': fault}
            cursor_hash = target.current_event_hash
            idx += 1
        checkpoints = session.query(AuditCheckpoint).filter(AuditCheckpoint.workspace_id == tenant_id).order_by(AuditCheckpoint.sequence_number.desc()).all()
        for cp in checkpoints:
            packet = f'{tenant_id}:{cp.sequence_number}:{cp.block_count}:{cp.head_hash}'.encode('utf-8')
            valid_sig = LedgerDigest.hmac_signature(settings.SECRET_KEY, packet)
            if not hmac.compare_digest(cp.checkpoint_signature, valid_sig):
                return {'is_valid': False, 'total_events': total, 'verified_events': total, 'broken_event_id': None, 'message': f'Tampered checkpoint detected: invalid checkpoint signature for #{cp.sequence_number}.'}
            if total < cp.block_count:
                return {'is_valid': False, 'total_events': total, 'verified_events': total, 'broken_event_id': None, 'message': f'Ledger truncation detected! Recorded {total} events, but signed checkpoint certified {cp.block_count} blocks.'}
        return {'is_valid': True, 'total_events': total, 'verified_events': total, 'broken_event_id': None, 'message': f'Audit chain verified successfully. All {total} cryptographic blocks intact.'}

def calculate_sha256(text: str) -> str:
    return LedgerDigest.sha256_hex(text)

def canonical_json_dumps(obj: Any) -> str:
    return LedgerDigest.canonical_json(obj)

def calculate_event_hash(prev_hash: str, actor_id: str, event_type: str, payload_hash: str, timestamp_iso: str) -> str:
    return LedgerDigest.block_digest(prev_hash, actor_id, event_type, payload_hash, timestamp_iso)

def record_audit_event(db: Session, workspace_id: str, event_type: str, actor_id: str, actor_role: str, details: Dict[str, Any]) -> AuditEvent:
    with _MUTEX:
        ancestor = db.query(AuditEvent).filter(AuditEvent.workspace_id == workspace_id).order_by(AuditEvent.sequence_number.desc(), AuditEvent.created_at.desc()).first()
        antecedent_hash = ancestor.current_event_hash if ancestor else GENESIS_PREV_HASH
        seq_idx = ancestor.sequence_number + 1 if ancestor and ancestor.sequence_number else db.query(AuditEvent).filter(AuditEvent.workspace_id == workspace_id).count() + 1
        body_str = LedgerDigest.canonical_json(details)
        body_digest = LedgerDigest.sha256_hex(body_str)
        current_time = datetime.now(timezone.utc)
        iso_mark = current_time.isoformat()
        current_hash = LedgerDigest.block_digest(antecedent_hash, actor_id, event_type, body_digest, iso_mark)
        record = AuditEvent(workspace_id=workspace_id, sequence_number=seq_idx, event_type=event_type, actor_id=actor_id, actor_role=actor_role, payload_hash=body_digest, prev_event_hash=antecedent_hash, current_event_hash=current_hash, timestamp_str=iso_mark, details=details, created_at=current_time)
        db.add(record)
        try:
            db.commit()
            db.refresh(record)
        except IntegrityError:
            db.rollback()
            raise RuntimeError(f"Concurrent chain append conflict detected in workspace '{workspace_id}'.")
        return record

def create_audit_checkpoint(db: Session, workspace_id: str) -> AuditCheckpoint:
    with _MUTEX:
        tip = db.query(AuditEvent).filter(AuditEvent.workspace_id == workspace_id).order_by(AuditEvent.sequence_number.desc()).first()
        if not tip:
            raise ValueError(f"Cannot create checkpoint on empty audit chain in workspace '{workspace_id}'.")
        tally = db.query(AuditEvent).filter(AuditEvent.workspace_id == workspace_id).count()
        preceding_cp = db.query(AuditCheckpoint).filter(AuditCheckpoint.workspace_id == workspace_id).order_by(AuditCheckpoint.sequence_number.desc()).first()
        cp_seq = preceding_cp.sequence_number + 1 if preceding_cp else 1
        payload = f'{workspace_id}:{cp_seq}:{tally}:{tip.current_event_hash}'.encode('utf-8')
        sig = LedgerDigest.hmac_signature(settings.SECRET_KEY, payload)
        entry = AuditCheckpoint(workspace_id=workspace_id, sequence_number=cp_seq, block_count=tally, head_hash=tip.current_event_hash, checkpoint_signature=sig, created_at=datetime.now(timezone.utc))
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry

def verify_audit_chain(db: Session, workspace_id: str) -> Dict[str, Any]:
    return ChainAuditor.audit_ledger(db, workspace_id)
