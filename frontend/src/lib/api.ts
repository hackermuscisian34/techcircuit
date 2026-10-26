/**
 * FIDELIS / CANON Brand Governance Platform - Frontend API Client
 */

function normalizeApiBaseUrl(rawUrl?: string): string {
  let url = (rawUrl || "http://127.0.0.1:8000/api/v1").trim().replace(/\/+$/, "");
  if (!url.endsWith("/api/v1")) {
    url = `${url}/api/v1`;
  }
  return url;
}

export const API_BASE_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "ADMIN" | "BRAND_MANAGER" | "CREATOR" | "AUTHORISED_REVIEWER" | "APPROVER";
  workspace_id: string;
  is_active?: boolean;
}

export interface Invitation {
  id: string;
  email: string;
  role: "ADMIN" | "BRAND_MANAGER" | "CREATOR" | "AUTHORISED_REVIEWER" | "APPROVER";
  workspace_id: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  invited_by_user_id: string;
  created_at: string;
  expires_at: string;
}

export interface AdminStats {
  active_users: number;
  total_users: number;
  total_workspaces: number;
  pending_invitations: number;
  system_health: {
    status: string;
    database: string;
    storage: string;
    audit_chain: string;
    environment: string;
    active_llm_provider: string;
  };
}

export interface RuleTestCase {
  id: string;
  rule_id: string;
  input_text: string;
  expected_verdict: "PASS" | "FAIL";
  explanation?: string;
}

export interface Rule {
  id: string;
  rulebook_id: string;
  rule_code: string;
  title: string;
  category: "Tone" | "Terminology" | "Claims" | "Visual" | "Accessibility" | string;
  description: string;
  source_quote: string;
  source_section: string;
  severity: "BLOCKING" | "WARNING" | "ADVISORY";
  enforcement_type: "DETERMINISTIC" | "SEMANTIC_AI";
  pass_example?: string | null;
  fail_example?: string | null;
  ambiguity_status: "CLEAR" | "AMBIGUOUS" | "CONFLICTING";
  status: "ACTIVE" | "PROPOSED" | "DEPRECATED" | string;
  test_cases?: RuleTestCase[];
}

export interface Rulebook {
  id: string;
  workspace_id: string;
  version: string;
  title: string;
  description?: string;
  status: string;
  rules_count: number;
  rules: Rule[];
}

export interface CandidateFact {
  fact_code: string;
  subject: string;
  approved_statement: string;
  normalized_value?: string;
  normalized_unit?: string;
  source_document: string;
  source_quote: string;
  valid_until?: string;
}

export interface FactExtractionResult {
  source_document: string;
  text_length: number;
  candidate_facts_count: number;
  candidate_facts: CandidateFact[];
}

export interface Fact {
  id: string;
  workspace_id: string;
  fact_code: string;
  subject: string;
  approved_statement: string;
  normalized_value?: string;
  normalized_unit?: string;
  source_document: string;
  source_quote: string;
  owner_name: string;
  owner_email: string;
  valid_from?: string;
  valid_until: string;
  status: "ACTIVE" | "STALE" | "SUPERSEDED";
  is_expired?: boolean;
}

export interface Finding {
  id: string;
  content_version_id: string;
  rule_id?: string;
  rule_code?: string;
  category: string;
  severity: "BLOCKING" | "WARNING" | "ADVISORY";
  span_start: number;
  span_end: number;
  matched_text: string;
  source_quote?: string;
  source_section?: string;
  explanation: string;
  description?: string;
  evidence_status: "VERIFIED" | "UNVERIFIED" | "MISSING";
  confidence_tier: "DETERMINISTIC" | "EVIDENCE_BACKED_AI" | "ADVISORY";
  suggested_correction?: string;
  suggested_replacement?: string;
  policy_citation?: string;
  verification_status: "VERIFIED" | "REJECTED" | "DEMOTED";
  rejection_reason?: string;
  user_decision: "PENDING" | "ACCEPTED" | "DISPUTED" | "OVERRIDDEN" | string;
  created_at: string;
}

export interface ExtractedClaim {
  id: string;
  content_version_id: string;
  matched_fact_id?: string;
  matched_fact_subject?: string;
  claim_text: string;
  claim_type: "FACTUAL" | "NUMERICAL" | "SUPERLATIVE" | "COMPARATIVE";
  status: "SUPPORTED" | "STALE" | "CONTRADICTED" | "UNSUPPORTED" | "NEEDS_PROOF";
  reasoning?: string;
}

export interface IntentCard {
  id: string;
  purpose: string;
  target_audience: string;
  call_to_action: string;
  must_keep_facts: string[];
  product_names: string[];
  numerical_claims: string[];
  tone_constraints: string[];
  preservation_status: "PASSED" | "FAILED" | "NEEDS_REVIEW";
}

export interface ContentSubmission {
  id: string;
  workspace_id: string;
  creator_id: string;
  creator_name?: string;
  title: string;
  content_type: string;
  original_filename?: string;
  raw_text?: string;
  current_status: "DRAFT" | "SUBMITTED" | "CHANGES_REQUESTED" | "APPROVED" | "APPROVED_WITH_EXCEPTION" | "REJECTED";
  created_at: string;
  updated_at: string;
}

export interface ReviewResult {
  submission_id: string;
  version_id: string;
  version_number: number;
  content_hash: string;
  rulebook_version: string;
  overall_status: string;
  title?: string;
  blocking_findings_count: number;
  warning_findings_count: number;
  advisory_findings_count: number;
  intent_preservation_status: string;
  findings: Finding[];
  claims: ExtractedClaim[];
  intent_card?: IntentCard;
  diff_html?: string;
  suggested_full_text?: string;
  model_disclosure: {
    provider?: string;
    model?: string;
    latency_ms?: number;
    is_local?: boolean;
    is_fallback?: boolean;
    privacy_mode?: string;
    prompt_injection_screened?: boolean;
    redacted_tokens_count?: number;
  };
}

export interface AuditEvent {
  id: string;
  workspace_id: string;
  event_type: string;
  actor_id: string;
  actor_role: string;
  payload_hash: string;
  prev_event_hash: string;
  previous_hash?: string;
  current_event_hash: string;
  event_hash?: string;
  details: Record<string, any>;
  created_at: string;
  timestamp?: string;
}

export interface AuditVerificationResult {
  is_valid: boolean;
  total_events: number;
  verified_events: number;
  broken_event_id?: string;
  message: string;
}

export type AuditChainVerificationResult = AuditVerificationResult;

export interface GovernanceInsights {
  total_reviews: number;
  passed_reviews: number;
  exception_reviews: number;
  rejected_reviews: number;
  blocking_findings_count: number;
  advisory_findings_count: number;
  findings_by_category: { category: string; count: number }[];
  frequently_overridden_rules: {
    rule_id: string;
    rule_code: string;
    rule_title: string;
    override_count: number;
    common_reasons: string[];
  }[];
  proposed_amendments: {
    id: string;
    rule_id: string;
    rule_code: string;
    rule_title: string;
    trigger_reason: string;
    proposed_change: string;
    override_count: number;
    status: string;
  }[];
  stale_claims_detected: number;
  ambiguous_rules_count: number;
}

export interface BrandAsset {
  id: string;
  workspace_id: string;
  name: string;
  category: string;
  description?: string;
  intended_usage?: string;
  file_path?: string;
  file_name?: string;
  file_format?: string;
  file_size_bytes: number;
  mime_type?: string;
  version: string;
  status: "APPROVED" | "PENDING_APPROVAL" | "REJECTED" | "ARCHIVED" | string;
  rejection_reason?: string;
  metadata_json: Record<string, any>;
  uploader_id?: string;
  uploader_name?: string;
  uploader_email?: string;
  approved_by_id?: string;
  approved_by_name?: string;
  approved_at?: string;
  parent_asset_id?: string;
  created_at: string;
  updated_at: string;
}

export interface BrandAssetStats {
  total_assets: number;
  approved_assets: number;
  pending_approval: number;
  archived_assets: number;
  rejected_assets: number;
  categories_summary: Record<string, number>;
}

function getAuthHeader(): Record<string, string> {
  if (typeof window !== "undefined") {
    const token =
      localStorage.getItem("fidelis_token") || localStorage.getItem("canon_token");
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  }
  return {};
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const authHeader = getAuthHeader();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    let detail = errorText;
    try {
      const parsed = JSON.parse(errorText);
      if (typeof parsed.detail === "string") {
        detail = parsed.detail;
      } else if (Array.isArray(parsed.detail)) {
        detail = parsed.detail
          .map((e: any) => e.msg || e.detail || JSON.stringify(e))
          .join(", ");
      } else if (parsed.detail) {
        detail = JSON.stringify(parsed.detail);
      }
    } catch {}
    throw new Error(detail);
  }
  return res.json();
}

async function fetchFormData<T>(
  endpoint: string,
  formData: FormData,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const authHeader = getAuthHeader();
  const res = await fetch(url, {
    method: "POST",
    body: formData,
    ...options,
    headers: {
      ...authHeader,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    let detail = errorText;
    try {
      const parsed = JSON.parse(errorText);
      if (typeof parsed.detail === "string") {
        detail = parsed.detail;
      } else if (Array.isArray(parsed.detail)) {
        detail = parsed.detail
          .map((e: any) => e.msg || e.detail || JSON.stringify(e))
          .join(", ");
      } else if (parsed.detail) {
        detail = JSON.stringify(parsed.detail);
      }
    } catch {}
    throw new Error(detail);
  }
  return res.json();
}

export const api = {
  // Auth & Personas
  getUsers: () => fetchAPI<User[]>("/auth/users"),
  getProfile: (userId?: string) =>
    fetchAPI<User>(userId ? `/auth/me?user_id=${userId}` : "/auth/me"),
  login: async (data: { email: string; password: string }) => {
    return fetchAPI<{
      access_token: string;
      token_type: string;
      user_id: string;
      email: string;
      full_name: string;
      role: "ADMIN" | "BRAND_MANAGER" | "CREATOR" | "AUTHORISED_REVIEWER" | "APPROVER";
      workspace_id: string;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  register: async (data: {
    email: string;
    full_name: string;
    password: string;
    role?: string;
  }) => {
    return fetchAPI<{
      access_token: string;
      token_type: string;
      user_id: string;
      email: string;
      full_name: string;
      role: "ADMIN" | "BRAND_MANAGER" | "CREATOR" | "AUTHORISED_REVIEWER" | "APPROVER";
      workspace_id: string;
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  switchPersona: async (role: string) => {
    const res = await fetchAPI<{
      access_token: string;
      token_type: string;
      user_id: string;
      email: string;
      full_name: string;
      role: string;
      workspace_id: string;
    }>("/auth/switch-persona", {
      method: "POST",
      body: JSON.stringify({ role }),
    });

    if (typeof window !== "undefined") {
      localStorage.setItem("fidelis_token", res.access_token);
      localStorage.setItem("fidelis_user_id", res.user_id);
      localStorage.setItem("fidelis_user_role", res.role);
      localStorage.setItem("fidelis_user_name", res.full_name);
      localStorage.setItem("fidelis_user_email", res.email);
      localStorage.setItem("canon_token", res.access_token);
      localStorage.setItem("canon_user_id", res.user_id);
      localStorage.setItem("canon_user_role", res.role);
      localStorage.setItem("canon_user_name", res.full_name);
      localStorage.setItem("canon_user_email", res.email);

      window.dispatchEvent(new Event("fidelis_user_changed"));
      window.dispatchEvent(new Event("canon_user_changed"));
      window.dispatchEvent(new Event("storage"));
    }
    return res;
  },

  // Rulebook & Compiler
  getActiveRulebook: () => fetchAPI<Rulebook>("/rulebooks"),
  compileGuidelineDocument: (text?: string, file?: File) => {
    const fd = new FormData();
    if (text) fd.append("text", text);
    if (file) fd.append("file", file);
    return fetchFormData<{
      source_document: string;
      extracted_characters: number;
      candidate_rules_count: number;
      rules: any[];
    }>("/rulebooks/compile", fd);
  },
  publishRulebook: (title: string, version: string, rules: any[]) =>
    fetchAPI<any>("/rulebooks/publish", {
      method: "POST",
      body: JSON.stringify({ title, version, rules }),
    }),
  updateRule: (ruleId: string, data: Partial<Rule>) =>
    fetchAPI<Rule>(`/rulebooks/rules/${ruleId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  runRuleTests: (ruleId: string) =>
    fetchAPI<{ rule_code: string; all_passed: boolean; results: any[] }>(
      `/rulebooks/rules/${ruleId}/run-tests`,
      { method: "POST" }
    ),

  // Fact Vault & Claim Ledger
  getFacts: () => fetchAPI<Fact[]>("/facts"),
  extractFacts: (formData: FormData) =>
    fetchFormData<FactExtractionResult>("/facts/extract", formData),
  createFact: (fact: Partial<Fact>) =>
    fetchAPI<Fact>("/facts", {
      method: "POST",
      body: JSON.stringify(fact),
    }),
  updateFact: (id: string, fact: Partial<Fact>) =>
    fetchAPI<Fact>(`/facts/${id}`, {
      method: "PUT",
      body: JSON.stringify(fact),
    }),

  // Content Review Studio
  submitReview: (formData: FormData) =>
    fetchFormData<ReviewResult>("/reviews/run", formData),
  getSubmissions: () => fetchAPI<ContentSubmission[]>("/reviews/submissions"),
  getSubmissionDetails: (id: string) => fetchAPI<any>(`/reviews/submissions/${id}`),
  updateFindingDecision: (findingId: string, decision: string, reason?: string) =>
    fetchAPI<any>(`/reviews/findings/${findingId}/decision`, {
      method: "PUT",
      body: JSON.stringify({ user_decision: decision, override_reason: reason }),
    }),

  // Approvals & Receipts
  getApprovalQueue: () => fetchAPI<ContentSubmission[]>("/approvals/queue"),
  submitApprovalDecision: (
    submissionId: string,
    decision: string,
    reason?: string,
    exceptionCategory?: string,
    approverId: string = "usr-approver-01"
  ) =>
    fetchAPI<any>(`/approvals/${submissionId}?approver_id=${approverId}`, {
      method: "POST",
      body: JSON.stringify({
        decision,
        reason,
        exception_category: exceptionCategory,
      }),
    }),
  getAssetApprovalQueue: () => fetchAPI<BrandAsset[]>("/approvals/assets"),
  submitAssetApprovalDecision: (
    assetId: string,
    decision: string,
    reason?: string
  ) =>
    fetchAPI<any>(`/approvals/assets/${assetId}`, {
      method: "POST",
      body: JSON.stringify({ decision, reason }),
    }),

  // Brand Asset Studio
  getAssets: (params?: {
    category?: string;
    status?: string;
    search?: string;
    sort?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.category && params.category !== "ALL")
      q.append("category", params.category);
    if (params?.status && params.status !== "ALL")
      q.append("status", params.status);
    if (params?.search) q.append("search", params.search);
    if (params?.sort) q.append("sort", params.sort);
    const queryStr = q.toString() ? `?${q.toString()}` : "";
    return fetchAPI<BrandAsset[]>(`/assets${queryStr}`);
  },
  getAssetStats: () => fetchAPI<BrandAssetStats>("/assets/stats"),
  uploadAsset: (formData: FormData) =>
    fetchFormData<BrandAsset>("/assets/upload", formData),
  addBrandColor: (data: {
    name: string;
    hex: string;
    role: string;
    intended_usage?: string;
  }) =>
    fetchAPI<BrandAsset>("/assets/color", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  approveAsset: (assetId: string, decision: string, reason?: string) =>
    fetchAPI<BrandAsset>(`/assets/${assetId}/approve`, {
      method: "POST",
      body: JSON.stringify({ decision, reason }),
    }),
  archiveAsset: (assetId: string) =>
    fetchAPI<BrandAsset>(`/assets/${assetId}/archive`, {
      method: "POST",
    }),
  deleteAsset: (assetId: string) =>
    fetchAPI<{ status: string; message: string }>(`/assets/${assetId}`, {
      method: "DELETE",
    }),
  auditLogoAsset: (assetId: string) =>
    fetchAPI<any>(`/assets/${assetId}/audit-logo`, {
      method: "POST",
    }),
  getAssetPreviewUrl: (assetId: string) =>
    `${API_BASE_URL}/assets/${assetId}/preview`,
  getAssetDownloadUrl: (assetId: string) =>
    `${API_BASE_URL}/assets/${assetId}/download`,
  downloadAssetFile: async (assetId: string, fileName?: string) => {
    const url = `${API_BASE_URL}/assets/${assetId}/download`;
    const res = await fetch(url, { headers: getAuthHeader() });
    if (!res.ok) throw new Error("Failed to download file");
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName || `asset-${assetId}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  },

  // Governance Loop
  getInsights: () => fetchAPI<GovernanceInsights>("/governance/insights"),
  acceptAmendment: (id: string) =>
    fetchAPI<any>(`/governance/amendments/${id}/accept`, { method: "POST" }),

  // Audit Ledger
  getAuditEvents: () => fetchAPI<AuditEvent[]>("/audit/events"),
  verifyAuditChain: () => fetchAPI<AuditChainVerificationResult>("/audit/verify"),
  getReceipt: (receiptId: string) => fetchAPI<any>(`/audit/receipt/${receiptId}`),
  exportAuditLedger: () => fetchAPI<any>("/audit/export"),

  // Admin & Identity Governance
  createInvitation: (data: { email: string; role: string; workspace_id?: string; expires_in_days?: number }) =>
    fetchAPI<{ invitation: Invitation; invite_token?: string; invite_url?: string }>("/auth/invitations", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getInvitations: () => fetchAPI<Invitation[]>("/auth/invitations"),
  acceptInvitation: (data: { token: string; full_name: string; password: string }) =>
    fetchAPI<{
      access_token: string;
      token_type: string;
      user_id: string;
      email: string;
      full_name: string;
      role: "ADMIN" | "BRAND_MANAGER" | "CREATOR" | "AUTHORISED_REVIEWER" | "APPROVER";
      workspace_id: string;
    }>("/auth/invitations/accept", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateUserStatus: (userId: string, is_active: boolean) =>
    fetchAPI<User>(`/auth/users/${userId}/status`, {
      method: "PUT",
      body: JSON.stringify({ is_active }),
    }),
  updateUserRole: (userId: string, role: string) =>
    fetchAPI<User>(`/auth/users/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    }),
  resetUserPassword: (userId: string, new_password?: string) =>
    fetchAPI<{ message: string; temporary_password?: string }>(`/auth/users/${userId}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ new_password }),
    }),
  bootstrapAdmin: (data: { email: string; password: string; full_name: string }) =>
    fetchAPI<{
      access_token: string;
      token_type: string;
      user_id: string;
      email: string;
      full_name: string;
      role: string;
      workspace_id: string;
    }>("/auth/bootstrap-admin", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getAdminStats: () => fetchAPI<AdminStats>("/auth/admin/stats"),
  getAssetPreviewTicket: (assetId: string) =>
    fetchAPI<{ asset_id: string; ticket: string; expires_in_seconds: number }>(`/assets/${assetId}/preview-ticket`),
};
