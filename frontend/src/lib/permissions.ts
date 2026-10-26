/**
 * FIDELIS Brand Governance Platform - Role-Based Access Control (RBAC) Permissions
 */

export type UserRole =
  | "ADMIN"
  | "BRAND_MANAGER"
  | "AUTHORISED_REVIEWER"
  | "CREATOR"
  | "APPROVER";

export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  ADMIN: "System Administrator",
  BRAND_MANAGER: "Brand Manager",
  AUTHORISED_REVIEWER: "Compliance Reviewer",
  CREATOR: "Content Creator",
  APPROVER: "Executive Approver",
};

export interface RouteMetadata {
  path: string;
  title: string;
  description: string;
  requiredRoles: UserRole[];
}

/**
 * Route access map defined according to USER_ROLES_AND_CREDENTIALS.md:
 * - ADMIN: 11 of 11 modules
 * - BRAND_MANAGER: 7 of 11 modules
 * - AUTHORISED_REVIEWER: 6 of 11 modules
 * - CREATOR: 3 of 11 modules
 * - APPROVER: 6 of 11 modules
 */
export const ROLE_ROUTES: Record<UserRole, readonly string[]> = {
  ADMIN: [
    "/dashboard",
    "/admin",
    "/review",
    "/findings",
    "/approvals",
    "/rulebook",
    "/facts",
    "/assets",
    "/insights",
    "/audit",
    "/guide",
    "/settings",
  ],
  BRAND_MANAGER: [
    "/dashboard",
    "/review",
    "/rulebook",
    "/facts",
    "/assets",
    "/insights",
    "/guide",
  ],
  AUTHORISED_REVIEWER: [
    "/dashboard",
    "/review",
    "/findings",
    "/facts",
    "/assets",
    "/guide",
  ],
  CREATOR: [
    "/dashboard",
    "/review",
    "/guide",
  ],
  APPROVER: [
    "/dashboard",
    "/review",
    "/approvals",
    "/assets",
    "/audit",
    "/guide",
  ],
};

export const ROUTE_METADATA_MAP: Record<string, RouteMetadata> = {
  "/dashboard": {
    path: "/dashboard",
    title: "Workspace Dashboard",
    description: "High-level compliance overview, active metrics, recent activity feeds, and quick brand verification.",
    requiredRoles: ["ADMIN", "BRAND_MANAGER", "AUTHORISED_REVIEWER", "CREATOR", "APPROVER"],
  },
  "/admin": {
    path: "/admin",
    title: "Platform Administration & Security",
    description: "Manage users, role invitations, workspace status, system diagnostics, and tenant governance.",
    requiredRoles: ["ADMIN"],
  },
  "/review": {
    path: "/review",
    title: "Review Studio",
    description: "Real-time content drafting, AST token checking, and Intent Lock™ brand preservation verification.",
    requiredRoles: ["ADMIN", "BRAND_MANAGER", "AUTHORISED_REVIEWER", "CREATOR", "APPROVER"],
  },
  "/findings": {
    path: "/findings",
    title: "Citation Verifier & Findings",
    description: "Strict quote verification, rule bindings, evidence-backed inspection, and demotions.",
    requiredRoles: ["ADMIN", "AUTHORISED_REVIEWER"],
  },
  "/approvals": {
    path: "/approvals",
    title: "Approval Queue & HMAC Receipts",
    description: "Review pending content drafts and brand asset submissions; sign releases with cryptographic HMAC receipts.",
    requiredRoles: ["ADMIN", "APPROVER"],
  },
  "/rulebook": {
    path: "/rulebook",
    title: "Brand Rulebook Studio",
    description: "Compile guideline PDFs, manage atomic rule constraints, and execute unit test regressions.",
    requiredRoles: ["ADMIN", "BRAND_MANAGER"],
  },
  "/facts": {
    path: "/facts",
    title: "Claim Ledger & Certified Fact Vault",
    description: "Manage certified corporate facts, benchmark SLAs, proof documents, and expiration horizons.",
    requiredRoles: ["ADMIN", "BRAND_MANAGER", "AUTHORISED_REVIEWER"],
  },
  "/assets": {
    path: "/assets",
    title: "Brand Asset Studio & Visual Audit",
    description: "Catalog logos, icons, color palettes, verify clearspace padding, and audit aspect-ratio distortion.",
    requiredRoles: ["ADMIN", "BRAND_MANAGER", "AUTHORISED_REVIEWER", "APPROVER"],
  },
  "/insights": {
    path: "/insights",
    title: "Governance Insights & Adaptive Amendments",
    description: "Analyze reviewer override patterns, ambiguous guidelines, and review auto-generated rule amendment proposals.",
    requiredRoles: ["ADMIN", "BRAND_MANAGER"],
  },
  "/audit": {
    path: "/audit",
    title: "Cryptographic Audit Ledger",
    description: "Inspect the append-only SHA-256 event chain and verify mathematical ledger integrity.",
    requiredRoles: ["ADMIN", "APPROVER"],
  },
  "/guide": {
    path: "/guide",
    title: "Platform User Guide",
    description: "Complete walkthrough of the FIDELIS Brand Governance platform, workflows, and testing personas.",
    requiredRoles: ["ADMIN", "BRAND_MANAGER", "AUTHORISED_REVIEWER", "CREATOR", "APPROVER"],
  },
  "/settings": {
    path: "/settings",
    title: "Platform Administration & AI Settings",
    description: "Supervise LLM provider configurations, Hugging Face / Ollama routing, and system health.",
    requiredRoles: ["ADMIN"],
  },
};

/**
 * Check if a route is permitted for a given user role
 */
export function isRouteAllowedForRole(pathname: string, role: UserRole): boolean {
  if (["/", "/login", "/intro"].includes(pathname)) {
    return true;
  }
  const allowed = ROLE_ROUTES[role] || [];
  return allowed.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/**
 * Get all allowed routes for a user role
 */
export function getAllowedRoutesForRole(role: UserRole): string[] {
  return [...(ROLE_ROUTES[role] || [])];
}

/**
 * Get metadata for a specific route
 */
export function getRouteMetadata(targetPath: string): RouteMetadata | undefined {
  const cleanPath = targetPath.split("?")[0].replace(/\/+$/, "") || "/";
  return ROUTE_METADATA_MAP[cleanPath];
}
