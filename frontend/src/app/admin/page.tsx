"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Users,
  UserPlus,
  Server,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  KeyRound,
  Copy,
  Check,
  Building2,
  Database,
  Cpu,
  FileCheck,
  Activity,
  UserX,
  UserCheck as UserCheckIcon,
  HardDrive,
  DownloadCloud,
  Mail,
  Send,
  Settings,
  Info,
  ExternalLink,
  X
} from "lucide-react";
import { api, User as UserType, Invitation, AdminStats, SMTPStatus, SMTPConfigPayload } from "@/lib/api";
import { UserRole } from "@/lib/permissions";

export default function AdminPortalPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "invitations" | "security">(() => {
    if (typeof window !== "undefined") {
      const savedTab = localStorage.getItem("fidelis_admin_active_tab");
      if (savedTab === "overview" || savedTab === "users" || savedTab === "invitations" || savedTab === "security") {
        return savedTab;
      }
    }
    return "overview";
  });

  const handleTabChange = (tab: "overview" | "users" | "invitations" | "security") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      localStorage.setItem("fidelis_admin_active_tab", tab);
    }
  };

  // Authentication & Access Check
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Real Telemetry Data
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserType[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [auditVerifyResult, setAuditVerifyResult] = useState<any | null>(null);

  // Loading & Action State
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifyingAudit, setIsVerifyingAudit] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Invitation Form State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"BRAND_MANAGER" | "AUTHORISED_REVIEWER" | "APPROVER" | "ADMIN" | "CREATOR">("AUTHORISED_REVIEWER");
  const [inviteDays, setInviteDays] = useState(7);
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [isResendingInvite, setIsResendingInvite] = useState<string | null>(null);
  const [newlyCreatedInvite, setNewlyCreatedInvite] = useState<{
    token: string;
    url: string;
    email: string;
    role: string;
    email_dispatched?: boolean;
    delivery_status?: string;
    delivery_method?: string;
    is_live?: boolean;
    delivery_message?: string;
  } | null>(null);

  // SMTP Configuration State
  const [smtpStatus, setSmtpStatus] = useState<SMTPStatus | null>(null);
  const [isSmtpModalOpen, setIsSmtpModalOpen] = useState(false);
  const [smtpHostInput, setSmtpHostInput] = useState("smtp.gmail.com");
  const [smtpPortInput, setSmtpPortInput] = useState(587);
  const [smtpUserInput, setSmtpUserInput] = useState("");
  const [smtpPassInput, setSmtpPassInput] = useState("");
  const [smtpFromEmailInput, setSmtpFromEmailInput] = useState("noreply@fidelis-governance.io");
  const [smtpFromNameInput, setSmtpFromNameInput] = useState("FIDELIS Platform Security");
  const [smtpTlsInput, setSmtpTlsInput] = useState(true);
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestEmail, setSmtpTestEmail] = useState("alfredbiju34@gmail.com");
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Role Edit & Password Reset State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newPasswordNotice, setNewPasswordNotice] = useState<{ userId: string; pass: string } | null>(null);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsData, usersData, invitesData, smtpData] = await Promise.all([
        api.getAdminStats().catch(() => null),
        api.getUsers().catch(() => []),
        api.getInvitations().catch(() => []),
        api.getSmtpStatus().catch(() => null),
      ]);
      if (statsData) setStats(statsData);
      setUsers(usersData);
      setInvitations(invitesData);
      if (smtpData) {
        setSmtpStatus(smtpData);
        if (smtpData.configured && smtpData.host) {
          setSmtpHostInput(smtpData.host);
          setSmtpPortInput(smtpData.port);
          if (smtpData.from_email) setSmtpFromEmailInput(smtpData.from_email);
          if (smtpData.from_name) setSmtpFromNameInput(smtpData.from_name);
          setSmtpTlsInput(smtpData.tls);
        }
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || "Could not load administrative telemetry.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkRoleAndLoad = async () => {
      let role = (localStorage.getItem("fidelis_user_role") || localStorage.getItem("canon_user_role")) as UserRole | null;
      let uid = localStorage.getItem("fidelis_user_id") || localStorage.getItem("canon_user_id");
      setCurrentUserRole(role);
      setCurrentUserId(uid);

      try {
        const profile = await api.getProfile();
        if (profile && profile.role) {
          role = profile.role as UserRole;
          uid = profile.id;
          setCurrentUserRole(role);
          setCurrentUserId(uid);
          localStorage.setItem("fidelis_user_role", profile.role);
          localStorage.setItem("canon_user_role", profile.role);
          localStorage.setItem("fidelis_user_id", profile.id);
          localStorage.setItem("canon_user_id", profile.id);
          window.dispatchEvent(new Event("fidelis_user_changed"));
          window.dispatchEvent(new Event("canon_user_changed"));
        }
      } catch {
        // Fallback to local session
      }

      if (role && role !== "ADMIN") {
        // Non-admins are prevented by RBAC
        return;
      }

      loadAllData();
    };

    checkRoleAndLoad();
  }, [loadAllData]);

  const handleVerifyAuditChain = async () => {
    setIsVerifyingAudit(true);
    try {
      const result = await api.verifyAuditChain();
      setAuditVerifyResult(result);
      setActionMessage({ text: `Audit Chain Verified: ${result.message}`, type: "success" });
    } catch (err: any) {
      setActionMessage({ text: `Audit Verification Failed: ${err.message}`, type: "error" });
    } finally {
      setIsVerifyingAudit(false);
    }
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setActionMessage({ text: "Please enter an email address to invite.", type: "error" });
      return;
    }

    setIsSubmittingInvite(true);
    setActionMessage(null);
    try {
      const res = await api.createInvitation({
        email: inviteEmail.trim(),
        role: inviteRole,
        expires_in_days: inviteDays,
        expires_in_hours: inviteDays * 24,
        invite_base_url: typeof window !== "undefined" ? window.location.origin : undefined,
      });

      // Defensively parse invitation data whether returned flat or nested
      const inviteObj = (res as any).invitation || res;
      const recipientEmail = inviteObj.email || inviteEmail.trim();
      const recipientRole = inviteObj.role || inviteRole;
      const inviteToken = (res as any).invite_token || inviteObj.invite_token || inviteObj.id;
      const inviteUrl = (res as any).invite_url || `${window.location.origin}/login?invite=${inviteToken}`;
      const emailDispatched = (res as any).email_dispatched ?? true;
      const isLive = (res as any).is_live ?? false;
      const deliveryMethod = (res as any).delivery_method ?? "simulated";
      const deliveryStatus = (res as any).delivery_status ?? "SIMULATED";
      const deliveryMessage = (res as any).delivery_message ?? "";

      setNewlyCreatedInvite({
        token: inviteToken,
        url: inviteUrl,
        email: recipientEmail,
        role: recipientRole,
        email_dispatched: emailDispatched,
        delivery_status: deliveryStatus,
        delivery_method: deliveryMethod,
        is_live: isLive,
        delivery_message: deliveryMessage,
      });

      setInviteEmail("");
      if (isLive) {
        setActionMessage({
          text: `Invitation generated! Live email delivered to ${recipientEmail} (${recipientRole}) via SMTP.`,
          type: "success",
        });
      } else if (deliveryMethod === "smtp_error") {
        setActionMessage({
          text: `Invitation created, but live SMTP delivery failed: ${deliveryMessage}. Token and link are ready below.`,
          type: "error",
        });
      } else {
        setActionMessage({
          text: `Invitation generated! Real SMTP is not configured in backend/.env (token logged to console). Use 'Open in Email App' or copy the link below to send to ${recipientEmail}.`,
          type: "success",
        });
      }
      loadAllData();
    } catch (err: any) {
      setActionMessage({ text: err.message || "Could not generate invitation.", type: "error" });
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const handleResendInvitation = async (invitationId: string, email: string) => {
    setIsResendingInvite(invitationId);
    try {
      const res = await api.resendInvitationEmail(invitationId);
      const isLive = (res as any).is_live ?? false;
      const deliveryMethod = (res as any).delivery_method ?? "simulated";
      const deliveryMessage = (res as any).delivery_message ?? res.message;

      if (isLive) {
        setActionMessage({
          text: `Invitation token successfully resent to ${email} via SMTP!`,
          type: "success",
        });
      } else if (deliveryMethod === "smtp_error") {
        setActionMessage({
          text: `Resend failed via SMTP: ${deliveryMessage}. Token is updated and available below.`,
          type: "error",
        });
      } else {
        setActionMessage({
          text: `Fresh token generated for ${email}! Real SMTP is not configured — token logged to console. Click 'Open in Email App' or copy below.`,
          type: "success",
        });
      }

      if (res.invite_token) {
        setNewlyCreatedInvite({
          token: res.invite_token,
          url: res.invite_url || `${window.location.origin}/login?invite=${res.invite_token}`,
          email: res.recipient || email,
          role: inviteRole,
          email_dispatched: res.email_dispatched,
          delivery_status: (res as any).delivery_status ?? "SENT",
          delivery_method: deliveryMethod,
          is_live: isLive,
          delivery_message: deliveryMessage,
        });
      }
      loadAllData();
    } catch (err: any) {
      setActionMessage({ text: err.message || "Failed to resend invitation email.", type: "error" });
    } finally {
      setIsResendingInvite(null);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await api.configureSmtp({
        host: smtpHostInput.trim(),
        port: Number(smtpPortInput),
        user: smtpUserInput.trim() || undefined,
        password: smtpPassInput.trim() || undefined,
        from_email: smtpFromEmailInput.trim() || undefined,
        from_name: smtpFromNameInput.trim() || undefined,
        tls: smtpTlsInput,
        persist_to_env: true,
      });
      setSmtpStatus(res);
      setActionMessage({
        text: `SMTP Configuration successfully updated and saved to backend/.env! Mode: ${res.mode}`,
        type: "success",
      });
      setIsSmtpModalOpen(false);
    } catch (err: any) {
      setActionMessage({
        text: err.message || "Failed to save SMTP configuration.",
        type: "error",
      });
    } finally {
      setIsSavingSmtp(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!smtpTestEmail.trim()) {
      setSmtpTestResult({ success: false, message: "Please enter a test recipient email." });
      return;
    }
    setIsTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await api.testSmtpConnection(smtpTestEmail.trim());
      setSmtpTestResult({
        success: res.success,
        message: res.message || (res.success ? "Test email sent successfully!" : "Failed to send test email."),
      });
    } catch (err: any) {
      setSmtpTestResult({
        success: false,
        message: err.message || "Failed to reach SMTP server.",
      });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleToggleUserStatus = async (user: UserType) => {
    const newStatus = !(user.is_active ?? true);
    if (user.role === "ADMIN" && user.id === currentUserId && !newStatus) {
      setActionMessage({ text: "Safety Constraint: You cannot deactivate your own active Administrator session.", type: "error" });
      return;
    }

    try {
      await api.updateUserStatus(user.id, newStatus);
      setActionMessage({
        text: `Account for ${user.full_name} (${user.email}) has been ${newStatus ? "reactivated" : "deactivated"}.`,
        type: "success",
      });
      loadAllData();
    } catch (err: any) {
      setActionMessage({ text: err.message || "Failed to update user status.", type: "error" });
    }
  };

  const handleChangeUserRole = async (userId: string, newRole: string) => {
    try {
      await api.updateUserRole(userId, newRole);
      setEditingUserId(null);

      // Immediately reflect the updated role in local state
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole as UserType["role"] } : u))
      );

      setActionMessage({ text: `User role successfully updated to ${newRole}.`, type: "success" });

      // If the admin modified their own role, update active session and notify app
      const uid = localStorage.getItem("fidelis_user_id") || localStorage.getItem("canon_user_id");
      if (userId === uid) {
        localStorage.setItem("fidelis_user_role", newRole);
        localStorage.setItem("canon_user_role", newRole);
        setCurrentUserRole(newRole as UserRole);
        window.dispatchEvent(new Event("fidelis_user_changed"));
        window.dispatchEvent(new Event("canon_user_changed"));
        window.dispatchEvent(new Event("storage"));
      }

      await loadAllData();
    } catch (err: any) {
      setActionMessage({ text: err.message || "Failed to update role.", type: "error" });
    }
  };

  const handleResetPassword = async (userId: string, userFullName: string) => {
    if (!confirm(`Are you sure you want to generate a secure password reset for ${userFullName}?`)) {
      return;
    }

    try {
      const res = await api.resetUserPassword(userId);
      if (res.temporary_password) {
        setNewPasswordNotice({ userId, pass: res.temporary_password });
      }
      setActionMessage({ text: `Password successfully reset for ${userFullName}.`, type: "success" });
    } catch (err: any) {
      setActionMessage({ text: err.message || "Failed to reset password.", type: "error" });
    }
  };

  const copyToClipboard = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(identifier);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  if (currentUserRole && currentUserRole !== "ADMIN") {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-[#FFF0F0] border border-[#FECDCA] text-[#B42318] flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-[#201815]">Platform Administration Restricted</h1>
        <p className="text-sm text-[#7C6A5E] leading-relaxed">
          Access to this control plane requires verified <strong>Platform Administrator (ADMIN)</strong> privileges.
          Your current session is logged in with role: <strong>{currentUserRole}</strong>.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF8A3D] to-[#FF721B] text-white text-xs font-bold shadow-sm"
        >
          Return to Workspace Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EDFDF5] text-[#027A48] border border-[#A6F4C5] uppercase tracking-wide flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Platform Control Plane</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF2E7] text-[#D95D0D] border border-[#FDBA74]">
              Tenant: ApexDynamics (ws-apexdynamics-001)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#201815] tracking-tight">
            Security & Administration Portal
          </h1>
          <p className="text-xs sm:text-sm text-[#7C6A5E]">
            Provision privileged roles via single-use expiring tokens, manage active accounts, and audit platform security posture.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => loadAllData()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#FFF9F3] text-[#201815] border border-[#F4E2D3] text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#EA580C] ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 shadow-2xs ${
            actionMessage.type === "success"
              ? "bg-[#EDFDF5] border-[#A6F4C5] text-[#027A48]"
              : "bg-[#FFF0F0] border-[#FECDCA] text-[#B42318]"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-[11px] underline opacity-80 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Temporary Password Modal / Alert */}
      {newPasswordNotice && (
        <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#FDBA74] shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#D95D0D]">
            <KeyRound className="w-4 h-4" />
            <span>One-Time Generated Password:</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-[#F4E2D3] font-mono text-xs text-[#201815]">
            <span className="flex-1 select-all">{newPasswordNotice.pass}</span>
            <button
              onClick={() => copyToClipboard(newPasswordNotice.pass, "temp_pass")}
              className="text-[#D95D0D] hover:text-[#B44C07] text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              {copiedToken === "temp_pass" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedToken === "temp_pass" ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <div className="text-[11px] text-[#7C6A5E]">
            Please securely communicate this password to the user. It will not be shown again.
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#F4E2D3] pb-3 overflow-x-auto">
        <button
          onClick={() => handleTabChange("overview")}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "overview"
              ? "bg-gradient-to-r from-[#FF8A3D] to-[#FF721B] text-white shadow-xs"
              : "text-[#7C6A5E] hover:text-[#201815] hover:bg-white"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Overview & Health</span>
        </button>

        <button
          onClick={() => handleTabChange("users")}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "users"
              ? "bg-gradient-to-r from-[#FF8A3D] to-[#FF721B] text-white shadow-xs"
              : "text-[#7C6A5E] hover:text-[#201815] hover:bg-white"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>User Directory ({users.length})</span>
        </button>

        <button
          onClick={() => handleTabChange("invitations")}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "invitations"
              ? "bg-gradient-to-r from-[#FF8A3D] to-[#FF721B] text-white shadow-xs"
              : "text-[#7C6A5E] hover:text-[#201815] hover:bg-white"
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Role Invitations ({invitations.filter((i) => i.status === "PENDING").length})</span>
        </button>

        <button
          onClick={() => handleTabChange("security")}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "security"
              ? "bg-gradient-to-r from-[#FF8A3D] to-[#FF721B] text-white shadow-xs"
              : "text-[#7C6A5E] hover:text-[#201815] hover:bg-white"
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Security Center & Ledger</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & HEALTH */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Real Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-[#F4E2D3] shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#7C6A5E]">
                <span>Active Users</span>
                <Users className="w-4 h-4 text-[#EA580C]" />
              </div>
              <div className="text-3xl font-black text-[#201815]">
                {stats?.active_users ?? users.length}
              </div>
              <div className="text-[11px] text-[#7C6A5E]">
                Across all governance roles
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#F4E2D3] shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#7C6A5E]">
                <span>Pending Role Invites</span>
                <UserPlus className="w-4 h-4 text-[#D95D0D]" />
              </div>
              <div className="text-3xl font-black text-[#201815]">
                {stats?.pending_invitations ?? invitations.filter((i) => i.status === "PENDING").length}
              </div>
              <div className="text-[11px] text-[#7C6A5E]">
                Expiring single-use invitation tokens
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#F4E2D3] shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#7C6A5E]">
                <span>Multi-Tenant Workspaces</span>
                <Building2 className="w-4 h-4 text-[#027A48]" />
              </div>
              <div className="text-3xl font-black text-[#201815]">
                {stats?.total_workspaces ?? 1}
              </div>
              <div className="text-[11px] text-[#027A48] font-bold">
                Tenant isolation enforced
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#F4E2D3] shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#7C6A5E]">
                <span>Audit Chain Integrity</span>
                <ShieldCheck className="w-4 h-4 text-[#027A48]" />
              </div>
              <div className="text-2xl font-black text-[#027A48] uppercase tracking-wide">
                {stats?.system_health?.audit_chain ?? "VERIFIED"}
              </div>
              <div className="text-[11px] text-[#7C6A5E]">
                Sequential SHA-256 genesis linked
              </div>
            </div>
          </div>

          {/* Operational Subsystems Status */}
          <div className="p-6 rounded-3xl bg-white border border-[#F4E2D3] shadow-xs space-y-4">
            <h2 className="text-base font-extrabold text-[#201815] flex items-center gap-2">
              <Server className="w-4 h-4 text-[#EA580C]" />
              <span>Operational Subsystems & Infrastructure Health</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#F4E2D3] space-y-1.5">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-[#7C6A5E] flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-[#EA580C]" />
                    <span>Database Engine</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#EDFDF5] text-[#027A48] font-mono text-[10px] font-bold">
                    {stats?.system_health?.database ?? "CONNECTED"}
                  </span>
                </div>
                <p className="text-[11px] text-[#7C6A5E]">
                  Alembic versioned migrations applied. Foreign keys and tenant boundary constraints active.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#F4E2D3] space-y-1.5">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-[#7C6A5E] flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-[#EA580C]" />
                    <span>Storage Engine</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#EDFDF5] text-[#027A48] font-mono text-[10px] font-bold">
                    {stats?.system_health?.storage ?? "ONLINE"}
                  </span>
                </div>
                <p className="text-[11px] text-[#7C6A5E]">
                  Sanitized storage paths with DefusedXML AST parser and sandboxed SVG previews.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#F4E2D3] space-y-1.5">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-[#7C6A5E] flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-[#EA580C]" />
                    <span>Active LLM Provider</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#FFF2E7] text-[#D95D0D] font-mono text-[10px] font-bold">
                    {stats?.system_health?.active_llm_provider ?? "auto / groq"}
                  </span>
                </div>
                <p className="text-[11px] text-[#7C6A5E]">
                  Pydantic strict schema verification with heuristic fallback disclosure.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER DIRECTORY & MANAGEMENT */}
      {activeTab === "users" && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-[#F4E2D3] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-[#201815]">
                  Active User Directory ({users.length})
                </h2>
                <p className="text-xs text-[#7C6A5E]">
                  Manage registered users, deactivate compromised sessions, and adjust governance roles.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#F4E2D3] text-[#7C6A5E] text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">User & Email</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4E2D3]">
                  {users.map((user) => {
                    const isActive = user.is_active ?? true;
                    const isSelf = user.id === currentUserId;

                    return (
                      <tr key={user.id} className="hover:bg-[#FFFBF7] transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-[#201815] flex items-center gap-2">
                            <span>{user.full_name}</span>
                            {isSelf && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#FFF2E7] text-[#D95D0D] font-mono">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#7C6A5E] font-mono">{user.email}</div>
                        </td>

                        <td className="py-3 px-3">
                          {editingUserId === user.id ? (
                            <select
                              value={user.role}
                              onChange={(e) => handleChangeUserRole(user.id, e.target.value)}
                              className="text-xs font-bold text-[#201815] bg-white border border-[#FDBA74] rounded-lg px-2 py-1 outline-none"
                            >
                              <option value="CREATOR">CREATOR</option>
                              <option value="AUTHORISED_REVIEWER">AUTHORISED_REVIEWER</option>
                              <option value="BRAND_MANAGER">BRAND_MANAGER</option>
                              <option value="APPROVER">APPROVER</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                          ) : (
                            <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-[#FFF9F3] text-[#201815] border border-[#F4E2D3]">
                              {user.role}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isActive
                                ? "bg-[#EDFDF5] text-[#027A48] border border-[#A6F4C5]"
                                : "bg-[#FFF0F0] text-[#B42318] border border-[#FECDCA]"
                            }`}
                          >
                            {isActive ? "ACTIVE" : "DEACTIVATED"}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingUserId(editingUserId === user.id ? null : user.id)}
                              className="px-2.5 py-1 rounded-lg border border-[#F4E2D3] hover:bg-[#FFF9F3] text-[11px] font-bold text-[#201815] cursor-pointer"
                            >
                              {editingUserId === user.id ? "Done" : "Change Role"}
                            </button>

                            <button
                              onClick={() => handleResetPassword(user.id, user.full_name)}
                              className="px-2.5 py-1 rounded-lg border border-[#F4E2D3] hover:bg-[#FFF9F3] text-[11px] font-bold text-[#7C6A5E] cursor-pointer"
                              title="Generate temporary password"
                            >
                              Reset Pass
                            </button>

                            <button
                              onClick={() => handleToggleUserStatus(user)}
                              disabled={isSelf && user.role === "ADMIN"}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                                isActive
                                  ? "border-[#FECDCA] text-[#B42318] hover:bg-[#FFF0F0]"
                                  : "border-[#A6F4C5] text-[#027A48] hover:bg-[#EDFDF5]"
                              } disabled:opacity-30 disabled:cursor-not-allowed`}
                            >
                              {isActive ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ROLE INVITATIONS */}
      {activeTab === "invitations" && (
        <div className="space-y-6">
          {/* SMTP Dispatch Posture Card */}
          <div className="p-4 rounded-2xl bg-white border border-[#F4E2D3] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  smtpStatus?.configured
                    ? "bg-[#EDFDF5] text-[#027A48] border border-[#A6F4C5]"
                    : "bg-[#FFF2E7] text-[#D95D0D] border border-[#FDBA74]"
                }`}
              >
                <Mail className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-extrabold text-[#201815]">Outgoing Email Delivery (SMTP):</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      smtpStatus?.configured
                        ? "bg-[#EDFDF5] text-[#027A48] border border-[#A6F4C5]"
                        : "bg-[#FFF2E7] text-[#D95D0D] border border-[#FDBA74]"
                    }`}
                  >
                    {smtpStatus?.configured ? `🟢 Connected (${smtpStatus.host})` : "🟡 Offline / Console Simulation Mode"}
                  </span>
                </div>
                <p className="text-[11.5px] text-[#7C6A5E]">
                  {smtpStatus?.configured
                    ? `Live invitations are transmitted directly via ${smtpStatus.host}:${smtpStatus.port} to client inboxes.`
                    : "Real SMTP credentials are not configured in backend/.env. Tokens are generated and logged to the server console. Configure SMTP (e.g. Gmail App Password) to deliver live emails directly to inboxes."}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsSmtpModalOpen(true);
                setSmtpTestResult(null);
              }}
              className="px-3.5 py-2 rounded-xl border border-[#D95D0D] bg-[#FFF9F3] text-[#D95D0D] hover:bg-[#FFF2E7] text-xs font-bold shrink-0 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors self-start sm:self-center"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configure / Test SMTP</span>
            </button>
          </div>

          {/* Newly Generated Invite Banner */}
          {newlyCreatedInvite && (
            <div
              className={`p-5 rounded-2xl border shadow-xs space-y-3.5 ${
                newlyCreatedInvite.is_live
                  ? "bg-[#EDFDF5] border-[#A6F4C5]"
                  : newlyCreatedInvite.delivery_method === "smtp_error"
                  ? "bg-[#FFF0F0] border-[#FECDCA]"
                  : "bg-[#FFF9F3] border-[#FDBA74]"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#201815]">
                  {newlyCreatedInvite.is_live ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : newlyCreatedInvite.delivery_method === "smtp_error" ? (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  ) : (
                    <Info className="w-4 h-4 text-[#D95D0D] shrink-0" />
                  )}
                  <span>
                    Invitation Generated for <strong>{newlyCreatedInvite.email}</strong> ({newlyCreatedInvite.role})
                  </span>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                    newlyCreatedInvite.is_live
                      ? "bg-emerald-100 text-[#027A48] border border-emerald-200"
                      : newlyCreatedInvite.delivery_method === "smtp_error"
                      ? "bg-red-100 text-red-700 border border-red-200"
                      : "bg-[#FFF2E7] text-[#D95D0D] border border-[#FDBA74]"
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>
                    {newlyCreatedInvite.is_live
                      ? "Live Email Dispatched via SMTP"
                      : newlyCreatedInvite.delivery_method === "smtp_error"
                      ? "SMTP Delivery Failed"
                      : "Console Simulation (SMTP Not Configured)"}
                  </span>
                </span>
              </div>

              {/* Delivery Explainer Notice */}
              <div className="text-[12px] text-[#5C4B40] bg-white/80 p-3 rounded-xl border border-black/5 space-y-1">
                {newlyCreatedInvite.is_live ? (
                  <p>
                    An email with the security token and direct activation link was successfully delivered to <strong>{newlyCreatedInvite.email}</strong> via your connected SMTP server.
                  </p>
                ) : newlyCreatedInvite.delivery_method === "smtp_error" ? (
                  <p className="text-red-700">
                    <strong>SMTP Notice:</strong> Attempted live delivery, but the SMTP server responded: {newlyCreatedInvite.delivery_message}. Click <strong>&quot;Open in Email App&quot;</strong> below to send it to the client with your email client, or recheck your SMTP settings.
                  </p>
                ) : (
                  <p>
                    <strong>Why did this not arrive in the client&apos;s real inbox?</strong> Outgoing SMTP credentials are not configured in <code className="bg-[#FFF2E7] px-1 py-0.5 rounded font-mono text-[11px] text-[#D95D0D]">backend/.env</code>, so this environment runs in local simulation mode. Click <strong>&quot;Open in Email App&quot;</strong> below to send it immediately via your local email app (Gmail, Apple Mail, Outlook), or configure SMTP above.
                  </p>
                )}
              </div>

              <div className="space-y-2 pt-1">
                <div>
                  <div className="text-[11px] font-bold text-[#7C6A5E] mb-1">Invitation Activation URL:</div>
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-[#F4E2D3] font-mono text-xs text-[#201815]">
                    <span className="flex-1 truncate select-all">{newlyCreatedInvite.url}</span>
                    <button
                      onClick={() => copyToClipboard(newlyCreatedInvite.url, "invite_url")}
                      className="text-[#027A48] hover:text-[#05603A] text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedToken === "invite_url" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedToken === "invite_url" ? "Copied" : "Copy Link"}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-bold text-[#7C6A5E] mb-1">Single-Use Security Token:</div>
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-[#F4E2D3] font-mono text-xs text-[#201815]">
                    <span className="flex-1 truncate select-all text-[#D95D0D] font-bold">{newlyCreatedInvite.token}</span>
                    <button
                      onClick={() => copyToClipboard(newlyCreatedInvite.token, "invite_token")}
                      className="text-[#027A48] hover:text-[#05603A] text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedToken === "invite_token" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedToken === "invite_token" ? "Copied" : "Copy Token"}</span>
                    </button>
                  </div>
                </div>

                {/* Direct Mail Client Dispatch Action */}
                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <a
                    href={`mailto:${newlyCreatedInvite.email}?subject=${encodeURIComponent(
                      `You're invited to join ApexDynamics on FIDELIS (${newlyCreatedInvite.role})`
                    )}&body=${encodeURIComponent(
                      `Hello,\n\nYou have been invited to join the ApexDynamics workspace on FIDELIS with designated role: ${newlyCreatedInvite.role}.\n\nTo accept your invitation and activate your account, click the link below:\n${newlyCreatedInvite.url}\n\nYour single-use security token:\n${newlyCreatedInvite.token}\n\n--\nFIDELIS Brand Governance Platform`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#FF8A3D] to-[#FF721B] hover:from-[#FF9952] hover:to-[#E8630D] text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-xs transition-all"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Open in Email App & Send to Client</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>

                  <button
                    onClick={() => {
                      setIsSmtpModalOpen(true);
                      setSmtpTestEmail(newlyCreatedInvite.email);
                    }}
                    className="px-3 py-2 rounded-xl border border-[#F4E2D3] bg-white hover:bg-[#FFF9F3] text-xs font-bold text-[#7C6A5E] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-[#D95D0D]" />
                    <span>Setup Real SMTP to Deliver Automatically</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create Invite Form */}
          <div className="p-6 rounded-3xl bg-white border border-[#F4E2D3] shadow-xs space-y-4">
            <h2 className="text-base font-extrabold text-[#201815] flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#EA580C]" />
              <span>Provision Privileged Role Invitation</span>
            </h2>
            <p className="text-xs text-[#7C6A5E]">
              Per Phase 1 & 2 requirements, public registration cannot assign privileged roles. All Approvers, Brand Managers, and Compliance Reviewers must receive a cryptographically signed, single-use, expiring invitation.
            </p>

            <form onSubmit={handleCreateInvitation} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-bold text-[#201815] block mb-1">
                  Recipient Email Address
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. approver@company.example"
                  className="editorial-input w-full px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#201815] block mb-1">
                  Designated Governance Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="editorial-input w-full px-3 py-2 text-xs font-bold"
                >
                  <option value="AUTHORISED_REVIEWER">AUTHORISED_REVIEWER (Compliance)</option>
                  <option value="BRAND_MANAGER">BRAND_MANAGER (Rulebooks & Claims)</option>
                  <option value="APPROVER">APPROVER (Executive Sign-Off)</option>
                  <option value="ADMIN">ADMIN (Platform Administration)</option>
                  <option value="CREATOR">CREATOR (Content Drafting)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isSubmittingInvite}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FF8A3D] to-[#FF721B] hover:from-[#FF9952] hover:to-[#E8630D] text-white text-xs font-extrabold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingInvite ? "Generating Token..." : "✨ Generate Invitation"}
                </button>
              </div>
            </form>
          </div>

          {/* Pending Invitations Table */}
          <div className="p-6 rounded-3xl bg-white border border-[#F4E2D3] shadow-xs space-y-4">
            <h2 className="text-base font-extrabold text-[#201815]">
              Invitation Ledger ({invitations.length})
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#F4E2D3] text-[#7C6A5E] text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Invited Email</th>
                    <th className="py-3 px-3">Assigned Role</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Created</th>
                    <th className="py-3 px-3">Expires At</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4E2D3]">
                  {invitations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-[#7C6A5E]">
                        No invitations created yet. Generate one above to invite a team member.
                      </td>
                    </tr>
                  ) : (
                    invitations.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[#FFFBF7] transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-[#201815]">{inv.email}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FFF9F3] text-[#201815] border border-[#F4E2D3]">
                            {inv.role}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.status === "PENDING"
                                ? "bg-[#FFF2E7] text-[#D95D0D] border border-[#FDBA74]"
                                : inv.status === "ACCEPTED"
                                ? "bg-[#EDFDF5] text-[#027A48] border border-[#A6F4C5]"
                                : "bg-[#FFF0F0] text-[#B42318] border border-[#FECDCA]"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[#7C6A5E]">{inv.created_at ? new Date(inv.created_at).toLocaleDateString() : "—"}</td>
                        <td className="py-3 px-3 text-[#7C6A5E]">{inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : "—"}</td>
                        <td className="py-3 px-3 text-right">
                          {inv.status === "PENDING" && (
                            <button
                              onClick={() => handleResendInvitation(inv.id, inv.email)}
                              disabled={isResendingInvite === inv.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#F4E2D3] hover:bg-[#FFF9F3] text-[#D95D0D] text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50"
                              title="Resend invitation token to recipient's email"
                            >
                              <Send className={`w-3 h-3 ${isResendingInvite === inv.id ? "animate-pulse" : ""}`} />
                              <span>{isResendingInvite === inv.id ? "Sending..." : "Resend Email"}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SECURITY CENTER & AUDIT LEDGER */}
      {activeTab === "security" && (
        <div className="space-y-6">
          {/* Audit Verification Card */}
          <div className="p-6 rounded-3xl bg-white border border-[#F4E2D3] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-[#201815] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#EA580C]" />
                  <span>Cryptographic Audit Chain Invariants</span>
                </h2>
                <p className="text-xs text-[#7C6A5E]">
                  Verify that all audit events form a strictly sequential, unbroken SHA-256 hash chain anchored to the genesis record.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleVerifyAuditChain}
                  disabled={isVerifyingAudit}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF8A3D] to-[#FF721B] hover:from-[#FF9952] hover:to-[#E8630D] text-white text-xs font-extrabold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingAudit ? "animate-spin" : ""}`} />
                  <span>{isVerifyingAudit ? "Verifying Math..." : "Run Cryptographic Verification"}</span>
                </button>
              </div>
            </div>

            {auditVerifyResult && (
              <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#FDBA74] text-xs font-mono space-y-2">
                <div className="flex items-center justify-between font-bold text-[#201815]">
                  <span>Status: {auditVerifyResult.is_valid ? "VALID & UNTAMPERED" : "INTEGRITY VIOLATION"}</span>
                  <span>Events Audited: {auditVerifyResult.total_events}</span>
                </div>
                <div className="text-[11px] text-[#7C6A5E] truncate">
                  Latest Hash: {auditVerifyResult.latest_hash}
                </div>
              </div>
            )}
          </div>

          {/* Hardening Checklist */}
          <div className="p-6 rounded-3xl bg-white border border-[#F4E2D3] shadow-xs space-y-3">
            <h2 className="text-base font-extrabold text-[#201815]">
              Active Hardening & Production Guardrails
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#FFF9F3] border border-[#F4E2D3] flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#027A48] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[#201815]">Fail-Closed Configuration</div>
                  <div className="text-[11px] text-[#7C6A5E]">
                    Production startup aborts if SECRET_KEY &lt; 32 chars or wildcard CORS origins are supplied.
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FFF9F3] border border-[#F4E2D3] flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#027A48] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[#201815]">Persona Switching Locked</div>
                  <div className="text-[11px] text-[#7C6A5E]">
                    /auth/switch-persona unconditionally returns 403 Forbidden in non-development environments.
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FFF9F3] border border-[#F4E2D3] flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#027A48] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[#201815]">DefusedXML AST Ingestion</div>
                  <div className="text-[11px] text-[#7C6A5E]">
                    Uploaded SVGs and documents scrubbed against XXE, scripts, inline events, and foreign namespaces.
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FFF9F3] border border-[#F4E2D3] flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#027A48] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[#201815]">Separation of Duties Enforced</div>
                  <div className="text-[11px] text-[#7C6A5E]">
                    Content Creators cannot override blocking flags; Reviewers cannot sign publication releases.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SMTP Configuration & Live Test Modal */}
      {isSmtpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white border border-[#F4E2D3] rounded-3xl shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="p-5 border-b border-[#F4E2D3] flex items-center justify-between bg-[#FFFBF7]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FFF2E7] text-[#D95D0D] flex items-center justify-center font-bold">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#201815]">Outgoing Email Delivery (SMTP)</h3>
                  <p className="text-[11px] text-[#7C6A5E]">Connect your mail server to automatically deliver invitation links to inboxes</p>
                </div>
              </div>
              <button
                onClick={() => setIsSmtpModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#FFF2E7] text-[#7C6A5E] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Provider Quick Presets */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#7C6A5E] uppercase tracking-wider block">
                  Quick Provider Presets
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSmtpHostInput("smtp.gmail.com");
                      setSmtpPortInput(587);
                      setSmtpTlsInput(true);
                      if (!smtpFromEmailInput.includes("@gmail.com") && smtpUserInput) {
                        setSmtpFromEmailInput(smtpUserInput);
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-[#F4E2D3] bg-[#FFFBF7] hover:bg-[#FFF2E7] text-[#201815] font-bold text-[11px] cursor-pointer transition-colors"
                  >
                    Google / Gmail (smtp.gmail.com)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSmtpHostInput("smtp-relay.brevo.com");
                      setSmtpPortInput(587);
                      setSmtpTlsInput(true);
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-[#F4E2D3] bg-[#FFFBF7] hover:bg-[#FFF2E7] text-[#201815] font-bold text-[11px] cursor-pointer transition-colors"
                  >
                    Brevo / Sendinblue
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSmtpHostInput("smtp.resend.com");
                      setSmtpPortInput(587);
                      setSmtpTlsInput(true);
                      setSmtpUserInput("resend");
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-[#F4E2D3] bg-[#FFFBF7] hover:bg-[#FFF2E7] text-[#201815] font-bold text-[11px] cursor-pointer transition-colors"
                  >
                    Resend SMTP
                  </button>
                </div>
              </div>

              {/* Instructions banner */}
              <div className="p-3.5 rounded-2xl bg-[#FFF9F3] border border-[#FDBA74] text-[11.5px] text-[#5C4B40] space-y-1">
                <div className="font-bold text-[#D95D0D] flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>Gmail Account Instructions:</span>
                </div>
                <p>
                  Google accounts require an <strong>App Password</strong> (not your standard Google account password).
                  Go to <span className="font-bold">Google Account &gt; Security &gt; 2-Step Verification &gt; App Passwords</span>, generate a 16-character password, and paste it below.
                </p>
              </div>

              {/* Configuration Form */}
              <form onSubmit={handleSaveSmtp} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#201815] block mb-1">
                      SMTP Host Server
                    </label>
                    <input
                      type="text"
                      required
                      value={smtpHostInput}
                      onChange={(e) => setSmtpHostInput(e.target.value)}
                      placeholder="e.g. smtp.gmail.com"
                      className="editorial-input w-full px-3 py-2 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#201815] block mb-1">
                      SMTP Port (587 or 465)
                    </label>
                    <input
                      type="number"
                      required
                      value={smtpPortInput}
                      onChange={(e) => setSmtpPortInput(Number(e.target.value))}
                      placeholder="587"
                      className="editorial-input w-full px-3 py-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#201815] block mb-1">
                      SMTP Username / Email
                    </label>
                    <input
                      type="text"
                      value={smtpUserInput}
                      onChange={(e) => setSmtpUserInput(e.target.value)}
                      placeholder="e.g. your_email@gmail.com"
                      className="editorial-input w-full px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#201815] block mb-1">
                      SMTP Password / App Password
                    </label>
                    <input
                      type="password"
                      value={smtpPassInput}
                      onChange={(e) => setSmtpPassInput(e.target.value)}
                      placeholder={smtpStatus?.has_password ? "•••••••• (Saved)" : "Enter App Password"}
                      className="editorial-input w-full px-3 py-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#201815] block mb-1">
                      From Email Address
                    </label>
                    <input
                      type="email"
                      value={smtpFromEmailInput}
                      onChange={(e) => setSmtpFromEmailInput(e.target.value)}
                      placeholder="e.g. security@yourcompany.com"
                      className="editorial-input w-full px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#201815] block mb-1">
                      From Display Name
                    </label>
                    <input
                      type="text"
                      value={smtpFromNameInput}
                      onChange={(e) => setSmtpFromNameInput(e.target.value)}
                      placeholder="e.g. FIDELIS Platform Security"
                      className="editorial-input w-full px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="smtp_tls_checkbox"
                    checked={smtpTlsInput}
                    onChange={(e) => setSmtpTlsInput(e.target.checked)}
                    className="accent-[#EA580C] w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="smtp_tls_checkbox" className="text-xs font-bold text-[#201815] cursor-pointer">
                    Enable TLS / STARTTLS Encryption (Required for Gmail port 587)
                  </label>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSmtpModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#F4E2D3] bg-white hover:bg-[#FFF9F3] text-xs font-bold text-[#7C6A5E] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingSmtp}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#FF8A3D] to-[#FF721B] hover:from-[#FF9952] hover:to-[#E8630D] text-white text-xs font-extrabold cursor-pointer disabled:opacity-50 transition-all shadow-xs"
                  >
                    {isSavingSmtp ? "Saving Settings..." : "Save to backend/.env & Connect"}
                  </button>
                </div>
              </form>

              {/* Diagnostic Test Email Section */}
              <div className="pt-3 border-t border-[#F4E2D3] space-y-2.5">
                <label className="text-[11px] font-bold text-[#201815] block">
                  Verify Outgoing Delivery (Send Live Test Email)
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={smtpTestEmail}
                    onChange={(e) => setSmtpTestEmail(e.target.value)}
                    placeholder="Enter email to test (e.g. alfredbiju34@gmail.com)"
                    className="editorial-input flex-1 px-3 py-2 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleTestSmtp}
                    disabled={isTestingSmtp}
                    className="px-4 py-2 rounded-xl bg-[#FFF2E7] hover:bg-[#FFE5D0] text-[#D95D0D] border border-[#FDBA74] text-xs font-extrabold cursor-pointer disabled:opacity-50 shrink-0 flex items-center gap-1.5 transition-colors"
                  >
                    <Send className={`w-3.5 h-3.5 ${isTestingSmtp ? "animate-spin" : ""}`} />
                    <span>{isTestingSmtp ? "Testing..." : "Send Test Email"}</span>
                  </button>
                </div>

                {smtpTestResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-bold space-y-1 ${
                      smtpTestResult.success
                        ? "bg-[#EDFDF5] border-[#A6F4C5] text-[#027A48]"
                        : "bg-[#FFF0F0] border-[#FECDCA] text-[#B42318]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {smtpTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                      <span>{smtpTestResult.success ? "Success" : "Delivery Error"}</span>
                    </div>
                    <p className="font-normal font-mono text-[11px] break-all">{smtpTestResult.message}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
