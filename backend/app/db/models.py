from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Text, Integer, Float, Boolean, DateTime, ForeignKey, Enum, JSON, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from app.db.session import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class Workspace(Base):
    __tablename__ = 'workspaces'
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime, default=utc_now)
    users = relationship('User', back_populates='workspace', cascade='all, delete-orphan')
    rulebooks = relationship('Rulebook', back_populates='workspace', cascade='all, delete-orphan')
    facts = relationship('Fact', back_populates='workspace', cascade='all, delete-orphan')
    submissions = relationship('ContentSubmission', back_populates='workspace', cascade='all, delete-orphan')
    audit_events = relationship('AuditEvent', back_populates='workspace', cascade='all, delete-orphan')
    brand_assets = relationship('BrandAsset', back_populates='workspace', cascade='all, delete-orphan')

class User(Base):
    __tablename__ = 'users'
    id = Column(String, primary_key=True, default=generate_uuid)
    workspace_id = Column(String, ForeignKey('workspaces.id'), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default='CREATOR')
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    workspace = relationship('Workspace', back_populates='users')
    submissions = relationship('ContentSubmission', back_populates='creator')
    decisions = relationship('ApprovalDecision', back_populates='approver')

class Rulebook(Base):
    __tablename__ = 'rulebooks'
    id = Column(String, primary_key=True, default=generate_uuid)
    workspace_id = Column(String, ForeignKey('workspaces.id'), nullable=False)
    version = Column(String(50), nullable=False, default='1.0.0')
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default='ACTIVE')
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    workspace = relationship('Workspace', back_populates='rulebooks')
    rules = relationship('Rule', back_populates='rulebook', cascade='all, delete-orphan')

class Rule(Base):
    __tablename__ = 'rules'
    id = Column(String, primary_key=True, default=generate_uuid)
    rulebook_id = Column(String, ForeignKey('rulebooks.id'), nullable=False)
    rule_code = Column(String(50), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    source_document_id = Column(String, nullable=True)
    source_version = Column(String(50), default='1.0')
    source_quote = Column(Text, nullable=False)
    source_section = Column(String(100), nullable=False)
    severity = Column(String(50), default='BLOCKING')
    enforcement_type = Column(String(50), default='DETERMINISTIC')
    pass_example = Column(Text, nullable=True)
    fail_example = Column(Text, nullable=True)
    ambiguity_status = Column(String(50), default='CLEAR')
    status = Column(String(50), default='ACTIVE')
    created_at = Column(DateTime, default=utc_now)
    rulebook = relationship('Rulebook', back_populates='rules')
    test_cases = relationship('RuleTestCase', back_populates='rule', cascade='all, delete-orphan')
    findings = relationship('Finding', back_populates='rule')

class RuleTestCase(Base):
    __tablename__ = 'rule_test_cases'
    id = Column(String, primary_key=True, default=generate_uuid)
    rule_id = Column(String, ForeignKey('rules.id'), nullable=False)
    input_text = Column(Text, nullable=False)
    expected_verdict = Column(String(50), nullable=False)
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    rule = relationship('Rule', back_populates='test_cases')

class Fact(Base):
    __tablename__ = 'facts'
    id = Column(String, primary_key=True, default=generate_uuid)
    workspace_id = Column(String, ForeignKey('workspaces.id'), nullable=False)
    fact_code = Column(String(50), nullable=False, index=True)
    subject = Column(String(255), nullable=False)
    approved_statement = Column(Text, nullable=False)
    normalized_value = Column(String(100), nullable=True)
    normalized_unit = Column(String(50), nullable=True)
    source_document = Column(String(255), nullable=False)
    source_quote = Column(Text, nullable=False)
    owner_name = Column(String(255), nullable=False)
    owner_email = Column(String(255), nullable=False)
    valid_from = Column(DateTime, default=utc_now)
    valid_until = Column(DateTime, nullable=False)
    status = Column(String(50), default='ACTIVE')
    created_at = Column(DateTime, default=utc_now)
    workspace = relationship('Workspace', back_populates='facts')
    claims = relationship('ExtractedClaim', back_populates='fact')

class ContentSubmission(Base):
    __tablename__ = 'content_submissions'
    id = Column(String, primary_key=True, default=generate_uuid)
    workspace_id = Column(String, ForeignKey('workspaces.id'), nullable=False)
    creator_id = Column(String, ForeignKey('users.id'), nullable=False)
    title = Column(String(255), nullable=False)
    content_type = Column(String(50), default='TEXT')
    original_filename = Column(String(255), nullable=True)
    current_status = Column(String(50), default='DRAFT')
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    workspace = relationship('Workspace', back_populates='submissions')
    creator = relationship('User', back_populates='submissions')
    versions = relationship('ContentVersion', back_populates='submission', cascade='all, delete-orphan')
    comments = relationship('Comment', back_populates='submission', cascade='all, delete-orphan')

class ContentVersion(Base):
    __tablename__ = 'content_versions'
    id = Column(String, primary_key=True, default=generate_uuid)
    submission_id = Column(String, ForeignKey('content_submissions.id'), nullable=False)
    version_number = Column(Integer, default=1)
    raw_text = Column(Text, nullable=False)
    redacted_text = Column(Text, nullable=False)
    content_hash = Column(String(64), nullable=False)
    rulebook_version = Column(String(50), nullable=False, default='1.0.0')
    created_at = Column(DateTime, default=utc_now)
    submission = relationship('ContentSubmission', back_populates='versions')
    intent_card = relationship('IntentCard', back_populates='content_version', uselist=False, cascade='all, delete-orphan')
    claims = relationship('ExtractedClaim', back_populates='content_version', cascade='all, delete-orphan')
    findings = relationship('Finding', back_populates='content_version', cascade='all, delete-orphan')
    decisions = relationship('ApprovalDecision', back_populates='content_version', cascade='all, delete-orphan')
    receipt = relationship('ReviewReceipt', back_populates='content_version', uselist=False, cascade='all, delete-orphan')

class IntentCard(Base):
    __tablename__ = 'intent_cards'
    id = Column(String, primary_key=True, default=generate_uuid)
    content_version_id = Column(String, ForeignKey('content_versions.id'), nullable=False)
    purpose = Column(Text, nullable=False)
    target_audience = Column(String(255), nullable=False)
    call_to_action = Column(String(255), nullable=False)
    must_keep_facts = Column(JSON, default=list)
    product_names = Column(JSON, default=list)
    numerical_claims = Column(JSON, default=list)
    tone_constraints = Column(JSON, default=list)
    preservation_status = Column(String(50), default='PASSED')
    created_at = Column(DateTime, default=utc_now)
    content_version = relationship('ContentVersion', back_populates='intent_card')

class ExtractedClaim(Base):
    __tablename__ = 'extracted_claims'
    id = Column(String, primary_key=True, default=generate_uuid)
    content_version_id = Column(String, ForeignKey('content_versions.id'), nullable=False)
    matched_fact_id = Column(String, ForeignKey('facts.id'), nullable=True)
    claim_text = Column(Text, nullable=False)
    claim_type = Column(String(50), default='FACTUAL')
    status = Column(String(50), default='NEEDS_PROOF')
    reasoning = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    content_version = relationship('ContentVersion', back_populates='claims')
    fact = relationship('Fact', back_populates='claims')

class Finding(Base):
    __tablename__ = 'findings'
    id = Column(String, primary_key=True, default=generate_uuid)
    content_version_id = Column(String, ForeignKey('content_versions.id'), nullable=False)
    rule_id = Column(String, ForeignKey('rules.id'), nullable=True)
    category = Column(String(100), nullable=False)
    severity = Column(String(50), nullable=False)
    span_start = Column(Integer, default=0)
    span_end = Column(Integer, default=0)
    matched_text = Column(Text, nullable=False)
    source_quote = Column(Text, nullable=True)
    source_section = Column(String(100), nullable=True)
    explanation = Column(Text, nullable=False)
    evidence_status = Column(String(50), default='VERIFIED')
    confidence_tier = Column(String(50), default='DETERMINISTIC')
    suggested_correction = Column(Text, nullable=True)
    verification_status = Column(String(50), default='VERIFIED')
    rejection_reason = Column(Text, nullable=True)
    user_decision = Column(String(50), default='PENDING')
    created_at = Column(DateTime, default=utc_now)
    content_version = relationship('ContentVersion', back_populates='findings')
    rule = relationship('Rule', back_populates='findings')

class Comment(Base):
    __tablename__ = 'comments'
    id = Column(String, primary_key=True, default=generate_uuid)
    submission_id = Column(String, ForeignKey('content_submissions.id'), nullable=False)
    author_id = Column(String, ForeignKey('users.id'), nullable=False)
    finding_id = Column(String, nullable=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now)
    submission = relationship('ContentSubmission', back_populates='comments')
    author = relationship('User')

class ApprovalDecision(Base):
    __tablename__ = 'approval_decisions'
    id = Column(String, primary_key=True, default=generate_uuid)
    content_version_id = Column(String, ForeignKey('content_versions.id'), nullable=False)
    approver_id = Column(String, ForeignKey('users.id'), nullable=False)
    decision = Column(String(50), nullable=False)
    reason = Column(Text, nullable=True)
    exception_category = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    content_version = relationship('ContentVersion', back_populates='decisions')
    approver = relationship('User', back_populates='decisions')

class ReviewReceipt(Base):
    __tablename__ = 'review_receipts'
    id = Column(String, primary_key=True, default=generate_uuid)
    submission_id = Column(String, ForeignKey('content_submissions.id'), nullable=False)
    content_version_id = Column(String, ForeignKey('content_versions.id'), nullable=False)
    content_hash = Column(String(64), nullable=False)
    rulebook_version = Column(String(50), nullable=False)
    approver_id = Column(String, nullable=True)
    final_verdict = Column(String(50), nullable=False)
    verified_findings_count = Column(Integer, default=0)
    advisory_count = Column(Integer, default=0)
    model_disclosure = Column(JSON, default=dict)
    issued_at = Column(DateTime, default=utc_now)
    content_version = relationship('ContentVersion', back_populates='receipt')

class AuditEvent(Base):
    __tablename__ = 'audit_events'
    id = Column(String, primary_key=True, default=generate_uuid)
    workspace_id = Column(String, ForeignKey('workspaces.id'), nullable=False)
    sequence_number = Column(Integer, nullable=False, default=1)
    event_type = Column(String(100), nullable=False)
    actor_id = Column(String, nullable=False)
    actor_role = Column(String(50), nullable=False)
    payload_hash = Column(String(64), nullable=False)
    prev_event_hash = Column(String(64), nullable=False)
    current_event_hash = Column(String(64), nullable=False)
    timestamp_str = Column(String(64), nullable=False)
    details = Column(JSON, default=dict)
    created_at = Column(DateTime, default=utc_now)
    __table_args__ = (UniqueConstraint('workspace_id', 'prev_event_hash', name='uq_audit_workspace_prev_hash'), Index('ix_audit_events_workspace_seq', 'workspace_id', 'sequence_number'))
    workspace = relationship('Workspace', back_populates='audit_events')

class AuditCheckpoint(Base):
    __tablename__ = 'audit_checkpoints'
    id = Column(String, primary_key=True, default=generate_uuid)
    workspace_id = Column(String, ForeignKey('workspaces.id'), nullable=False)
    sequence_number = Column(Integer, nullable=False)
    block_count = Column(Integer, nullable=False)
    head_hash = Column(String(64), nullable=False)
    checkpoint_signature = Column(String(128), nullable=False)
    created_at = Column(DateTime, default=utc_now)

class ProposedAmendment(Base):
    __tablename__ = 'proposed_amendments'
    id = Column(String, primary_key=True, default=generate_uuid)
    workspace_id = Column(String, ForeignKey('workspaces.id'), nullable=False)
    rule_id = Column(String, ForeignKey('rules.id'), nullable=False)
    trigger_reason = Column(Text, nullable=False)
    proposed_change = Column(Text, nullable=False)
    status = Column(String(50), default='PROPOSED')
    override_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=utc_now)

class BrandAsset(Base):
    __tablename__ = 'brand_assets'
    id = Column(String, primary_key=True, default=generate_uuid)
    workspace_id = Column(String, ForeignKey('workspaces.id'), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False, index=True)
    description = Column(Text, nullable=True)
    intended_usage = Column(String(255), nullable=True)
    file_path = Column(String(500), nullable=True)
    file_name = Column(String(255), nullable=True)
    file_format = Column(String(50), nullable=True)
    file_size_bytes = Column(Integer, default=0)
    mime_type = Column(String(100), nullable=True)
    version = Column(String(50), default='1.0.0')
    status = Column(String(50), default='PENDING_APPROVAL')
    rejection_reason = Column(Text, nullable=True)
    metadata_json = Column(JSON, default=dict)
    uploader_id = Column(String, ForeignKey('users.id'), nullable=True)
    uploader_name = Column(String(255), nullable=True)
    uploader_email = Column(String(255), nullable=True)
    approved_by_id = Column(String, ForeignKey('users.id'), nullable=True)
    approved_by_name = Column(String(255), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    parent_asset_id = Column(String, ForeignKey('brand_assets.id'), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    workspace = relationship('Workspace', back_populates='brand_assets')
    uploader = relationship('User', foreign_keys=[uploader_id])
    approver = relationship('User', foreign_keys=[approved_by_id])
