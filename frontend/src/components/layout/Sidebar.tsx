"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, BookOpen, Database, FileCheck2,
  AlertCircle, CheckSquare, Palette, BarChart3,
  ShieldCheck, ShieldAlert, Cpu, HelpCircle, LogOut, Menu, X,
  Sparkles, Zap, ChevronRight, Terminal, Lock
} from "lucide-react";
import {
  UserRole,
  getAllowedRoutesForRole,
  ROLE_DISPLAY_NAMES,
} from "@/lib/permissions";
import { api, User as UserType } from "@/lib/api";
import { FidelisLogo } from "@/components/common/FidelisLogo";

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "admin" | "core" | "compliance" | "governance" | "oversight" | "support";
  badge?: string;
}

const NAV_DIRECTORY: readonly NavigationItem[] = [
  // 1. Platform Administration (ADMIN ONLY)
  { name: "Admin Portal", href: "/admin", icon: ShieldAlert, group: "admin", badge: "RBAC" },
  { name: "Platform Settings", href: "/settings", icon: Cpu, group: "admin" },

  // 2. Core Workspace (ALL ROLES)
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "core" },
  { name: "Review Studio", href: "/review", icon: FileCheck2, group: "core", badge: "STUDIO" },

  // 3. Compliance & Approvals (REVIEWER, APPROVER, ADMIN)
  { name: "Review Findings", href: "/findings", icon: AlertCircle, group: "compliance" },
  { name: "Approval Queue", href: "/approvals", icon: CheckSquare, group: "compliance" },

  // 4. Brand Guidelines & Assets (BRAND_MANAGER, REVIEWER, APPROVER, ADMIN)
  { name: "Brand Rules", href: "/rulebook", icon: BookOpen, group: "governance" },
  { name: "Approved Facts", href: "/facts", icon: Database, group: "governance" },
  { name: "Brand Assets", href: "/assets", icon: Palette, group: "governance", badge: "ASSETS" },

  // 5. Oversight & Ledger (BRAND_MANAGER, APPROVER, ADMIN)
  { name: "Governance Insights", href: "/insights", icon: BarChart3, group: "oversight" },
  { name: "Audit Ledger", href: "/audit", icon: ShieldCheck, group: "oversight" },

  // 6. Platform Handbook (ALL ROLES)
  { name: "User Guide", href: "/guide", icon: HelpCircle, group: "support" },
];

const GROUP_TITLES: Record<string, string> = {
  admin: "Platform Administration",
  core: "Content & Workspace",
  compliance: "Compliance & Approvals",
  governance: "Brand Rules & Assets",
  oversight: "Audit & Analytics",
  support: "Platform Handbook",
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserType | null>(() => {
    if (typeof window !== "undefined") {
      const savedId = localStorage.getItem("fidelis_user_id") || localStorage.getItem("canon_user_id");
      const savedName = localStorage.getItem("fidelis_user_name") || localStorage.getItem("canon_user_name");
      const savedRole = localStorage.getItem("fidelis_user_role") || localStorage.getItem("canon_user_role");
      const savedEmail = localStorage.getItem("fidelis_user_email") || localStorage.getItem("canon_user_email");
      if (savedName && savedRole) {
        return {
          id: savedId || "usr-current",
          email: savedEmail || "",
          full_name: savedName,
          role: savedRole as any,
          workspace_id: "ws-apexdynamics-001",
        };
      }
    }
    return null;
  });
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    if (typeof window !== "undefined") {
      const savedRole = localStorage.getItem("fidelis_user_role") || localStorage.getItem("canon_user_role");
      if (savedRole && ["ADMIN", "BRAND_MANAGER", "CREATOR", "AUTHORISED_REVIEWER", "APPROVER"].includes(savedRole.toUpperCase())) {
        return savedRole.toUpperCase() as UserRole;
      }
    }
    return "CREATOR";
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const syncActiveUser = async () => {
    const savedId = typeof window !== "undefined" ? (localStorage.getItem("fidelis_user_id") || localStorage.getItem("canon_user_id")) : null;
    const savedName = typeof window !== "undefined" ? (localStorage.getItem("fidelis_user_name") || localStorage.getItem("canon_user_name")) : null;
    const savedRole = typeof window !== "undefined" ? (localStorage.getItem("fidelis_user_role") || localStorage.getItem("canon_user_role")) : null;
    const savedEmail = typeof window !== "undefined" ? (localStorage.getItem("fidelis_user_email") || localStorage.getItem("canon_user_email")) : null;
    const token = typeof window !== "undefined" ? (localStorage.getItem("fidelis_token") || localStorage.getItem("canon_token")) : null;

    if (savedRole && ["ADMIN", "BRAND_MANAGER", "CREATOR", "AUTHORISED_REVIEWER", "APPROVER"].includes(savedRole.toUpperCase())) {
      setCurrentRole(savedRole.toUpperCase() as UserRole);
    }
    if (savedName && savedRole) {
      setCurrentUser((prev) => prev ?? {
        id: savedId || "usr-current",
        email: savedEmail || "",
        full_name: savedName,
        role: savedRole as any,
        workspace_id: "ws-apexdynamics-001",
      });
    }

    if (!token) return;

    try {
      // Fetch authenticated profile directly from /auth/me
      const profile = await api.getProfile();
      if (profile && profile.id) {
        setCurrentUser(profile);
        const liveRole = profile.role.toUpperCase() as UserRole;
        setCurrentRole(liveRole);

        if (liveRole !== savedRole || profile.full_name !== savedName) {
          localStorage.setItem("fidelis_user_role", profile.role);
          localStorage.setItem("canon_user_role", profile.role);
          localStorage.setItem("fidelis_user_name", profile.full_name);
          localStorage.setItem("canon_user_name", profile.full_name);
          localStorage.setItem("fidelis_user_email", profile.email);
          localStorage.setItem("canon_user_email", profile.email);
          localStorage.setItem("fidelis_user_id", profile.id);
          localStorage.setItem("canon_user_id", profile.id);

          window.dispatchEvent(new Event("fidelis_user_changed"));
          window.dispatchEvent(new Event("canon_user_changed"));
          window.dispatchEvent(new Event("storage"));
        }
        return;
      }
    } catch {
      // Fallback to getUsers if /auth/me encounters any issue
      try {
        const records = await api.getUsers();
        if (savedId) {
          const matched = records.find((u) => u.id === savedId);
          if (matched) {
            setCurrentUser(matched);
            const liveRole = matched.role.toUpperCase() as UserRole;
            setCurrentRole(liveRole);
            if (liveRole !== savedRole) {
              localStorage.setItem("fidelis_user_role", matched.role);
              localStorage.setItem("canon_user_role", matched.role);
              window.dispatchEvent(new Event("fidelis_user_changed"));
              window.dispatchEvent(new Event("canon_user_changed"));
              window.dispatchEvent(new Event("storage"));
            }
          }
        }
      } catch {
        // Keep existing cached state
      }
    }
  };

  useEffect(() => {
    setMounted(true);
    syncActiveUser();
    const refreshHandler = () => syncActiveUser();
    window.addEventListener("storage", refreshHandler);
    window.addEventListener("fidelis_user_changed", refreshHandler);
    window.addEventListener("canon_user_changed", refreshHandler);
    return () => {
      window.removeEventListener("storage", refreshHandler);
      window.removeEventListener("fidelis_user_changed", refreshHandler);
      window.removeEventListener("canon_user_changed", refreshHandler);
    };
  }, [pathname]);

  const executeSignout = () => {
    [
      "fidelis_token", "fidelis_user_id", "fidelis_user_role", "fidelis_user_name", "fidelis_user_email",
      "canon_token", "canon_user_id", "canon_user_role", "canon_user_name", "canon_user_email"
    ].forEach((k) => localStorage.removeItem(k));
    window.dispatchEvent(new Event("fidelis_user_changed"));
    window.dispatchEvent(new Event("canon_user_changed"));
    window.dispatchEvent(new Event("storage"));
    setCurrentUser(null);
    setCurrentRole("CREATOR");
    router.push("/login");
  };

  const permittedRoutes = getAllowedRoutesForRole(currentRole);
  const eligibleItems = NAV_DIRECTORY.filter((entry) => permittedRoutes.includes(entry.href));

  const clusters = Object.entries(GROUP_TITLES)
    .map(([groupKey, headerTitle]) => ({
      headerTitle,
      entries: eligibleItems.filter((elem) => elem.group === groupKey),
    }))
    .filter((cluster) => cluster.entries.length > 0);

  const sidebarMarkup = (
    <aside className="flex flex-col h-full">
      <div className="p-5 border-b border-[#F4E2D3]">
        <Link href="/" className="flex items-center gap-3 group">
          <FidelisLogo size={42} showWordmark={true} badgeText="v2.4" />
        </Link>

        <div className="mt-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#FFFBF7] to-[#FFF5EC] border border-[#F4E2D3]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-[#201815] flex items-center gap-1.5 truncate">
              <Terminal className="w-3 h-3 text-[#FF8A3D] shrink-0" />
              <span className="truncate" suppressHydrationWarning>
                {ROLE_DISPLAY_NAMES[currentRole] || "Workspace"}
              </span>
            </span>
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-[#EDFDF5] text-[#027A48] border border-[#A6F4C5] shrink-0">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#027A48] opacity-75 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#027A48]" />
              </span>
              ACTIVE
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-[#7C6A5E] font-semibold">
            <span className="flex items-center gap-1 text-[#D95D0D] font-bold">
              <Sparkles className="w-3 h-3 text-[#FF8A3D]" />
              Role RBAC
            </span>
            <span
              className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-white border border-[#F4E2D3] text-[#7C6A5E] font-bold"
              suppressHydrationWarning
            >
              {eligibleItems.length} of {NAV_DIRECTORY.length} modules
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {clusters.map(({ headerTitle, entries }) => (
          <div key={headerTitle}>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#A49184] px-3 mb-1.5">
              {headerTitle}
            </p>
            <div className="space-y-0.5">
              {entries.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                const isHovered = hoveredItem === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    onMouseEnter={() => setHoveredItem(item.href)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`
                      relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold
                      transition-all duration-200 group overflow-hidden
                      ${isActive
                        ? "bg-gradient-to-r from-[#FFF2E7] to-[#FFEAD9] text-[#D95D0D] border border-[#FDBA74] shadow-xs"
                        : "text-[#7C6A5E] hover:bg-[#FFF5EC] hover:text-[#D95D0D]"
                      }
                    `}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b from-[#FF8A3D] to-[#FF5F0F] shadow-sm shadow-[#FF8A3D]/50" />
                    )}

                    <div className={`
                      w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200
                      ${isActive
                        ? "bg-[#FF8A3D]/15 shadow-xs"
                        : "group-hover:bg-[#FF8A3D]/10"
                      }
                    `}>
                      <Icon
                        className={`w-3.5 h-3.5 transition-colors ${isActive ? "text-[#FF8A3D]" : "text-[#A49184] group-hover:text-[#FF8A3D]"}`}
                      />
                    </div>

                    <span className="flex-1 truncate">{item.name}</span>

                    {item.badge && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#FF8A3D] to-[#FF5F0F] text-white shadow-xs">
                        {item.badge}
                      </span>
                    )}

                    <ChevronRight
                      className={`w-3 h-3 shrink-0 transition-all duration-200 ${
                        (isActive || isHovered) ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-1"
                      } ${isActive ? "text-[#FF8A3D]" : "text-[#A49184]"}`}
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-[#F4E2D3]">
        <div
          className="p-3 rounded-2xl border mb-2.5"
          style={{ background: "linear-gradient(135deg,#FFFBF7,#FFF5EC)", borderColor: "#F4E2D3" }}
        >
          {currentUser ? (
            <div>
              <div className="flex items-center gap-2.5">
                <div className="relative shrink-0">
                  <div
                    className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF8A3D] to-[#FF5F0F] text-white flex items-center justify-center font-black text-sm shadow-sm shadow-[#FF8A3D]/30"
                    suppressHydrationWarning
                  >
                    {currentUser.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#027A48] border-2 border-white" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-extrabold text-[#201815] truncate" suppressHydrationWarning>
                    {currentUser.full_name}
                  </div>
                  <div className="text-[10px] text-[#D95D0D] font-bold truncate" suppressHydrationWarning>
                    {ROLE_DISPLAY_NAMES[currentRole] || currentUser.role.replace(/_/g, " ")}
                  </div>
                </div>

                <button
                  onClick={executeSignout}
                  className="p-1.5 rounded-lg text-[#A49184] hover:text-[#B42318] hover:bg-[#FFF0F0] transition-colors cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mt-2 pt-2 border-t border-[#F4E2D3]/60 flex items-center justify-between text-[10px]">
                <span
                  className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FFF2E7] text-[#D95D0D] border border-[#FDBA74]"
                  suppressHydrationWarning
                >
                  {currentRole}
                </span>
                <span className="text-[10px] text-[#A49184] font-medium truncate max-w-[110px]" suppressHydrationWarning>
                  {currentUser.workspace_id || "Active Session"}
                </span>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center justify-between text-xs font-bold text-[#D95D0D] hover:text-[#FF8A3D] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" />
                <span>Sign in to continue</span>
              </div>
              <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] font-semibold text-[#A49184] px-1">
          <div className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-[#FF8A3D]" />
            <span>Qwen2.5 · Local</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-[#027A48]" />
            <span className="text-[#027A48] font-bold">28ms</span>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <div className="lg:hidden sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-xl border-b border-[#F4E2D3] shadow-xs">
        <Link href="/" className="flex items-center gap-2">
          <FidelisLogo size={32} showWordmark={true} badgeText="v2.4" />
        </Link>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 rounded-xl text-[#201815] hover:bg-[#FFF5EC] cursor-pointer transition-colors"
          aria-label="Toggle Navigation"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#201815]/20 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 flex flex-col
          bg-white/95 backdrop-blur-xl border-r border-[#F4E2D3]
          shadow-xl shadow-[#FF8A3D]/5
          transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {sidebarMarkup}
      </aside>
    </>
  );
}
