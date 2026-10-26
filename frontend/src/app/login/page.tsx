"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  Mail,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  KeyRound,
  LogOut,
  Shield
} from "lucide-react";
import { api, User as UserType } from "@/lib/api";
import { SpotlightCard } from "@/components/animations/SpotlightCard";
import { BorderBeam } from "@/components/animations/BorderBeam";
import { AnimatedGrid } from "@/components/animations/AnimatedGrid";
import { FidelisLogo } from "@/components/common/FidelisLogo";

type AuthRole = "CREATOR" | "BRAND_MANAGER" | "APPROVER" | "AUTHORISED_REVIEWER";

const ROLE_OPTION_DEFINITIONS = [
  {
    id: "CREATOR" as const,
    title: "Content Creator",
    desc: "Drafts content, marketing collateral & reviews diffs",
    icon: User,
  },
  {
    id: "AUTHORISED_REVIEWER" as const,
    title: "Compliance Reviewer",
    desc: "Audits claims, checks rule citations & flags issues",
    icon: ShieldCheck,
  },
  {
    id: "BRAND_MANAGER" as const,
    title: "Brand Manager",
    desc: "Manages rulebooks, verified facts & amendments",
    icon: Sparkles,
  },
  {
    id: "APPROVER" as const,
    title: "Executive Approver",
    desc: "Authorizes releases & signs cryptographic receipts",
    icon: KeyRound,
  },
] as const;

export default function LoginPage() {
  const navigatorRouter = useRouter();
  const [activeTabMode, setActiveTabMode] = useState<"register" | "login" | "invite">("register");

  const [signinEmail, setSigninEmail] = useState("");
  const [signinSecret, setSigninSecret] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupSecret, setSignupSecret] = useState("");

  const [inviteToken, setInviteToken] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteSecret, setInviteSecret] = useState("");

  const [isBusy, setIsBusy] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);
  const [activeSessionUser, setActiveSessionUser] = useState<UserType | null>(null);

  const fetchSessionRecord = useCallback(() => {
    api.getUsers()
      .then((users) => {
        const storedKey = typeof window !== "undefined" ? (localStorage.getItem("fidelis_user_id") || localStorage.getItem("canon_user_id")) : null;
        if (storedKey) {
          const matched = users.find((u) => u.id === storedKey);
          if (matched) setActiveSessionUser(matched);
        }
      })
      .catch(() => {
        
      });
  }, []);

  useEffect(() => {
    fetchSessionRecord();

    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const specifiedTab = searchParams.get("tab");
      const tokenParam = searchParams.get("token") || searchParams.get("invite");
      if (tokenParam) {
        setInviteToken(tokenParam);
        setActiveTabMode("invite");
      } else if (specifiedTab === "login") {
        setActiveTabMode("login");
      } else if (specifiedTab === "invite") {
        setActiveTabMode("invite");
      } else {
        setActiveTabMode("register");
      }
    }
  }, [fetchSessionRecord]);

  const dispatchSignIn = async (evt: React.FormEvent) => {
    evt.preventDefault();
    const targetEmail = signinEmail.trim();
    const targetSecret = signinSecret.trim();

    if (!targetEmail || !targetSecret) {
      setAlertError("Please enter your email and password.");
      return;
    }

    setIsBusy(true);
    setAlertError(null);
    setAlertSuccess(null);

    try {
      const credentials = await api.login({ email: targetEmail, password: targetSecret });
      localStorage.setItem("fidelis_token", credentials.access_token);
      localStorage.setItem("fidelis_user_id", credentials.user_id);
      localStorage.setItem("fidelis_user_role", credentials.role);
      localStorage.setItem("fidelis_user_name", credentials.full_name);
      localStorage.setItem("fidelis_user_email", credentials.email);
      localStorage.setItem("canon_token", credentials.access_token);
      localStorage.setItem("canon_user_id", credentials.user_id);
      localStorage.setItem("canon_user_role", credentials.role);
      localStorage.setItem("canon_user_name", credentials.full_name);
      localStorage.setItem("canon_user_email", credentials.email);

      window.dispatchEvent(new Event("fidelis_user_changed"));
      window.dispatchEvent(new Event("canon_user_changed"));
      window.dispatchEvent(new Event("storage"));

      const loggedProfile: UserType = {
        id: credentials.user_id,
        email: credentials.email,
        full_name: credentials.full_name,
        role: credentials.role,
        workspace_id: credentials.workspace_id,
      };
      setActiveSessionUser(loggedProfile);

      setAlertSuccess(`🎉 Welcome back, ${credentials.full_name}! Taking you to your workspace dashboard...`);
      setTimeout(() => {
        navigatorRouter.push("/dashboard");
      }, 1000);
    } catch (failure: any) {
      setAlertError(failure.message || "Invalid email or password. Please verify your credentials or create a new account.");
    } finally {
      setIsBusy(false);
    }
  };

  const dispatchRegistration = async (evt: React.FormEvent) => {
    evt.preventDefault();
    const candidateName = signupName.trim();
    const candidateEmail = signupEmail.trim();
    const candidateSecret = signupSecret.trim();

    if (!candidateName) {
      setAlertError("Please type your name in the 'Your Full Name' field.");
      return;
    }
    if (!candidateEmail) {
      setAlertError("Please type your email in the 'Email Address' field.");
      return;
    }
    if (!candidateSecret) {
      setAlertError("Please choose a password in the 'Password' field.");
      return;
    }

    setIsBusy(true);
    setAlertError(null);
    setAlertSuccess(null);

    try {
      const confirmation = await api.register({
        email: candidateEmail,
        full_name: candidateName,
        password: candidateSecret,
        role: "CREATOR",
      });

      localStorage.setItem("fidelis_token", confirmation.access_token);
      localStorage.setItem("fidelis_user_id", confirmation.user_id);
      localStorage.setItem("fidelis_user_role", confirmation.role);
      localStorage.setItem("fidelis_user_name", confirmation.full_name);
      localStorage.setItem("fidelis_user_email", confirmation.email);
      localStorage.setItem("canon_token", confirmation.access_token);
      localStorage.setItem("canon_user_id", confirmation.user_id);
      localStorage.setItem("canon_user_role", confirmation.role);
      localStorage.setItem("canon_user_name", confirmation.full_name);
      localStorage.setItem("canon_user_email", confirmation.email);

      window.dispatchEvent(new Event("fidelis_user_changed"));
      window.dispatchEvent(new Event("canon_user_changed"));
      window.dispatchEvent(new Event("storage"));

      const newlyRegistered: UserType = {
        id: confirmation.user_id,
        email: confirmation.email,
        full_name: confirmation.full_name,
        role: confirmation.role,
        workspace_id: confirmation.workspace_id,
      };

      setActiveSessionUser(newlyRegistered);
      setAlertSuccess(`🌟 Account created successfully for ${confirmation.full_name}! You are now logged in as Content Creator.`);

      setSignupName("");
      setSignupEmail("");
      setSignupSecret("");

      setTimeout(() => {
        navigatorRouter.push("/dashboard");
      }, 1200);
    } catch (failure: any) {
      setAlertError(failure.message || "Could not create account. That email might already be registered. Try signing in!");
    } finally {
      setIsBusy(false);
    }
  };

  const dispatchAcceptInvitation = async (evt: React.FormEvent) => {
    evt.preventDefault();
    const token = inviteToken.trim();
    const candidateName = inviteName.trim();
    const candidateSecret = inviteSecret.trim();

    if (!token) {
      setAlertError("Please enter your invitation token.");
      return;
    }
    if (!candidateName) {
      setAlertError("Please enter your full name.");
      return;
    }
    if (!candidateSecret || candidateSecret.length < 8) {
      setAlertError("Please choose a password with at least 8 characters.");
      return;
    }

    setIsBusy(true);
    setAlertError(null);
    setAlertSuccess(null);

    try {
      const confirmation = await api.acceptInvitation({
        token,
        full_name: candidateName,
        password: candidateSecret,
      });

      localStorage.setItem("fidelis_token", confirmation.access_token);
      localStorage.setItem("fidelis_user_id", confirmation.user_id);
      localStorage.setItem("fidelis_user_role", confirmation.role);
      localStorage.setItem("fidelis_user_name", confirmation.full_name);
      localStorage.setItem("fidelis_user_email", confirmation.email);
      localStorage.setItem("canon_token", confirmation.access_token);
      localStorage.setItem("canon_user_id", confirmation.user_id);
      localStorage.setItem("canon_user_role", confirmation.role);
      localStorage.setItem("canon_user_name", confirmation.full_name);
      localStorage.setItem("canon_user_email", confirmation.email);

      window.dispatchEvent(new Event("fidelis_user_changed"));
      window.dispatchEvent(new Event("canon_user_changed"));
      window.dispatchEvent(new Event("storage"));

      const newlyRegistered: UserType = {
        id: confirmation.user_id,
        email: confirmation.email,
        full_name: confirmation.full_name,
        role: confirmation.role,
        workspace_id: confirmation.workspace_id,
      };

      setActiveSessionUser(newlyRegistered);
      setAlertSuccess(`🌟 Invitation accepted! Welcome ${confirmation.full_name} (${confirmation.role.replace("_", " ")}). Taking you to your workspace...`);

      setTimeout(() => {
        navigatorRouter.push("/dashboard");
      }, 1200);
    } catch (failure: any) {
      setAlertError(failure.message || "Failed to accept invitation. It may be expired, invalid, or already accepted.");
    } finally {
      setIsBusy(false);
    }
  };

  const terminateSession = () => {
    [
      "fidelis_token", "fidelis_user_id", "fidelis_user_role", "fidelis_user_name", "fidelis_user_email",
      "canon_token", "canon_user_id", "canon_user_role", "canon_user_name", "canon_user_email"
    ].forEach((k) => localStorage.removeItem(k));
    setActiveSessionUser(null);
    window.dispatchEvent(new Event("fidelis_user_changed"));
    window.dispatchEvent(new Event("canon_user_changed"));
    window.dispatchEvent(new Event("storage"));
    setAlertSuccess("👋 Signed out! You can now create a new account or log in anytime.");
  };

  return (
    <div className="relative min-h-screen bg-[#FFFBF7] text-[#201815] py-6 px-4 sm:px-6">
      <AnimatedGrid />

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        <header className="rounded-2xl bg-white/80 backdrop-blur-xl border border-[#F4E2D3] px-6 py-3.5 shadow-sm flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <FidelisLogo size={38} showWordmark={true} badgeText="ENTERPRISE" />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#FFF5EC] text-[#201815] text-xs font-bold border border-[#F4E2D3] transition-all shadow-xs cursor-pointer"
            >
              <span>← Back to Overview</span>
            </Link>
            <Link
              href="/guide"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#FFF5EC] text-[#7C6A5E] hover:text-[#201815] text-xs font-bold border border-[#F4E2D3] transition-all shadow-xs"
            >
              <span>Handbook</span>
            </Link>
          </div>
        </header>

        <div className="p-3.5 rounded-2xl bg-white/85 backdrop-blur-md border border-[#F4E2D3] shadow-xs flex items-center justify-between text-xs font-bold text-[#7C6A5E] overflow-x-auto gap-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[#7C6A5E] hover:text-[#D95D0D] shrink-0"
          >
            <span className="w-5 h-5 rounded-full bg-[#EDFDF5] text-[#027A48] flex items-center justify-center text-[11px] font-black">
              ✓
            </span>
            <span>1. Product Overview</span>
          </Link>
          <span className="text-[#FDBA74]">➔</span>
          <div className="flex items-center gap-1.5 text-[#D95D0D] font-extrabold shrink-0 bg-[#FFF2E7] px-3 py-1 rounded-xl border border-[#FDBA74]">
            <span className="w-5 h-5 rounded-full bg-[#FF8A3D] text-white flex items-center justify-center text-[11px] font-black orange-dot-glow">
              2
            </span>
            <span>2. Authentication & Credentials</span>
          </div>
          <span className="text-[#FDBA74]">➔</span>
          <div className="flex items-center gap-1.5 text-[#7C6A5E] opacity-60 shrink-0">
            <span className="w-5 h-5 rounded-full bg-[#F4E2D3] text-[#7C6A5E] flex items-center justify-center text-[11px] font-black">
              3
            </span>
            <span>3. Workspace Dashboard</span>
          </div>
        </div>

        <div className="p-7 rounded-3xl bg-white/85 backdrop-blur-xl border border-[#F4E2D3] shadow-sm text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FFF2E7] text-[#D95D0D] border border-[#FDBA74] mx-auto">
            <Shield className="w-3.5 h-3.5 text-[#FF8A3D]" />
            <span>Enterprise Access Control</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#201815]">
            {activeTabMode === "register" ? "Create Your Governance Account" : "Sign In to FIDELIS Workspace"}
          </h1>
          <p className="text-sm text-[#7C6A5E] max-w-md mx-auto leading-relaxed">
            Access your brand rulebook, run deterministic compliance checks, and manage signed publications.
          </p>
        </div>

        {activeSessionUser && (
          <div className="p-5 rounded-3xl bg-[#EDFDF5] border border-[#A6F4C5] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#A6F4C5] flex items-center justify-center text-[#027A48] font-black text-xl shadow-xs">
                {activeSessionUser.full_name.charAt(0)}
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#027A48] uppercase tracking-wide">
                  Active User Session
                </div>
                <h2 className="text-base font-bold text-[#201815]">
                  {activeSessionUser.full_name}
                </h2>
                <div className="text-xs text-[#7C6A5E]">
                  {activeSessionUser.email} • Role: <strong className="text-[#027A48]">{activeSessionUser.role.replace("_", " ")}</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigatorRouter.push("/dashboard")}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF8A3D] to-[#FF721B] hover:from-[#FF9952] hover:to-[#E8630D] text-white text-xs font-extrabold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
              >
                <span>Go to Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={terminateSession}
                className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#FFF5EC] text-[#B42318] text-xs font-bold border border-[#FECDCA] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}

        <SpotlightCard className="max-w-xl mx-auto w-full p-7 sm:p-9 relative">
          <BorderBeam duration={9} size={200} colorFrom="#FF8A3D" colorTo="#FFAE74" />

          <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-[#FFF5EC] border border-[#F4E2D3] mb-6">
            <button
              id="tab-register-btn"
              type="button"
              onClick={() => {
                setActiveTabMode("register");
                setAlertError(null);
                setAlertSuccess(null);
              }}
              className={`py-2.5 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTabMode === "register"
                  ? "bg-gradient-to-r from-[#FF8A3D] to-[#FF721B] text-white shadow-sm shadow-[#FF8A3D]/30"
                  : "text-[#7C6A5E] hover:text-[#201815]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>

            <button
              id="tab-login-btn"
              type="button"
              onClick={() => {
                setActiveTabMode("login");
                setAlertError(null);
                setAlertSuccess(null);
              }}
              className={`py-2.5 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTabMode === "login"
                  ? "bg-gradient-to-r from-[#FF8A3D] to-[#FF721B] text-white shadow-sm shadow-[#FF8A3D]/30"
                  : "text-[#7C6A5E] hover:text-[#201815]"
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>

            <button
              id="tab-invite-btn"
              type="button"
              onClick={() => {
                setActiveTabMode("invite");
                setAlertError(null);
                setAlertSuccess(null);
              }}
              className={`py-2.5 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTabMode === "invite"
                  ? "bg-gradient-to-r from-[#FF8A3D] to-[#FF721B] text-white shadow-sm shadow-[#FF8A3D]/30"
                  : "text-[#7C6A5E] hover:text-[#201815]"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Accept Invite</span>
            </button>
          </div>

          {alertError && (
            <div className="mb-4 p-4 rounded-2xl bg-[#FFF0F0] border border-[#FECDCA] text-[#B42318] text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{alertError}</span>
            </div>
          )}

          {alertSuccess && (
            <div className="mb-4 p-4 rounded-2xl bg-[#EDFDF5] border border-[#A6F4C5] text-[#027A48] text-xs font-bold space-y-2">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                <span>{alertSuccess}</span>
              </div>
            </div>
          )}

          {activeTabMode === "register" && (
            <form onSubmit={dispatchRegistration} className="space-y-4">
              <div className="pb-1">
                <h2 className="text-sm font-extrabold text-[#201815]">
                  Creator Account Registration:
                </h2>
                <p className="text-[11px] text-[#7C6A5E]">
                  Create your workspace account with Content Creator permissions
                </p>
              </div>

              <div>
                <label
                  htmlFor="reg-fullname"
                  className="text-xs font-bold text-[#201815] block mb-1.5 cursor-pointer"
                >
                  1. Your Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#7C6A5E] absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    id="reg-fullname"
                    name="fullname"
                    type="text"
                    required
                    autoComplete="name"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="e.g. Maya Patel"
                    className="editorial-input w-full pl-10 pr-3 py-2.5 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-email"
                  className="text-xs font-bold text-[#201815] block mb-1.5 cursor-pointer"
                >
                  2. Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#7C6A5E] absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="e.g. maya@example.com"
                    className="editorial-input w-full pl-10 pr-3 py-2.5 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FFF9F3] border border-[#FDBA74] flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#D95D0D] shrink-0" />
                <div className="text-xs text-[#201815]">
                  <span className="font-extrabold text-[#D95D0D]">Standard Registration:</span> Public accounts are provisioned as <strong>Content Creator</strong>. If you are an Approver, Reviewer, or Brand Manager, please ask your Administrator for an invitation or{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTabMode("invite")}
                    className="underline font-bold text-[#D95D0D] cursor-pointer"
                  >
                    accept an invitation here →
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-password"
                  className="text-xs font-bold text-[#201815] block mb-1.5 cursor-pointer"
                >
                  4. Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#7C6A5E] absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    id="reg-password"
                    name="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={signupSecret}
                    onChange={(e) => setSignupSecret(e.target.value)}
                    placeholder="Create a password (e.g. Password123!)..."
                    className="editorial-input w-full pl-10 pr-3 py-2.5 text-xs font-medium"
                  />
                </div>
              </div>

              <button
                id="btn-create-account"
                type="submit"
                disabled={isBusy}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FF8A3D] to-[#FF721B] hover:from-[#FF9952] hover:to-[#E8630D] text-white text-xs font-extrabold transition-all shadow-md shadow-[#FF8A3D]/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>{isBusy ? "Creating Your Account..." : "✨ Create Your Account & Start Writing"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTabMode("login");
                    setAlertError(null);
                  }}
                  className="text-xs text-[#7C6A5E] hover:text-[#201815] font-semibold cursor-pointer"
                >
                  Already have an account? <span className="text-[#D95D0D] font-bold">Sign In here →</span>
                </button>
              </div>
            </form>
          )}

          {activeTabMode === "login" && (
            <form onSubmit={dispatchSignIn} className="space-y-4">
              <div>
                <h2 className="text-sm font-extrabold text-[#201815]">
                  Sign In to Workspace:
                </h2>
                <p className="text-[11px] text-[#7C6A5E]">
                  Enter your credentials to continue
                </p>
              </div>

              <div>
                <label
                  htmlFor="login-email"
                  className="text-xs font-bold text-[#201815] block mb-1.5 cursor-pointer"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#7C6A5E] absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={signinEmail}
                    onChange={(e) => setSigninEmail(e.target.value)}
                    placeholder="e.g. creator@company.example"
                    className="editorial-input w-full pl-10 pr-3 py-2.5 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="text-xs font-bold text-[#201815] block mb-1.5 cursor-pointer"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#7C6A5E] absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={signinSecret}
                    onChange={(e) => setSigninSecret(e.target.value)}
                    placeholder="Enter your password..."
                    className="editorial-input w-full pl-10 pr-3 py-2.5 text-xs font-medium"
                  />
                </div>
              </div>

              <button
                id="btn-login"
                type="submit"
                disabled={isBusy}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FF8A3D] to-[#FF721B] hover:from-[#FF9952] hover:to-[#E8630D] text-white text-xs font-extrabold transition-all shadow-md shadow-[#FF8A3D]/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isBusy ? "Signing In..." : "🚀 Sign In & Enter"}</span>
              </button>

              <div className="text-center pt-3 border-t border-[#F4E2D3]">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTabMode("register");
                    setAlertError(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#FFF5EC] hover:bg-[#FFEAD9] text-[#D95D0D] border border-[#FDBA74] text-xs font-bold transition-colors cursor-pointer"
                >
                  ✨ Don&apos;t have an account? Click to Create Account
                </button>
              </div>
            </form>
          )}

          {activeTabMode === "invite" && (
            <form onSubmit={dispatchAcceptInvitation} className="space-y-4">
              <div>
                <h2 className="text-sm font-extrabold text-[#201815]">
                  Accept Workspace Invitation:
                </h2>
                <p className="text-[11px] text-[#7C6A5E]">
                  Enter your invitation token and complete your profile to activate your governance role
                </p>
              </div>

              <div>
                <label
                  htmlFor="invite-token"
                  className="text-xs font-bold text-[#201815] block mb-1.5 cursor-pointer"
                >
                  1. Invitation Token
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#7C6A5E] absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    id="invite-token"
                    name="token"
                    type="text"
                    required
                    value={inviteToken}
                    onChange={(e) => setInviteToken(e.target.value)}
                    placeholder="Paste your invitation token..."
                    className="editorial-input w-full pl-10 pr-3 py-2.5 text-xs font-medium font-mono"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="invite-fullname"
                  className="text-xs font-bold text-[#201815] block mb-1.5 cursor-pointer"
                >
                  2. Your Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#7C6A5E] absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    id="invite-fullname"
                    name="fullname"
                    type="text"
                    required
                    autoComplete="name"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Maya Patel"
                    className="editorial-input w-full pl-10 pr-3 py-2.5 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="invite-password"
                  className="text-xs font-bold text-[#201815] block mb-1.5 cursor-pointer"
                >
                  3. Set Password (min 8 chars)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#7C6A5E] absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    id="invite-password"
                    name="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={inviteSecret}
                    onChange={(e) => setInviteSecret(e.target.value)}
                    placeholder="Create your secure password..."
                    className="editorial-input w-full pl-10 pr-3 py-2.5 text-xs font-medium"
                  />
                </div>
              </div>

              <button
                id="btn-accept-invite"
                type="submit"
                disabled={isBusy}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FF8A3D] to-[#FF721B] hover:from-[#FF9952] hover:to-[#E8630D] text-white text-xs font-extrabold transition-all shadow-md shadow-[#FF8A3D]/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>{isBusy ? "Activating Role & Account..." : "✨ Accept Invitation & Activate Account"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTabMode("login");
                    setAlertError(null);
                  }}
                  className="text-xs text-[#7C6A5E] hover:text-[#201815] font-semibold cursor-pointer"
                >
                  Already have an active account? <span className="text-[#D95D0D] font-bold">Sign In here →</span>
                </button>
              </div>
            </form>
          )}
        </SpotlightCard>
      </div>
    </div>
  );
}
