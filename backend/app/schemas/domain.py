from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    email: str
    full_name: str
    role: str
    workspace_id: str

class UserBase(BaseModel):
    email: str
    full_name: str
    role: str = 'CREATOR'

class UserCreate(UserBase):
    password: str
    workspace_id: Optional[str] = None

class UserResponse(UserBase):
    id: str
    workspace_id: str
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class LoginRequest(BaseModel):
    email: str
    password: str

class InvitationCreate(BaseModel):
    email: str
    role: str
    expires_in_hours: Optional[int] = 72
    expires_in_days: Optional[int] = None
    invite_base_url: Optional[str] = None

class InvitationResponse(BaseModel):
    id: str
    workspace_id: str
    email: str
    role: str
    expires_at: datetime
    is_used: bool
    created_at: datetime
    invite_token: Optional[str] = None
    invite_url: Optional[str] = None
    email_dispatched: Optional[bool] = True
    delivery_status: Optional[str] = "SENT"
    delivery_message: Optional[str] = None
    delivery_method: Optional[str] = "simulated"
    is_live: Optional[bool] = False
    model_config = ConfigDict(from_attributes=True)

class SMTPStatusResponse(BaseModel):
    configured: bool
    host: str
    port: int
    user: Optional[str] = None
    has_password: bool
    from_email: str
    from_name: str
    tls: bool
    mode: str

class SMTPTestRequest(BaseModel):
    recipient_email: str

class SMTPConfigRequest(BaseModel):
    host: str
    port: int = 587
    user: Optional[str] = None
    password: Optional[str] = None
    from_email: Optional[str] = None
    from_name: Optional[str] = None
    tls: bool = True
    persist_to_env: bool = True

class InvitationAccept(BaseModel):
    token: str
    full_name: str
    password: str

class UserStatusUpdate(BaseModel):
    is_active: bool

class RoleUpdateRequest(BaseModel):
    role: str

class PasswordResetRequest(BaseModel):
    new_password: str

class BootstrapAdminRequest(BaseModel):
    email: str
    full_name: str
    password: str
    bootstrap_token: Optional[str] = None

class AdminStatsResponse(BaseModel):
    total_users: int
    active_users: int
    deactivated_users: int
    total_workspaces: int
    pending_invitations: int
    total_submissions: int
    total_reviews: int
    total_audit_events: int
    active_llm_provider: str
    active_llm_model: str
    llm_local_only: bool
    database_status: str
    storage_status: str
    audit_chain_valid: bool
    last_backup_timestamp: Optional[str] = None

class RuleTestCaseBase(BaseModel):
    input_text: str
    expected_verdict: str
    explanation: Optional[str] = None

class RuleTestCaseResponse(RuleTestCaseBase):
    id: str
    rule_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class RuleBase(BaseModel):
    rule_code: str
    title: str
    category: str
    description: str
    source_document_id: Optional[str] = None
    source_version: str = '1.0'
    source_quote: str
    source_section: str
    severity: str = 'BLOCKING'
    enforcement_type: str = 'DETERMINISTIC'
    pass_example: Optional[str] = None
    fail_example: Optional[str] = None
    ambiguity_status: str = 'CLEAR'
    status: str = 'ACTIVE'

class RuleCreate(RuleBase):
    test_cases: Optional[List[RuleTestCaseBase]] = None

class RuleUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    source_quote: Optional[str] = None
    source_section: Optional[str] = None
    severity: Optional[str] = None
    enforcement_type: Optional[str] = None
    pass_example: Optional[str] = None
    fail_example: Optional[str] = None
    ambiguity_status: Optional[str] = None
    status: Optional[str] = None

class RuleResponse(RuleBase):
    id: str
    rulebook_id: str
    created_at: datetime
    test_cases: List[RuleTestCaseResponse] = []

    class Config:
        from_attributes = True

class RulebookBase(BaseModel):
    version: str
    title: str
    description: Optional[str] = None
    brand_name: Optional[str] = 'Apex Dynamics'
    region: Optional[str] = 'GLOBAL'
    status: str = 'ACTIVE'

class RulebookResponse(RulebookBase):
    id: str
    workspace_id: str
    created_at: datetime
    updated_at: datetime
    rules_count: int = 0
    rules: List[RuleResponse] = []

    class Config:
        from_attributes = True

class FactBase(BaseModel):
    fact_code: str
    subject: str
    approved_statement: str
    normalized_value: Optional[str] = None
    normalized_unit: Optional[str] = None
    source_document: str
    source_quote: str
    owner_name: str
    owner_email: str
    valid_from: Optional[datetime] = None
    valid_until: datetime
    brand_name: Optional[str] = 'Apex Dynamics'
    region: Optional[str] = 'GLOBAL'
    status: str = 'ACTIVE'

class FactCreate(FactBase):
    pass

class FactUpdate(BaseModel):
    subject: Optional[str] = None
    approved_statement: Optional[str] = None
    normalized_value: Optional[str] = None
    normalized_unit: Optional[str] = None
    source_document: Optional[str] = None
    source_quote: Optional[str] = None
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    valid_until: Optional[datetime] = None
    status: Optional[str] = None

class FactResponse(FactBase):
    id: str
    workspace_id: str
    created_at: datetime
    is_expired: bool = False

    class Config:
        from_attributes = True

class ExtractedClaimResponse(BaseModel):
    id: str
    content_version_id: str
    matched_fact_id: Optional[str] = None
    claim_text: str
    claim_type: str
    status: str
    reasoning: Optional[str] = None
    matched_fact: Optional[FactResponse] = None

    class Config:
        from_attributes = True

class IntentCardResponse(BaseModel):
    id: str
    purpose: str
    target_audience: str
    call_to_action: str
    must_keep_facts: List[str] = []
    product_names: List[str] = []
    numerical_claims: List[str] = []
    tone_constraints: List[str] = []
    preservation_status: str

    class Config:
        from_attributes = True

class FindingResponse(BaseModel):
    id: str
    content_version_id: str
    rule_id: Optional[str] = None
    rule_code: Optional[str] = None
    category: str
    severity: str
    span_start: int
    span_end: int
    matched_text: str
    source_quote: Optional[str] = None
    source_section: Optional[str] = None
    explanation: str
    evidence_status: str
    confidence_tier: str
    suggested_correction: Optional[str] = None
    verification_status: str
    rejection_reason: Optional[str] = None
    user_decision: str
    created_at: datetime

    class Config:
        from_attributes = True

class FindingDecisionUpdate(BaseModel):
    user_decision: Optional[str] = None
    decision: Optional[str] = None
    override_reason: Optional[str] = None
    note: Optional[str] = None

class ContentSubmissionCreate(BaseModel):
    title: str
    content_text: str
    content_type: str = 'TEXT'
    filename: Optional[str] = None

class ContentSubmissionResponse(BaseModel):
    id: str
    workspace_id: str
    creator_id: str
    creator_name: Optional[str] = None
    title: str
    content_type: str
    original_filename: Optional[str] = None
    brand_name: Optional[str] = 'Apex Dynamics'
    region: Optional[str] = 'GLOBAL'
    current_status: str
    created_at: datetime
    updated_at: datetime
    latest_version: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class ReviewResultResponse(BaseModel):
    submission_id: str
    version_id: str
    version_number: int
    content_hash: str
    rulebook_version: str
    overall_status: str
    blocking_findings_count: int
    warning_findings_count: int
    advisory_findings_count: int
    intent_preservation_status: str
    findings: List[FindingResponse]
    claims: List[ExtractedClaimResponse]
    intent_card: Optional[IntentCardResponse] = None
    diff_html: Optional[str] = None
    suggested_full_text: Optional[str] = None
    brand_name: Optional[str] = 'Apex Dynamics'
    region: Optional[str] = 'GLOBAL'
    model_disclosure: Dict[str, Any] = {}

class ApprovalDecisionCreate(BaseModel):
    decision: str
    reason: Optional[str] = None
    exception_category: Optional[str] = None

class ApprovalDecisionResponse(BaseModel):
    id: str
    content_version_id: str
    approver_id: str
    approver_name: Optional[str] = None
    approver_role: Optional[str] = None
    decision: str
    reason: Optional[str] = None
    exception_category: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ReviewReceiptResponse(BaseModel):
    id: str
    submission_id: str
    content_version_id: str
    content_hash: str
    rulebook_version: str
    approver_id: Optional[str] = None
    approver_name: Optional[str] = None
    final_verdict: str
    verified_findings_count: int
    advisory_count: int
    model_disclosure: Dict[str, Any]
    issued_at: datetime

    class Config:
        from_attributes = True

class AuditEventResponse(BaseModel):
    id: str
    workspace_id: str
    event_type: str
    actor_id: str
    actor_role: str
    payload_hash: str
    prev_event_hash: str
    current_event_hash: str
    details: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

class AuditChainVerificationResult(BaseModel):
    is_valid: bool
    total_events: int
    verified_events: int
    broken_event_id: Optional[str] = None
    message: str

class CategoryStat(BaseModel):
    category: str
    count: int

class RepeatedRuleOverride(BaseModel):
    rule_id: str
    rule_code: str
    rule_title: str
    override_count: int
    common_reasons: List[str]

class ProposedAmendmentResponse(BaseModel):
    id: str
    rule_id: str
    rule_code: str
    rule_title: str
    trigger_reason: str
    proposed_change: str
    override_count: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class GovernanceInsightsResponse(BaseModel):
    total_reviews: int
    passed_reviews: int
    exception_reviews: int
    rejected_reviews: int
    blocking_findings_count: int
    advisory_findings_count: int
    findings_by_category: List[CategoryStat]
    frequently_overridden_rules: List[RepeatedRuleOverride]
    proposed_amendments: List[ProposedAmendmentResponse]
    stale_claims_detected: int
    ambiguous_rules_count: int
    violation_trends: List[Dict[str, Any]] = []
    average_turnaround_hours: float = 0.0
    root_cause_recommendations: List[Dict[str, Any]] = []

class BrandAssetBase(BaseModel):
    name: str
    category: str
    description: Optional[str] = None
    intended_usage: Optional[str] = None
    brand_name: Optional[str] = 'Apex Dynamics'
    region: Optional[str] = 'GLOBAL'
    version: Optional[str] = '1.0.0'
    metadata_json: Optional[Dict[str, Any]] = None

class BrandAssetCreate(BrandAssetBase):
    pass

class BrandColorCreate(BaseModel):
    name: str
    hex: str
    role: str = 'Primary'
    intended_usage: Optional[str] = None

class BrandAssetUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    intended_usage: Optional[str] = None
    version: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None

class BrandAssetApproval(BaseModel):
    decision: str
    reason: Optional[str] = None

class BrandAssetResponse(BaseModel):
    id: str
    workspace_id: str
    name: str
    category: str
    description: Optional[str] = None
    intended_usage: Optional[str] = None
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    file_format: Optional[str] = None
    file_size_bytes: int = 0
    mime_type: Optional[str] = None
    version: str = '1.0.0'
    status: str
    rejection_reason: Optional[str] = None
    metadata_json: Dict[str, Any] = {}
    uploader_id: Optional[str] = None
    uploader_name: Optional[str] = None
    uploader_email: Optional[str] = None
    approved_by_id: Optional[str] = None
    approved_by_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    parent_asset_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class BrandAssetStats(BaseModel):
    total_assets: int
    approved_assets: int
    pending_approval: int
    archived_assets: int
    rejected_assets: int
    categories_summary: Dict[str, int]

class CommentCreate(BaseModel):
    text: str
    finding_id: Optional[str] = None

class CommentResponse(BaseModel):
    id: str
    submission_id: str
    author_id: str
    author_name: Optional[str] = None
    author_role: Optional[str] = None
    finding_id: Optional[str] = None
    text: str
    created_at: datetime

    class Config:
        from_attributes = True

class AffectedItemDetail(BaseModel):
    submission_id: str
    submission_title: str
    creator_name: Optional[str] = None
    current_status: str
    content_snippet: str
    impact_type: str # 'NEWLY_NON_COMPLIANT' | 'NEWLY_COMPLIANT' | 'SEVERITY_CHANGED' | 'UNAFFECTED'
    explanation: str

class RuleImpactSimulationRequest(BaseModel):
    rule_id: str
    proposed_description: str
    proposed_severity: Optional[str] = None

class RuleImpactSimulationResponse(BaseModel):
    rule_id: str
    rule_code: str
    original_title: str
    original_description: str
    proposed_description: str
    total_evaluated: int
    newly_non_compliant_count: int
    newly_compliant_count: int
    severity_changed_count: int
    affected_items: List[AffectedItemDetail]
