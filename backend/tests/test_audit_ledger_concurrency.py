import concurrent.futures
import pytest
from app.core.audit_chain import record_audit_event, verify_audit_chain, create_audit_checkpoint
from app.db.models import AuditEvent, AuditCheckpoint
from app.seed.synthetic_brand import WORKSPACE_ID

def test_concurrent_multithreaded_audit_appends(db_session):
    total_threads = 10
    events_per_thread = 2

    def append_events(thread_idx: int):
        for step in range(events_per_thread):
            record_audit_event(
                db=db_session,
                workspace_id=WORKSPACE_ID,
                event_type="CONCURRENT_BENCHMARK",
                actor_id=f"worker-{thread_idx}",
                actor_role="CREATOR",
                details={"thread": thread_idx, "step": step}
            )

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(append_events, i) for i in range(total_threads)]
        for f in concurrent.futures.as_completed(futures):
            f.result()

    verification = verify_audit_chain(db_session, WORKSPACE_ID)
    assert verification["is_valid"] is True
    assert verification["broken_event_id"] is None
    assert verification["total_events"] >= total_threads * events_per_thread

def test_tampered_predecessor_hash_detected(db_session):
    ev1 = record_audit_event(
        db=db_session,
        workspace_id=WORKSPACE_ID,
        event_type="ACTION_ONE",
        actor_id="usr-test-01",
        actor_role="APPROVER",
        details={"status": "step1"}
    )
    ev2 = record_audit_event(
        db=db_session,
        workspace_id=WORKSPACE_ID,
        event_type="ACTION_TWO",
        actor_id="usr-test-01",
        actor_role="APPROVER",
        details={"status": "step2"}
    )

    # Tamper with ev2's predecessor hash (non-genesis hash to avoid unique constraint collision)
    ev2.prev_event_hash = "f" * 64
    db_session.commit()

    verification = verify_audit_chain(db_session, WORKSPACE_ID)
    assert verification["is_valid"] is False
    assert verification["broken_event_id"] == ev2.id
    assert "Broken chain link" in verification["message"]

def test_tampered_checkpoint_signature_detected(db_session):
    record_audit_event(
        db=db_session,
        workspace_id=WORKSPACE_ID,
        event_type="PRE_CHECKPOINT",
        actor_id="usr-test-01",
        actor_role="ADMIN",
        details={"audit": "ready"}
    )
    checkpoint = create_audit_checkpoint(db_session, WORKSPACE_ID)
    assert checkpoint.checkpoint_signature is not None

    # Tamper with checkpoint signature
    checkpoint.checkpoint_signature = "bad" + checkpoint.checkpoint_signature[3:]
    db_session.commit()

    verification = verify_audit_chain(db_session, WORKSPACE_ID)
    assert verification["is_valid"] is False
    assert "Tampered checkpoint detected" in verification["message"]
