"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  isRouteAllowedForRole,
  getRouteMetadata,
  ROLE_DISPLAY_NAMES,
  UserRole,
} from "@/lib/permissions";
import {
  ShieldAlert,
  LayoutDashboard,
  FileCheck2,
  LogIn,
  AlertTriangle,
  UserCheck,
} from "lucide-react";

interface AccessRestrictionProps {
  currentRole: UserRole;
  userName: string | null;
  targetPath: string;
}

function AccessRestrictionNotice({ currentRole, userName, targetPath }: AccessRestrictionProps) {
  const metadata = getRouteMetadata(targetPath);

  return (
    <div className="min-h-screen bg-[#FFFBF7] text-[#201815] flex">
      <Sidebar />
      <main className="flex-1 lg:pl-64 min-w-0 flex flex-col min-h-screen">
        <div className="flex-1 p-6 md:p-10 max-w-4xl w-full mx-auto flex items-center justify-center">
          <div className="w-full bg-white/95 backdrop-blur-xl border border-[#F4E2D3] rounded-3xl p-8 md:p-10 shadow-xl shadow-[#FF8A3D]/5 space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#F4E2D3]">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FEF3F2] to-[#FEE4E2] border border-[#FECDCA] flex items-center justify-center text-[#B42318] shadow-sm shrink-0">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]">
                      403 · Access Restricted
                    </span>
                    <span className="font-mono text-[11px] font-bold text-[#7C6A5E] bg-[#FFF5EC] px-2 py-0.5 rounded-md border border-[#F4E2D3]">
                      {targetPath}
                    </span>
                  </div>
                  <h1 className="text-xl md:text-2xl font-black text-[#201815] mt-1.5">
                    {metadata?.title || "Restricted System Module"}
                  </h1>
                </div>
              </div>

              <div className="sm:text-right">
                <span className="text-xs font-bold text-[#A49184]">
                  FIDELIS RBAC Guard
                </span>
                <div className="text-[10px] font-mono text-[#D95D0D] font-black">
                  Zero-Trust Enforcement
                </div>
              </div>
            </div>

            <p className="text-sm text-[#7C6A5E] leading-relaxed">
              {metadata?.description ||
                "This workspace route contains sensitive brand governance operations and is restricted to specific authorized roles."}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-[#FFFBF7] border border-[#F4E2D3] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black tracking-wider uppercase text-[#A49184]">
                    Your Active Role
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]">
                    Unauthorized
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg bg-[#FFEAD9] text-[#D95D0D] flex items-center justify-center font-black text-xs"
                    suppressHydrationWarning
                  >
                    {currentRole.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-[#201815]" suppressHydrationWarning>
                      {userName || "Active User"}
                    </div>
                    <div className="text-xs text-[#D95D0D] font-bold" suppressHydrationWarning>
                      {ROLE_DISPLAY_NAMES[currentRole]} ({currentRole})
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#EDFDF5] border border-[#A6F4C5] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black tracking-wider uppercase text-[#027A48]">
                    Required Privilege Level
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white text-[#027A48] border border-[#A6F4C5]">
                    Permitted Roles
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(metadata?.requiredRoles ?? []).map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-1 rounded-lg bg-white text-[#027A48] border border-[#A6F4C5] shadow-2xs"
                    >
                      <UserCheck className="w-3 h-3 text-[#027A48]" />
                      {ROLE_DISPLAY_NAMES[role]}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#FFFBF7] to-[#FFF5EC] border border-[#F4E2D3] flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#D95D0D] shrink-0 mt-0.5" />
              <div className="text-xs text-[#7C6A5E] leading-relaxed">
                <span className="font-extrabold text-[#201815]">
                  Separation of Duties Policy:{" "}
                </span>
                To maintain enterprise compliance and brand safety, FIDELIS strictly prevents
                unauthorized roles from compiling brand rules, inspecting citations, or signing
                release receipts.
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF8A3D] to-[#FF5F0F] text-white text-xs font-black shadow-md shadow-[#FF8A3D]/25 hover:shadow-lg hover:shadow-[#FF8A3D]/35 transition-all"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Return to Dashboard</span>
              </Link>

              <Link
                href="/review"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#201815] border border-[#F4E2D3] text-xs font-bold hover:bg-[#FFF5EC] hover:text-[#D95D0D] transition-colors"
              >
                <FileCheck2 className="w-4 h-4 text-[#FF8A3D]" />
                <span>Open Review Studio</span>
              </Link>

              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#7C6A5E] border border-[#F4E2D3] text-xs font-bold hover:bg-[#FFF5EC] hover:text-[#201815] transition-colors sm:ml-auto"
              >
                <LogIn className="w-4 h-4 text-[#A49184]" />
                <span>Switch Account / Sign In</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const PUBLIC_VIEW_CHANNELS = new Set(["/", "/login", "/intro"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>("ADMIN");
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const syncSession = () => {
      const storedRole = localStorage.getItem("fidelis_user_role") || localStorage.getItem("canon_user_role");
      const storedName = localStorage.getItem("fidelis_user_name") || localStorage.getItem("canon_user_name");

      if (
        storedRole &&
        [
          "ADMIN",
          "BRAND_MANAGER",
          "CREATOR",
          "AUTHORISED_REVIEWER",
          "APPROVER",
        ].includes(storedRole.toUpperCase())
      ) {
        setCurrentRole(storedRole.toUpperCase() as UserRole);
      } else {
        setCurrentRole("CREATOR");
      }
      setUserName(storedName);
    };

    syncSession();
    window.addEventListener("storage", syncSession);
    window.addEventListener("fidelis_user_changed", syncSession);
    window.addEventListener("canon_user_changed", syncSession);
    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener("fidelis_user_changed", syncSession);
      window.removeEventListener("canon_user_changed", syncSession);
    };
  }, [pathname]);

  if (PUBLIC_VIEW_CHANNELS.has(pathname)) {
    return (
      <div className="min-h-screen bg-[#FFFBF7] text-[#201815] flex flex-col">
        {children}
      </div>
    );
  }

  const isPermitted = !mounted || isRouteAllowedForRole(pathname, currentRole);

  if (!isPermitted) {
    return (
      <AccessRestrictionNotice
        currentRole={currentRole}
        userName={userName}
        targetPath={pathname}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBF7] text-[#201815] flex">
      <Sidebar />
      <main className="flex-1 lg:pl-64 min-w-0 flex flex-col min-h-screen">
        <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
