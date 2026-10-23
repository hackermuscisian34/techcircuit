"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FidelisLogo } from "@/components/common/FidelisLogo";
import {
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Database,
  ArrowRight,
  Sparkles,
  Check,
  Palette,
  CheckSquare,
  X,
  Menu,
  Layers,
  Lock,
  Cpu,
  Scale,
  ExternalLink,
  History,
  AlertTriangle,
  Fingerprint,
  GitCompare,
  FileSearch,
  CheckCheck,
  Info,
  Users,
  UserCheck,
  PenTool,
  Award,
  FileText
} from "lucide-react";

import { AnimatedGrid } from "@/components/animations/AnimatedGrid";
import { BlurText } from "@/components/animations/BlurText";
import { ShinyText } from "@/components/animations/ShinyText";
import { RotatingText } from "@/components/animations/RotatingText";
import { SpotlightCard } from "@/components/animations/SpotlightCard";
import { BorderBeam } from "@/components/animations/BorderBeam";
import { TiltedCard } from "@/components/animations/TiltedCard";
import { MagnetButton } from "@/components/animations/MagnetButton";

export default function HomePage() {
  const [openFaqs, setOpenFaqs] = useState<number[]>([0]);
  const [activeUser, setActiveUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [demoTab, setDemoTab] = useState<"draft" | "issues" | "fixed">("issues");
  const [selectedCompetitor, setSelectedCompetitor] = useState<"dasho" | "hypotenuse" | "omneky" | "brandos">("dasho");
  const [matrixFilter, setMatrixFilter] = useState<"all" | "exclusive">("all");
  const [matrixPerspective, setMatrixPerspective] = useState<"user" | "technical">("user");
  const [rolePerspective, setRolePerspective] = useState<"creator" | "manager" | "reviewer" | "approver" | "admin">("creator");
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState<string>("home");
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const id = (localStorage.getItem("fidelis_user_id") || localStorage.getItem("canon_user_id"));
      const name = (localStorage.getItem("fidelis_user_name") || localStorage.getItem("canon_user_name"));
      const role = (localStorage.getItem("fidelis_user_role") || localStorage.getItem("canon_user_role"));
      if (id && name) {
        setActiveUser({ id, name, role: role || "CREATOR" });
      }
    }

    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 20);

      const winHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (winHeight > 0) {
        setScrollProgress(Math.min(100, Math.max(0, (scrollY / winHeight) * 100)));
      }

      const sectionIds = ["how-it-works", "features", "ai-comparison", "why-fidelis", "faq"];
      for (const sid of sectionIds) {
        const el = document.getElementById(sid);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 180 && rect.bottom >= 180) {
            setActiveSection(sid);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleFaq = (idx: number) => {
    setOpenFaqs((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const FAQS = [
    {
      q: "What is FIDELIS and who is it for?",
      a: "FIDELIS is an easy-to-use brand guideline and content checker. It helps marketing teams, writers, designers, and managers ensure that articles, ads, press releases, and graphics match company standards before going live."
    },
    {
      q: "How is FIDELIS different from standard spellcheck tools?",
      a: "Standard spellcheckers only check grammar and typos. FIDELIS checks your actual company rules—such as approved product names, correct trademark symbols (®/™), verified numbers (customer counts, uptime stats), and official logo usage."
    },
    {
      q: "Will FIDELIS rewrite my whole paragraph or alter my writing style?",
      a: "No! Unlike generic AI tools that rewrite everything and ruin your voice, FIDELIS only fixes the specific word, number, or phrase that violates a rule. Your creative tone and headline style stay completely untouched."
    },
    {
      q: "Can I check images and logos as well as written copy?",
      a: "Yes. You can upload graphics, banners, and logos. FIDELIS automatically checks logo spacing (clearspace padding), aspect ratio distortion, and text contrast to ensure your visuals meet brand standards."
    },
    {
      q: "Is our company data kept safe and private?",
      a: "Yes. FIDELIS is engineered to run securely without sending your confidential announcements, upcoming pricing, or sensitive drafts to third-party public clouds."
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#FFFBF7] text-[#201815] flex flex-col font-sans overflow-hidden">
      
      <AnimatedGrid />

      
      <header
        className={`sticky top-0 z-50 transition-all duration-500 ease-out px-3 sm:px-6 ${
          isScrolled ? "pt-2.5 pb-2" : "pt-4 pb-3"
        }`}
      >
        <div
          className={`mx-auto transition-all duration-500 ease-out relative ${
            isScrolled
              ? "max-w-5xl rounded-full bg-white/90 backdrop-blur-2xl border border-[#F4E2D3] shadow-xl shadow-[#FF8A3D]/10 ring-1 ring-[#FF8A3D]/15 px-4 sm:px-6 py-2.5"
              : "max-w-6xl rounded-3xl bg-[#FFFBF7]/85 backdrop-blur-xl border border-[#F4E2D3]/70 px-4 sm:px-6 py-3 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3 group shrink-0">
              <FidelisLogo
                size={isScrolled ? 36 : 42}
                showWordmark={true}
                badgeText="BRAND GUARD"
                className="transition-all duration-300"
              />
            </Link>

            <nav className="hidden md:flex items-center gap-1 text-xs font-bold text-[#7C6A5E] bg-[#FFF5EC]/60 p-1 rounded-2xl border border-[#F4E2D3]/50">
              {[
                { id: "how-it-works", label: "How It Works" },
                { id: "features", label: "Features" },
                { id: "ai-comparison", label: "AI Comparison", badge: "VS AI", highlight: true },
                { id: "why-fidelis", label: "Why FIDELIS" },
                { id: "faq", label: "FAQ" },
              ].map((item) => {
                const isActive = activeSection === item.id;
                const isHovered = hoveredNav === item.id;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onMouseEnter={() => setHoveredNav(item.id)}
                    onMouseLeave={() => setHoveredNav(null)}
                    className={`relative px-3.5 py-1.5 rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
                      isActive || isHovered
                        ? "text-[#D95D0D] font-extrabold bg-white shadow-xs"
                        : "text-[#7C6A5E] hover:text-[#201815]"
                    }`}
                  >
                    {item.highlight && (
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-[#FF8A3D] opacity-75 animate-ping" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF8A3D]" />
                      </span>
                    )}
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#FF8A3D] to-[#FF5F0F] text-white shadow-2xs">
                        {item.badge}
                      </span>
                    )}
                  </a>
                );
              })}
            </nav>

            <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#EDFDF5] to-[#E6FBF0] border border-[#A6F4C5] text-[10px] font-extrabold text-[#027A48] shadow-2xs">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#027A48] opacity-75 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#027A48]" />
              </span>
              <span>Local AI Engine · 0 Cloud Leaks</span>
            </div>

            <div className="flex items-center gap-2.5">
              {activeUser ? (
                <>
                  <MagnetButton strength={0.25}>
                    <Link
                      href="/dashboard"
                      className="relative overflow-hidden group/btn px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF8A3D] via-[#FF721B] to-[#E05200] hover:from-[#FF9952] hover:to-[#E8630D] text-white text-xs font-black shadow-md shadow-[#FF8A3D]/30 hover:shadow-lg hover:shadow-[#FF8A3D]/45 transition-all flex items-center gap-1.5"
                    >
                      <span className="relative z-10 flex items-center gap-1.5">
                        <span>Open Workspace</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
                      </span>
                      <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                    </Link>
                  </MagnetButton>
                  <Link
                    href="/login"
                    className="hidden sm:inline-flex px-3.5 py-2 rounded-xl bg-white hover:bg-[#FFF5EC] text-[#7C6A5E] hover:text-[#201815] text-xs font-bold border border-[#F4E2D3] transition-all shadow-xs"
                  >
                    Switch User
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hidden sm:inline-flex px-3.5 py-2 rounded-xl bg-white hover:bg-[#FFF5EC] text-[#201815] text-xs font-bold border border-[#F4E2D3] transition-all shadow-xs"
                  >
                    Sign In
                  </Link>
                  <MagnetButton strength={0.25}>
                    <Link
                      href="/dashboard"
                      className="relative overflow-hidden group/btn px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF8A3D] via-[#FF721B] to-[#E05200] hover:from-[#FF9952] hover:to-[#E8630D] text-white text-xs font-black shadow-md shadow-[#FF8A3D]/30 hover:shadow-lg hover:shadow-[#FF8A3D]/45 transition-all flex items-center gap-1.5"
                    >
                      <span className="relative z-10 flex items-center gap-1.5">
                        <span>Try Workspace Free</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
                      </span>
                      <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                    </Link>
                  </MagnetButton>
                </>
              )}

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl text-[#201815] hover:bg-[#FFF5EC] border border-[#F4E2D3] cursor-pointer transition-colors"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="absolute bottom-0 left-6 right-6 h-[2px] overflow-hidden rounded-full opacity-85 pointer-events-none">
            <div
              className="h-full bg-gradient-to-r from-[#FF8A3D] via-[#FF5F0F] to-[#E05200] transition-all duration-150 ease-out shadow-sm shadow-[#FF8A3D]"
              style={{ width: `${scrollProgress}%` }}
            />
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden mt-3 pt-3 border-t border-[#F4E2D3] space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <nav className="flex flex-col gap-1">
                {[
                  { id: "how-it-works", label: "How It Works" },
                  { id: "features", label: "Features" },
                  { id: "ai-comparison", label: "AI Comparison", badge: "VS AI", highlight: true },
                  { id: "why-fidelis", label: "Why FIDELIS" },
                  { id: "faq", label: "FAQ" },
                ].map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#201815] hover:bg-[#FFF5EC] transition-colors"
                  >
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#FF8A3D] text-white">
                        {item.badge}
                      </span>
                    )}
                  </a>
                ))}
              </nav>

              <div className="pt-2 border-t border-[#F4E2D3] flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center px-4 py-2.5 rounded-xl bg-white hover:bg-[#FFF5EC] text-[#201815] text-xs font-bold border border-[#F4E2D3] transition-all shadow-xs"
                >
                  {activeUser ? "Switch User Account" : "Sign In to Workspace"}
                </Link>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF8A3D] to-[#FF5F0F] text-white text-xs font-black shadow-md shadow-[#FF8A3D]/30"
                >
                  Open Review Studio →
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      
      <section className="relative py-14 sm:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12">
          
          <div className="max-w-xl space-y-6 text-center lg:text-left">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 border border-[#FDBA74] shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#FF8A3D] animate-pulse" />
              <ShinyText
                text="Automated Brand Guidelines & Fact Checker"
                className="text-xs font-bold text-[#D95D0D]"
                speed={3.5}
              />
            </div>

            
            <h1 className="text-3xl sm:text-5xl font-black text-[#201815] tracking-tight leading-[1.18]">
              <BlurText
                text="Never publish an off-brand mistake again."
                delay={40}
                animateBy="words"
                direction="bottom"
                className="text-[#201815]"
              />
            </h1>

            
            <div className="text-base sm:text-lg text-[#7C6A5E] leading-relaxed">
              <span>FIDELIS automatically checks your marketing drafts for </span>
              <RotatingText
                words={[
                  "Forbidden Words",
                  "Outdated Numbers",
                  "Incorrect Logos",
                  "Missing Trademarks",
                  "Unverified Claims"
                ]}
                interval={2600}
                highlightClassName="font-extrabold text-[#D95D0D] bg-[#FFF2E7] px-2 py-0.5 rounded-lg border border-[#FDBA74]/50"
              />
              <p className="mt-3 text-sm text-[#7C6A5E]">
                Check articles, press releases, product sheets, and logos against your company’s approved guidelines in seconds.
              </p>
            </div>

            
            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-4">
              <MagnetButton strength={0.25}>
                <Link
                  href="/dashboard"
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF8A3D] to-[#FF721B] hover:from-[#FF9952] hover:to-[#E8630D] text-white text-sm font-extrabold transition-all shadow-md shadow-[#FF8A3D]/30 flex items-center gap-2"
                >
                  <span>Open Workspace Free</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </MagnetButton>

              <Link
                href="/review"
                className="px-5 py-3.5 rounded-2xl bg-white hover:bg-[#FFF5EC] text-[#D95D0D] text-sm font-extrabold border border-[#FDBA74] transition-all shadow-xs flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-[#FF8A3D]" />
                <span>Try Live Review</span>
              </Link>
            </div>

            
            <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-5 text-xs text-[#7C6A5E] font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-[#EDFDF5] text-[#027A48] flex items-center justify-center text-[10px] font-bold">✓</span>
                <span>Fast feedback under 1 second</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-[#FFF2E7] text-[#D95D0D] flex items-center justify-center text-[10px] font-bold">✓</span>
                <span>Only fixes mistakes (keeps your voice)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-[#FFF2E7] text-[#D95D0D] flex items-center justify-center text-[10px] font-bold">✓</span>
                <span>100% private & secure</span>
              </span>
            </div>
          </div>

          
          <div className="w-full lg:w-[490px]">
            <TiltedCard maxTilt={5} scale={1.01} className="w-full">
              <div className="relative rounded-3xl bg-white/95 backdrop-blur-2xl border border-[#F4E2D3] shadow-xl shadow-[#FF8A3D]/10 overflow-hidden text-left">
                <BorderBeam duration={7} size={220} colorFrom="#FF8A3D" colorTo="#FFAE74" borderWidth={2} />

                
                <div className="px-5 py-3.5 bg-gradient-to-r from-[#FFF5EC] to-white border-b border-[#F4E2D3] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF8A3D]" />
                    <span className="text-xs font-extrabold text-[#201815]">
                      Interactive Demo: Content Check
                    </span>
                  </div>
                  <span className="text-[10px] text-[#027A48] bg-[#EDFDF5] font-black px-2.5 py-0.5 rounded-full border border-[#A6F4C5]">
                    READY IN 0.3s
                  </span>
                </div>

                
                <div className="px-5 pt-3 pb-2 bg-white flex items-center gap-2 border-b border-[#FDF0E5] text-xs font-bold">
                  <button
                    onClick={() => setDemoTab("draft")}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      demoTab === "draft"
                        ? "bg-[#FFF2E7] text-[#D95D0D] shadow-xs"
                        : "text-[#7C6A5E] hover:bg-[#FFF5EC]"
                    }`}
                  >
                    1. Original Draft
                  </button>
                  <button
                    onClick={() => setDemoTab("issues")}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      demoTab === "issues"
                        ? "bg-[#FFF2E7] text-[#D95D0D] shadow-xs"
                        : "text-[#7C6A5E] hover:bg-[#FFF5EC]"
                    }`}
                  >
                    2. Issues Detected (3)
                  </button>
                  <button
                    onClick={() => setDemoTab("fixed")}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      demoTab === "fixed"
                        ? "bg-[#EDFDF5] text-[#027A48] shadow-xs"
                        : "text-[#7C6A5E] hover:bg-[#FFF5EC]"
                    }`}
                  >
                    3. One-Click Fix
                  </button>
                </div>

                
                <div className="p-5 space-y-4">
                  {demoTab === "draft" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-[#7C6A5E] font-semibold">
                        <span>Marketing announcement submitted for review:</span>
                        <span className="text-xs text-[#D95D0D] font-bold">Unchecked</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-[#FFFBF7] border border-[#F4E2D3] text-xs text-[#201815] leading-relaxed">
                        &ldquo;Our platform delivers <span className="bg-[#FFF0F0] text-[#B42318] px-1.5 py-0.5 rounded font-bold border border-[#FECDCA]">100% unbreakable uptime</span> with over <span className="bg-[#FFF5EC] text-[#D95D0D] px-1.5 py-0.5 rounded font-bold border border-[#FDBA74]">50,000 active clients</span> on our <span className="bg-[#FFF0F0] text-[#B42318] px-1.5 py-0.5 rounded font-bold border border-[#FECDCA]">Legacy Suite</span>.&rdquo;
                      </div>
                      <p className="text-[11px] text-[#A49184]">
                        Click on &ldquo;Issues Detected&rdquo; above to see what FIDELIS found.
                      </p>
                    </div>
                  )}

                  {demoTab === "issues" && (
                    <div className="space-y-2.5">
                      <div className="text-xs text-[#7C6A5E] font-semibold">
                        FIDELIS checked company guidelines and flagged 3 issues:
                      </div>

                      <div className="p-3 rounded-xl bg-[#FFF0F0] border border-[#FECDCA] flex items-start gap-2.5">
                        <span className="text-[10px] font-black bg-[#B42318] text-white px-2 py-0.5 rounded shrink-0">RULE</span>
                        <div>
                          <div className="text-xs font-bold text-[#B42318]">No Absolute Availability Guarantees</div>
                          <div className="text-[11px] text-[#7C6A5E] mt-0.5">Brand guide prohibits claiming &ldquo;100% uptime&rdquo;. Official verified SLA is <strong>99.98%</strong>.</div>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-[#FFF5EC] border border-[#FDBA74] flex items-start gap-2.5">
                        <span className="text-[10px] font-black bg-[#D95D0D] text-white px-2 py-0.5 rounded shrink-0">EXPIRED FACT</span>
                        <div>
                          <div className="text-xs font-bold text-[#D95D0D]">Outdated Customer Metric</div>
                          <div className="text-[11px] text-[#7C6A5E] mt-0.5">&ldquo;50,000 clients&rdquo; is unverified. Approved audited count is <strong>42,000</strong>.</div>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-[#FFF0F0] border border-[#FECDCA] flex items-start gap-2.5">
                        <span className="text-[10px] font-black bg-[#B42318] text-white px-2 py-0.5 rounded shrink-0">NAME</span>
                        <div>
                          <div className="text-xs font-bold text-[#B42318]">Deprecated Product Name</div>
                          <div className="text-[11px] text-[#7C6A5E] mt-0.5">&ldquo;Legacy Suite&rdquo; was retired. The approved name is <strong>Cloud Platform™</strong>.</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {demoTab === "fixed" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-[#027A48] font-bold">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-[#027A48]" />
                          <span>All 3 Issues Fixed Automatically</span>
                        </span>
                        <span className="text-[10px] bg-[#EDFDF5] px-2 py-0.5 rounded-full border border-[#A6F4C5]">
                          Approved
                        </span>
                      </div>
                      <div className="p-4 rounded-2xl bg-[#EDFDF5] border border-[#A6F4C5] text-xs text-[#027A48] leading-relaxed font-medium">
                        &ldquo;Our platform delivers <span className="font-extrabold underline decoration-2">99.98% uptime</span> with over <span className="font-extrabold underline decoration-2">42,000 active clients</span> on our <span className="font-extrabold underline decoration-2">Cloud Platform™</span>.&rdquo;
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#FFF9F3] border border-[#FDBA74] text-[11px] text-[#7C6A5E]">
                        Notice how only the incorrect words were fixed, keeping the author&rsquo;s natural sentence structure intact!
                      </div>
                    </div>
                  )}

                  
                  <div className="pt-3 border-t border-[#F4E2D3] flex items-center justify-between text-xs text-[#7C6A5E]">
                    <span className="font-semibold">Review time: 28 milliseconds</span>
                    <Link
                      href="/review"
                      className="font-extrabold text-[#D95D0D] hover:underline flex items-center gap-1"
                    >
                      <span>Try with your own text</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </TiltedCard>
          </div>
        </div>
      </section>

      
      <section id="how-it-works" className="py-20 bg-white/70 backdrop-blur-md border-y border-[#F4E2D3] px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#FFF2E7] text-[#D95D0D] text-xs font-extrabold border border-[#FDBA74]">
              <Layers className="w-3.5 h-3.5 text-[#FF8A3D]" />
              <span>HOW IT WORKS</span>
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#201815]">
              Publish Clean Content in 3 Simple Steps
            </h2>
            <p className="text-sm text-[#7C6A5E]">
              From draft to verified approval without back-and-forth email delays.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <SpotlightCard className="p-7 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF8A3D] to-[#FFAE74] text-white flex items-center justify-center font-black text-lg shadow-sm shadow-[#FF8A3D]/30">
                1
              </div>
              <h3 className="text-base font-extrabold text-[#201815]">
                Set Your Brand Guidelines & Facts
              </h3>
              <p className="text-xs text-[#7C6A5E] leading-relaxed">
                Add your official brand guidelines, approved product names, official logos, and verified business metrics (like customer counts or revenue numbers) to your company library.
              </p>
              <div className="pt-2 text-xs font-bold text-[#D95D0D] flex items-center gap-1">
                <span>Centralized & Always Updated</span>
              </div>
            </SpotlightCard>

            
            <SpotlightCard className="p-7 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF8A3D] to-[#FFAE74] text-white flex items-center justify-center font-black text-lg shadow-sm shadow-[#FF8A3D]/30">
                2
              </div>
              <h3 className="text-base font-extrabold text-[#201815]">
                Paste or Upload Your Draft
              </h3>
              <p className="text-xs text-[#7C6A5E] leading-relaxed">
                Paste draft articles, press releases, social media copy, or upload images. FIDELIS scans everything in real-time, checking words, trademarks, stats, and visual logo padding.
              </p>
              <div className="pt-2 text-xs font-bold text-[#D95D0D] flex items-center gap-1">
                <span>Instant Feedback in Under a Second</span>
              </div>
            </SpotlightCard>

            
            <SpotlightCard className="p-7 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#027A48] to-[#12B76A] text-white flex items-center justify-center font-black text-lg shadow-sm shadow-[#027A48]/30">
                3
              </div>
              <h3 className="text-base font-extrabold text-[#201815]">
                Fix in 1 Click & Sign Off
              </h3>
              <p className="text-xs text-[#7C6A5E] leading-relaxed">
                Review highlighted suggestions with plain-language explanations. Accept approved fixes with one click, or send to your team lead for formal sign-off before publishing.
              </p>
              <div className="pt-2 text-xs font-bold text-[#027A48] flex items-center gap-1">
                <span>Full Team Approval History</span>
              </div>
            </SpotlightCard>
          </div>
        </div>
      </section>

      
      <section id="features" className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#FFF2E7] text-[#D95D0D] text-xs font-extrabold border border-[#FDBA74]">
              <Sparkles className="w-3.5 h-3.5 text-[#FF8A3D]" />
              <span>CORE CAPABILITIES</span>
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#201815]">
              Everything You Need to Guard Your Brand
            </h2>
            <p className="text-sm text-[#7C6A5E]">
              Designed to help creators write freely while keeping company communications accurate and consistent.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <SpotlightCard className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFF2E7] text-[#D95D0D] flex items-center justify-center border border-[#FDBA74]">
                <BookOpen className="w-5 h-5 text-[#FF8A3D]" />
              </div>
              <h3 className="text-sm font-bold text-[#201815]">Brand & Style Rules</h3>
              <p className="text-xs text-[#7C6A5E] leading-relaxed">
                Automatically detects retired product names, unapproved slogans, missing trademark symbols (®/™), and prohibited terms.
              </p>
            </SpotlightCard>

            <SpotlightCard className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFF2E7] text-[#D95D0D] flex items-center justify-center border border-[#FDBA74]">
                <Database className="w-5 h-5 text-[#FF8A3D]" />
              </div>
              <h3 className="text-sm font-bold text-[#201815]">Verified Fact Checking</h3>
              <p className="text-xs text-[#7C6A5E] leading-relaxed">
                Matches numbers, statistics, and claims against your verified company data. Flags outdated figures before you quote them.
              </p>
            </SpotlightCard>

            <SpotlightCard className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFF2E7] text-[#D95D0D] flex items-center justify-center border border-[#FDBA74]">
                <Palette className="w-5 h-5 text-[#FF8A3D]" />
              </div>
              <h3 className="text-sm font-bold text-[#201815]">Logo & Visual Checks</h3>
              <p className="text-xs text-[#7C6A5E] leading-relaxed">
                Inspects graphics and banners for correct logo aspect ratios, minimum padding clearspace, and high-contrast accessibility.
              </p>
            </SpotlightCard>

            <SpotlightCard className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFF2E7] text-[#D95D0D] flex items-center justify-center border border-[#FDBA74]">
                <CheckSquare className="w-5 h-5 text-[#FF8A3D]" />
              </div>
              <h3 className="text-sm font-bold text-[#201815]">Approvals & Sign-off</h3>
              <p className="text-xs text-[#7C6A5E] leading-relaxed">
                Clear review workflow that allows managers to approve content with a verified timestamp and immutable record.
              </p>
            </SpotlightCard>
          </div>
        </div>
      </section>

      
      <section id="ai-comparison" className="py-20 sm:py-28 px-4 sm:px-6 bg-gradient-to-b from-[#FFFBF7] via-[#FFF8F2] to-[#FFFBF7] border-y border-[#F4E2D3] relative overflow-hidden">
        
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-r from-[#FF8A3D]/10 via-[#FFAE74]/15 to-transparent blur-3xl rounded-full pointer-events-none -z-0" />

        <div className="max-w-6xl mx-auto space-y-16 relative z-10">
          
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FFF2E7] text-[#D95D0D] text-xs font-black border border-[#FDBA74] shadow-xs">
              <GitCompare className="w-3.5 h-3.5 text-[#FF8A3D]" />
              <span>COMPETITIVE AI BENCHMARK & ARCHITECTURE</span>
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-[#201815] tracking-tight leading-tight">
              What Different Features Have Been Inserted Into FIDELIS?
            </h2>
            <p className="text-sm sm:text-base text-[#7C6A5E] leading-relaxed">
              Existing market tools address isolated pieces of brand management—such as draft scoring (<strong>Dasho</strong>), product catalog claims (<strong>Hypotenuse AI</strong>), ad visuals (<strong>Omneky</strong>), or asset versioning (<strong>BrandOS</strong>). FIDELIS was engineered as the first <strong>Open-Source Brand Governance Compiler</strong> with zero-hallucination mathematical verification, evidence expiry, and cryptographic receipts.
            </p>
          </div>

          
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-[#F4E2D3]">
              <div>
                <span className="text-xs font-bold text-[#7C6A5E] uppercase tracking-wider">
                  Select Competitor to Compare:
                </span>
              </div>
              <span className="text-[11px] text-[#A49184] font-medium hidden sm:inline">
                Click any tool below to inspect head-to-head architectural differences
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  id: "dasho" as const,
                  name: "1. Dasho",
                  focus: "Rules, Scoring & Approvals",
                  color: "#FF8A3D"
                },
                {
                  id: "hypotenuse" as const,
                  name: "2. Hypotenuse AI",
                  focus: "Content & Claim Compliance",
                  color: "#FF8A3D"
                },
                {
                  id: "omneky" as const,
                  name: "3. Omneky",
                  focus: "Visual Consistency & Ad Assets",
                  color: "#FF8A3D"
                },
                {
                  id: "brandos" as const,
                  name: "4. BrandOS",
                  focus: "Rules, Versioning & Audit",
                  color: "#FF8A3D"
                }
              ].map((comp) => {
                const isSelected = selectedCompetitor === comp.id;
                return (
                  <button
                    key={comp.id}
                    onClick={() => setSelectedCompetitor(comp.id)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? "bg-white border-[#FF8A3D] shadow-lg shadow-[#FF8A3D]/15 scale-[1.02]"
                        : "bg-white/70 border-[#F4E2D3] hover:border-[#FFAE74] hover:bg-white"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF8A3D] to-[#FFAE74]" />
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-black ${isSelected ? "text-[#D95D0D]" : "text-[#201815]"}`}>
                        {comp.name}
                      </span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-[#FF8A3D] animate-ping" />
                      )}
                    </div>
                    <p className="text-[11px] text-[#7C6A5E] font-medium mt-1">
                      {comp.focus}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          
          <div className="rounded-3xl bg-white border border-[#F4E2D3] shadow-xl shadow-[#FF8A3D]/5 overflow-hidden">
            
            <div className="p-6 bg-gradient-to-r from-[#FFF5EC] via-white to-[#FFF5EC] border-b border-[#F4E2D3] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-base font-black text-[#201815]">
                    FIDELIS vs.{" "}
                    {selectedCompetitor === "dasho" && "Dasho"}
                    {selectedCompetitor === "hypotenuse" && "Hypotenuse AI"}
                    {selectedCompetitor === "omneky" && "Omneky"}
                    {selectedCompetitor === "brandos" && "BrandOS (Lautum AI)"}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#FFF2E7] text-[#D95D0D] border border-[#FDBA74]">
                    {selectedCompetitor === "dasho" && "Scoring & Approvals"}
                    {selectedCompetitor === "hypotenuse" && "Product Claims"}
                    {selectedCompetitor === "omneky" && "Visual Creative"}
                    {selectedCompetitor === "brandos" && "Guardrails & Audit"}
                  </span>
                </div>
                <p className="text-xs text-[#7C6A5E] mt-1">
                  {selectedCompetitor === "dasho" &&
                    "Dasho checks drafts against brand guidelines before human review and supports approval workflows."}
                  {selectedCompetitor === "hypotenuse" &&
                    "Hypotenuse AI checks terminology, promotional claims and product information against approved data."}
                  {selectedCompetitor === "omneky" &&
                    "Omneky checks branding elements such as colours, fonts, logos and tone across marketing assets."}
                  {selectedCompetitor === "brandos" &&
                    "BrandOS provides guardrails, versioned digital assets, approvals and audit trails."}
                </p>
              </div>

              
              <div className="shrink-0">
                <a
                  href={
                    selectedCompetitor === "dasho"
                      ? "https://dasho.ai/platform?utm_source=chatgpt.com"
                      : selectedCompetitor === "hypotenuse"
                      ? "https://www.hypotenuse.ai/features/ai-compliance-checker?utm_source=chatgpt.com"
                      : selectedCompetitor === "omneky"
                      ? "https://www.omneky.com/brand-management?utm_source=chatgpt.com"
                      : "https://brandos.lautum.ai/?utm_source=chatgpt.com"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#FFF5EC] text-[#7C6A5E] hover:text-[#D95D0D] text-xs font-bold border border-[#F4E2D3] transition-colors shadow-xs"
                >
                  <span>Official website</span>
                  <ExternalLink className="w-3 h-3 text-[#FF8A3D]" />
                </a>
              </div>
            </div>

            
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#F4E2D3]">
              
              <div className="p-6 sm:p-8 space-y-6 bg-[#FCFAF8]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#FFF0F0] text-[#B42318] flex items-center justify-center font-bold text-xs border border-[#FECDCA]">
                      ✕
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-[#201815]">
                        {selectedCompetitor === "dasho" && "Dasho's Architecture"}
                        {selectedCompetitor === "hypotenuse" && "Hypotenuse AI's Approach"}
                        {selectedCompetitor === "omneky" && "Omneky's Model"}
                        {selectedCompetitor === "brandos" && "BrandOS's Platform"}
                      </h4>
                      <p className="text-[11px] text-[#7C6A5E]">
                        Where conventional tools leave critical enterprise blindspots
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-[#FFF0F0] text-[#B42318] font-black px-2 py-0.5 rounded border border-[#FECDCA]">
                    LIMITATIONS
                  </span>
                </div>

                
                <div className="space-y-4">
                  {selectedCompetitor === "dasho" && (
                    <>
                      <div className="p-4 rounded-2xl bg-white border border-[#F4E2D3] space-y-1.5">
                        <div className="text-xs font-extrabold text-[#B42318] flex items-center gap-1.5">
                          <X className="w-3.5 h-3.5 text-[#B42318] shrink-0" />
                          <span>Unverified AI Scoring & Probabilistic Flags</span>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          Generates arbitrary percentage scores (e.g., 78/100) and flags without citing exact rule IDs, line numbers, or verbatim brand book paragraphs. Hallucinations can block copywriters without justification.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-[#F4E2D3] space-y-1.5">
                        <div className="text-xs font-extrabold text-[#B42318] flex items-center gap-1.5">
                          <X className="w-3.5 h-3.5 text-[#B42318] shrink-0" />
                          <span>Voice-Destructive Paragraph Rewrites</span>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          AI rewrites whole paragraphs to satisfy style rules, flattening the author&rsquo;s strategic voice, emotional cadence, and Call-to-Actions (CTAs).
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-[#F4E2D3] space-y-1.5">
                        <div className="text-xs font-extrabold text-[#B42318] flex items-center gap-1.5">
                          <X className="w-3.5 h-3.5 text-[#B42318] shrink-0" />
                          <span>No Evidence Expiry on Numerical Claims</span>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          Audits wording and style, but cannot cross-reference customer numbers, uptime SLAs, or hardware specs against certified lab certificates or expiration horizons.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-[#F4E2D3] space-y-1.5">
                        <div className="text-xs font-extrabold text-[#B42318] flex items-center gap-1.5">
                          <X className="w-3.5 h-3.5 text-[#B42318] shrink-0" />
                          <span>Cloud Data Telemetry Risk</span>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          Unannounced product drafts, financial announcements, and trade secrets are uploaded to proprietary public cloud LLM endpoints.
                        </p>
                      </div>
                    </>
                  )}

                  {selectedCompetitor === "hypotenuse" && (
                    <>
                      <div className="p-4 rounded-2xl bg-white border border-[#F4E2D3] space-y-1.5">
                        <div className="text-xs font-extrabold text-[#B42318] flex items-center gap-1.5">
                          <X className="w-3.5 h-3.5 text-[#B42318] shrink-0" />
                          <span>Static Facts Without Evidence Expiry (STALE Lifecycle)</span>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          Facts in catalog tables are treated as timeless. Lacks certification horizons or expiration dates, allowing last year&rsquo;s audited statistics (e.g. &ldquo;50,000 customers&rdquo;) to slip into published copy as truth.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-[#F4E2D3] space-y-1.5">
                        <div className="text-xs font-extrabold text-[#B42318] flex items-center gap-1.5">
                          <X className="w-3.5 h-3.5 text-[#B42318] shrink-0" />
                          <span>Zero Visual, Logo, or Graphic Spec Inspection</span>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          Strictly a plain-text analyzer. Completely unable to inspect logo aspect-ratio stretching, clearspace bounding margins, or WCAG color contrast accessibility.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-[#F4E2D3] space-y-1.5">
                        <div className="text-xs font-extrabold text-[#B42318] flex items-center gap-1.5">
                          <X className="w-3.5 h-3.5 text-[#B42318] shrink-0" />
                          <span>No Executable Rulebook with Automated Unit Tests</span>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          Brand rules are maintained as static descriptive guidelines rather than compiled software assets with automated pass/fail test pairs.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-[#F4E2D3] space-y-1.5">
                        <div className="text-xs font-extrabold text-[#B42318] flex items-center gap-1.5">
                          <X className="w-3.5 h-3.5 text-[#B42318] shrink-0" />
                          <span>No Cryptographic Receipts for Legal Defense</span>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          Outputs standard web app confirmation without signed cryptographic receipts or hash chains to defend against trademark or regulatory disputes.
                        </p>
                      </div>
                    </>
                  )}

                  {selectedCompetitor === "omneky" && (
                    <>
                      <div className="p-4 rounded-2xl bg-white border border-[#F4E2D3] space-y-1.5">
                        <div className="text-xs font-extrabold text-[#B42318] flex items-center gap-1.5">
                          <X className="w-3.5 h-3.5 text-[#B42318] shrink-0" />
                          <span>Creative Ad Generation vs. Strict Legal Governance</span>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          Optimized for high-volume social advertising variant generation rather than rigorous regulatory compliance, trademark legal guardrails, and technical fidelity.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-[#F4E2D3] space-y-1.5">
                        <div className="text-xs font-extrabold text-[#B42318] flex items-center gap-1.5">
                          <X className="w-3.5 h-3.5 text-[#B42318] shrink-0" />
                          <span>Heuristic Vision vs. Deterministic Clearspace Math</span>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          Uses approximate AI computer vision rather than pixel-exact bounding-box clearspace padding formulas and WCAG 2.1 AA mathematical formulas.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-[#F4E2D3] space-y-1.5">
                        <div className="text-xs font-extrabold text-[#B42318] flex items-center gap-1.5">
                          <X className="w-3.5 h-3.5 text-[#B42318] shrink-0" />
                          <span>Zero Engineering Datasheet & Benchmark Verification</span>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          Focuses on visual layout, leaving technical specifications, battery life numbers, and performance benchmark claims completely unverified.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-[#F4E2D3] space-y-1.5">
                        <div className="text-xs font-extrabold text-[#B42318] flex items-center gap-1.5">
                          <X className="w-3.5 h-3.5 text-[#B42318] shrink-0" />
                          <span>No Tamper-Proof Cryptographic Non-Repudiation</span>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          Asset approvals exist inside standard application state without append-only cryptographic hash chaining.
                        </p>
                      </div>
                    </>
                  )}

                  {selectedCompetitor === "brandos" && (
                    <>
                      <div className="p-4 rounded-2xl bg-white border border-[#F4E2D3] space-y-1.5">
                        <div className="text-xs font-extrabold text-[#B42318] flex items-center gap-1.5">
                          <X className="w-3.5 h-3.5 text-[#B42318] shrink-0" />
                          <span>Mutable Relational Database Audit Logs</span>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          Audit trails reside in standard SQL database tables where any database administrator or compromised credential can silently alter or delete records.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-[#F4E2D3] space-y-1.5">
                        <div className="text-xs font-extrabold text-[#B42318] flex items-center gap-1.5">
                          <X className="w-3.5 h-3.5 text-[#B42318] shrink-0" />
                          <span>Static Prose Guidelines vs. Executable Code</span>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          Guidelines are maintained as human-readable documents or static text guardrails rather than compiled software assets with automated regression test suites.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-[#F4E2D3] space-y-1.5">
                        <div className="text-xs font-extrabold text-[#B42318] flex items-center gap-1.5">
                          <X className="w-3.5 h-3.5 text-[#B42318] shrink-0" />
                          <span>Dead-End Human Overrides Without Self-Evolution</span>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          When reviewers repeatedly override a brand rule, the overrides sit dormant in database rows without aggregating into proposed guideline amendments.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-[#F4E2D3] space-y-1.5">
                        <div className="text-xs font-extrabold text-[#B42318] flex items-center gap-1.5">
                          <X className="w-3.5 h-3.5 text-[#B42318] shrink-0" />
                          <span>Proprietary Cloud Lock-In & Enterprise Seat Licenses</span>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          Closed-source SaaS requiring proprietary enterprise contracts and recurring per-seat subscription models.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              
              <div className="p-6 sm:p-8 space-y-6 bg-gradient-to-br from-[#FFF9F4] to-white relative overflow-hidden">
                <BorderBeam duration={8} size={250} colorFrom="#FF8A3D" colorTo="#FFAE74" borderWidth={2} />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF8A3D] to-[#FF721B] text-white flex items-center justify-center font-black text-xs shadow-sm shadow-[#FF8A3D]/30">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-[#201815]">
                        What FIDELIS Inserted Differently
                      </h4>
                      <p className="text-[11px] text-[#D95D0D] font-bold">
                        Architectural Invariants & Built-In Advantages
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-[#EDFDF5] text-[#027A48] font-black px-2.5 py-0.5 rounded border border-[#A6F4C5]">
                    FIDELIS EXCLUSIVE
                  </span>
                </div>

                
                <div className="space-y-4">
                  {selectedCompetitor === "dasho" && (
                    <>
                      <div className="p-4 rounded-2xl bg-white border border-[#FDBA74] space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-extrabold text-[#201815] flex items-center gap-1.5">
                            <CheckCheck className="w-4 h-4 text-[#027A48] shrink-0" />
                            <span>Citation Verifier (&ldquo;No Citation, No Blocking Flag&rdquo;)</span>
                          </div>
                          <Link href="/findings" className="text-[10px] font-black text-[#D95D0D] hover:underline flex items-center gap-0.5">
                            <span>Inspect</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          An independent validation layer verifies every AI finding against exact rule IDs, verbatim source quotes, and content spans. Any unverified AI suggestion is strictly demoted to Advisory.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-[#FDBA74] space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-extrabold text-[#201815] flex items-center gap-1.5">
                            <CheckCheck className="w-4 h-4 text-[#027A48] shrink-0" />
                            <span>Intent Lock™ Minimal Token Diff</span>
                          </div>
                          <Link href="/review" className="text-[10px] font-black text-[#D95D0D] hover:underline flex items-center gap-0.5">
                            <span>Test Live</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          Generates surgical word-level replacements (e.g. swapping &ldquo;Apex Cloud&rdquo; for &ldquo;Apex Core™&rdquo;) while preserving 100% of the creator&rsquo;s tone, sentence structure, and calls-to-action.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-[#FDBA74] space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-extrabold text-[#201815] flex items-center gap-1.5">
                            <CheckCheck className="w-4 h-4 text-[#027A48] shrink-0" />
                            <span>Claim Ledger with Temporal Expiration</span>
                          </div>
                          <Link href="/facts" className="text-[10px] font-black text-[#D95D0D] hover:underline flex items-center gap-0.5">
                            <span>View Facts</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          Ties numbers to certified lab facts. Automatically flags expired claims as <span className="font-bold text-[#D95D0D]">STALE</span> and unsubstantiated superlatives as <span className="font-bold text-[#B42318]">NEEDS_PROOF</span>.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-[#FDBA74] space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-extrabold text-[#201815] flex items-center gap-1.5">
                            <CheckCheck className="w-4 h-4 text-[#027A48] shrink-0" />
                            <span>100% Air-Gapped Local Inference</span>
                          </div>
                          <Link href="/dashboard" className="text-[10px] font-black text-[#D95D0D] hover:underline flex items-center gap-0.5">
                            <span>Workspace</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          Runs with pre-trained open-source Qwen 2.5 on Hugging Face Serverless / Regional APIs for Render &amp; Vercel deployment, or 100% offline via local Ollama.
                        </p>
                      </div>
                    </>
                  )}

                  {selectedCompetitor === "hypotenuse" && (
                    <>
                      <div className="p-4 rounded-2xl bg-white border border-[#FDBA74] space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-extrabold text-[#201815] flex items-center gap-1.5">
                            <CheckCheck className="w-4 h-4 text-[#027A48] shrink-0" />
                            <span>Temporal Fact Lifecycle & Expiration Horizons</span>
                          </div>
                          <Link href="/facts" className="text-[10px] font-black text-[#D95D0D] hover:underline flex items-center gap-0.5">
                            <span>Claim Vault</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          Facts carry certified valid-from and valid-to timestamps. When a benchmark or customer statistic passes its expiration horizon, FIDELIS automatically flags it as STALE.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-[#FDBA74] space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-extrabold text-[#201815] flex items-center gap-1.5">
                            <CheckCheck className="w-4 h-4 text-[#027A48] shrink-0" />
                            <span>Multi-Modal Visual Clearspace & Contrast Engine</span>
                          </div>
                          <Link href="/assets" className="text-[10px] font-black text-[#D95D0D] hover:underline flex items-center gap-0.5">
                            <span>Asset Studio</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          Deterministic pixel formulas verify logo clearspace isolation padding, aspect-ratio stretch distortion, and WCAG 2.1 AA text-on-background contrast in real-time.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-[#FDBA74] space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-extrabold text-[#201815] flex items-center gap-1.5">
                            <CheckCheck className="w-4 h-4 text-[#027A48] shrink-0" />
                            <span>Executable Unit-Testable Rulebooks</span>
                          </div>
                          <Link href="/rulebook" className="text-[10px] font-black text-[#D95D0D] hover:underline flex items-center gap-0.5">
                            <span>Run Unit Tests</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          Every brand guideline rule compiles into an executable software module with embedded pass/fail test pairs, allowing instant regression verification.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-[#FDBA74] space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-extrabold text-[#201815] flex items-center gap-1.5">
                            <CheckCheck className="w-4 h-4 text-[#027A48] shrink-0" />
                            <span>Signed HMAC-SHA256 Compliance Receipts</span>
                          </div>
                          <Link href="/audit" className="text-[10px] font-black text-[#D95D0D] hover:underline flex items-center gap-0.5">
                            <span>Audit Receipts</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          Approved documents receive cryptographically signed brand receipts certifying exact rule versions and timestamped compliance for legal trademark defense.
                        </p>
                      </div>
                    </>
                  )}

                  {selectedCompetitor === "omneky" && (
                    <>
                      <div className="p-4 rounded-2xl bg-white border border-[#FDBA74] space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-extrabold text-[#201815] flex items-center gap-1.5">
                            <CheckCheck className="w-4 h-4 text-[#027A48] shrink-0" />
                            <span>Deterministic Mathematical Clearspace & WCAG AA</span>
                          </div>
                          <Link href="/assets" className="text-[10px] font-black text-[#D95D0D] hover:underline flex items-center gap-0.5">
                            <span>Visual Specs</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          Replaces subjective AI computer vision with deterministic bounding-box pixel formulas that calculate minimum clearspace isolation and contrast ratios with 100% precision.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-[#FDBA74] space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-extrabold text-[#201815] flex items-center gap-1.5">
                            <CheckCheck className="w-4 h-4 text-[#027A48] shrink-0" />
                            <span>Integrated Claim Ledger & Engineering Specs</span>
                          </div>
                          <Link href="/facts" className="text-[10px] font-black text-[#D95D0D] hover:underline flex items-center gap-0.5">
                            <span>Fact Vault</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          Combines visual brand protection with numerical claim verification, validating hardware datasheets, tolerances, and benchmarks against certified engineering evidence.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-[#FDBA74] space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-extrabold text-[#201815] flex items-center gap-1.5">
                            <CheckCheck className="w-4 h-4 text-[#027A48] shrink-0" />
                            <span>Cryptographic SHA-256 Hash-Chained Audit Ledger</span>
                          </div>
                          <Link href="/audit" className="text-[10px] font-black text-[#D95D0D] hover:underline flex items-center gap-0.5">
                            <span>Audit Chain</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          Every inspection, override, and sign-off is linked to previous hashes in an immutable cryptographic audit ledger, guaranteeing non-repudiation.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-[#FDBA74] space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-extrabold text-[#201815] flex items-center gap-1.5">
                            <CheckCheck className="w-4 h-4 text-[#027A48] shrink-0" />
                            <span>Self-Evolving Governance Loop</span>
                          </div>
                          <Link href="/insights" className="text-[10px] font-black text-[#D95D0D] hover:underline flex items-center gap-0.5">
                            <span>Governance</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          Clusters reviewer overrides by rule ID and automatically generates guideline amendment proposals when brand rules become obsolete or overly restrictive.
                        </p>
                      </div>
                    </>
                  )}

                  {selectedCompetitor === "brandos" && (
                    <>
                      <div className="p-4 rounded-2xl bg-white border border-[#FDBA74] space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-extrabold text-[#201815] flex items-center gap-1.5">
                            <CheckCheck className="w-4 h-4 text-[#027A48] shrink-0" />
                            <span>Cryptographic Append-Only SHA-256 Hash Chain</span>
                          </div>
                          <Link href="/audit" className="text-[10px] font-black text-[#D95D0D] hover:underline flex items-center gap-0.5">
                            <span>Inspect Ledger</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          Every review event, override, and approval is cryptographically chained to prev_hash. Even system administrators cannot alter past approvals without breaking hash validation.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-[#FDBA74] space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-extrabold text-[#201815] flex items-center gap-1.5">
                            <CheckCheck className="w-4 h-4 text-[#027A48] shrink-0" />
                            <span>Self-Evolving Governance Loop (Override Proposals)</span>
                          </div>
                          <Link href="/insights" className="text-[10px] font-black text-[#D95D0D] hover:underline flex items-center gap-0.5">
                            <span>Amendment Engine</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          Overrides don&rsquo;t hit a dead end in a database. FIDELIS clusters reviewer overrides and drafts formal rule amendment proposals to keep company guidelines in sync with reality.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-[#FDBA74] space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-extrabold text-[#201815] flex items-center gap-1.5">
                            <CheckCheck className="w-4 h-4 text-[#027A48] shrink-0" />
                            <span>Executable Rulebook with Programmatic Unit Tests</span>
                          </div>
                          <Link href="/rulebook" className="text-[10px] font-black text-[#D95D0D] hover:underline flex items-center gap-0.5">
                            <span>Rulebook Tests</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          Brand rules are versioned software artifacts with embedded pass/fail test pairs, enabling continuous integration and automated regression prevention.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-[#FDBA74] space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-extrabold text-[#201815] flex items-center gap-1.5">
                            <CheckCheck className="w-4 h-4 text-[#027A48] shrink-0" />
                            <span>100% Open-Source & Self-Hostable (MIT License)</span>
                          </div>
                          <Link href="/dashboard" className="text-[10px] font-black text-[#D95D0D] hover:underline flex items-center gap-0.5">
                            <span>Open Workspace</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                        <p className="text-xs text-[#7C6A5E] leading-relaxed pl-5">
                          Free and open under MIT license with complete data sovereignty, zero vendor lock-in, and zero recurring seat licensing costs.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          
          <div className="space-y-6 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#D95D0D] uppercase tracking-wider">
                  <Users className="w-3.5 h-3.5 text-[#FF8A3D]" />
                  <span>CREATOR &amp; USER EXPERIENCE</span>
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-[#201815] mt-1">
                  How Real Creators &amp; Teams Use FIDELIS Every Day
                </h3>
                <p className="text-xs text-[#7C6A5E] mt-1">
                  Select a team role below to see how FIDELIS eliminates frustration, speeds up approvals, and protects work:
                </p>
              </div>

              
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-[#FFF5EC] p-1.5 rounded-2xl border border-[#F4E2D3]">
                {[
                  { id: "creator" as const, label: "Content Creator", icon: PenTool, name: "Adhithya Biju" },
                  { id: "manager" as const, label: "Brand Manager", icon: Palette, name: "Sebin Sabu" },
                  { id: "reviewer" as const, label: "Compliance Reviewer", icon: ShieldCheck, name: "Albert Biju" },
                  { id: "approver" as const, label: "Executive Approver", icon: Award, name: "Biju" },
                  { id: "admin" as const, label: "System Admin", icon: Cpu, name: "Alfred Biju" }
                ].map((role) => {
                  const Icon = role.icon;
                  const isSelected = rolePerspective === role.id;
                  return (
                    <button
                      key={role.id}
                      onClick={() => setRolePerspective(role.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                        isSelected
                          ? "bg-white text-[#D95D0D] shadow-sm border border-[#FDBA74]"
                          : "text-[#7C6A5E] hover:text-[#201815]"
                      }`}
                    >
                      <Icon className="w-3 h-3 text-[#FF8A3D]" />
                      <span>{role.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            
            <div className="p-6 rounded-3xl bg-white border border-[#F4E2D3] shadow-md shadow-[#FF8A3D]/5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF8A3D] via-[#FFAE74] to-[#027A48]" />

              {rolePerspective === "creator" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F4E2D3] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#FFF2E7] text-[#D95D0D] border border-[#FDBA74] flex items-center justify-center font-black">
                        <PenTool className="w-6 h-6 text-[#FF8A3D]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black text-[#201815]">Content Creator Perspective</h4>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#FFF2E7] text-[#D95D0D] border border-[#FDBA74]">
                            Adhithya Biju
                          </span>
                        </div>
                        <p className="text-xs text-[#7C6A5E]">
                          Writers, copywriters, social media leads, and creative marketers
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/review"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF8A3D] to-[#FF721B] text-white text-xs font-black shadow-xs hover:shadow-md cursor-pointer self-start sm:self-auto"
                    >
                      <span>Try Review Studio</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#FDBA74] space-y-1.5">
                      <div className="text-xs font-black text-[#D95D0D] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#027A48] shrink-0" />
                        <span>Preserves Your Natural Voice</span>
                      </div>
                      <p className="text-xs text-[#7C6A5E] leading-relaxed">
                        Other AI checkers rewrite your whole paragraph with robotic filler. FIDELIS swaps <strong>only the violating trademark or name</strong> (e.g. &ldquo;Apex Cloud&rdquo; &rarr; &ldquo;Apex Core™&rdquo;), keeping 100% of your tone, energy, and CTAs intact.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#FDBA74] space-y-1.5">
                      <div className="text-xs font-black text-[#D95D0D] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#027A48] shrink-0" />
                        <span>No Mystery AI Rejection Scores</span>
                      </div>
                      <p className="text-xs text-[#7C6A5E] leading-relaxed">
                        Say goodbye to opaque scores like &ldquo;71/100 Compliance&rdquo;. If FIDELIS flags something, it highlights the exact sentence, cites the brand guide page number, and shows you verbatim proof.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#FDBA74] space-y-1.5">
                      <div className="text-xs font-black text-[#D95D0D] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#027A48] shrink-0" />
                        <span>Tamper-Proof Sign-Off Receipt</span>
                      </div>
                      <p className="text-xs text-[#7C6A5E] leading-relaxed">
                        No more email blame games asking &ldquo;Who approved this?&rdquo; Every approved piece gets an instant digital certificate with timestamp and sign-off verification.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {rolePerspective === "manager" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F4E2D3] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#FFF2E7] text-[#D95D0D] border border-[#FDBA74] flex items-center justify-center font-black">
                        <Palette className="w-6 h-6 text-[#FF8A3D]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black text-[#201815]">Brand Manager &amp; Designer Perspective</h4>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#FFF2E7] text-[#D95D0D] border border-[#FDBA74]">
                            Sebin Sabu
                          </span>
                        </div>
                        <p className="text-xs text-[#7C6A5E]">
                          Brand guardians, design systems leads, and visual identity directors
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/rulebook"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF8A3D] to-[#FF721B] text-white text-xs font-black shadow-xs hover:shadow-md cursor-pointer self-start sm:self-auto"
                    >
                      <span>Open Brand Compiler</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#FDBA74] space-y-1.5">
                      <div className="text-xs font-black text-[#D95D0D] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#027A48] shrink-0" />
                        <span>Never Write Complex Rules by Hand</span>
                      </div>
                      <p className="text-xs text-[#7C6A5E] leading-relaxed">
                        Drop your 60-page Brand Guidelines PDF into FIDELIS. The AI automatically compiles actionable, testable rules with citations and pass/fail pairs in under 15 seconds.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#FDBA74] space-y-1.5">
                      <div className="text-xs font-black text-[#D95D0D] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#027A48] shrink-0" />
                        <span>Logo Clearspace &amp; Stretch Protection</span>
                      </div>
                      <p className="text-xs text-[#7C6A5E] leading-relaxed">
                        Detects when logos are stretched out of aspect ratio or placed too close to edges without sufficient clearspace margin before banners are pushed to print or web.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#FDBA74] space-y-1.5">
                      <div className="text-xs font-black text-[#D95D0D] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#027A48] shrink-0" />
                        <span>Rules Automatically Stay Fresh</span>
                      </div>
                      <p className="text-xs text-[#7C6A5E] leading-relaxed">
                        When copywriters repeatedly ask for exceptions for approved new campaign slang, FIDELIS alerts you with auto-drafted policy updates so your brand book never goes stale.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {rolePerspective === "reviewer" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F4E2D3] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#FFF2E7] text-[#D95D0D] border border-[#FDBA74] flex items-center justify-center font-black">
                        <ShieldCheck className="w-6 h-6 text-[#FF8A3D]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black text-[#201815]">Compliance Reviewer Perspective</h4>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#FFF2E7] text-[#D95D0D] border border-[#FDBA74]">
                            Albert Biju
                          </span>
                        </div>
                        <p className="text-xs text-[#7C6A5E]">
                          Legal counsels, regulatory reviewers, and technical copy gatekeepers
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/findings"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF8A3D] to-[#FF721B] text-white text-xs font-black shadow-xs hover:shadow-md cursor-pointer self-start sm:self-auto"
                    >
                      <span>Inspect Audit Findings</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#FDBA74] space-y-1.5">
                      <div className="text-xs font-black text-[#D95D0D] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#027A48] shrink-0" />
                        <span>Exact Rule Citations on Every Flag</span>
                      </div>
                      <p className="text-xs text-[#7C6A5E] leading-relaxed">
                        Every single highlighted issue links directly to an approved guideline excerpt or fact certificate. No vague advice, no arbitrary censorship, and zero AI hallucinations.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#FDBA74] space-y-1.5">
                      <div className="text-xs font-black text-[#D95D0D] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#027A48] shrink-0" />
                        <span>Saves Company from False Ad Fines</span>
                      </div>
                      <p className="text-xs text-[#7C6A5E] leading-relaxed">
                        The Claim Vault flags outdated statistics (e.g. &ldquo;99.98% uptime SLA&rdquo;) once their lab validity timestamp expires, stopping marketing from publishing unsubstantiated claims.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#FDBA74] space-y-1.5">
                      <div className="text-xs font-black text-[#D95D0D] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#027A48] shrink-0" />
                        <span>Grant Legitimate Campaign Exceptions</span>
                      </div>
                      <p className="text-xs text-[#7C6A5E] leading-relaxed">
                        Have a special Super Bowl campaign or partner co-branding? Easily grant a verified exception with a single click, recording the rationale cleanly in the audit log.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {rolePerspective === "approver" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F4E2D3] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#FFF2E7] text-[#D95D0D] border border-[#FDBA74] flex items-center justify-center font-black">
                        <Award className="w-6 h-6 text-[#FF8A3D]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black text-[#201815]">Executive Approver Perspective</h4>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#FFF2E7] text-[#D95D0D] border border-[#FDBA74]">
                            Biju
                          </span>
                        </div>
                        <p className="text-xs text-[#7C6A5E]">
                          VP Marketing, Chief Marketing Officer, and Executive Sign-off Authorities
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/approvals"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF8A3D] to-[#FF721B] text-white text-xs font-black shadow-xs hover:shadow-md cursor-pointer self-start sm:self-auto"
                    >
                      <span>Open Approval Desk</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#FDBA74] space-y-1.5">
                      <div className="text-xs font-black text-[#D95D0D] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#027A48] shrink-0" />
                        <span>10-Second Sign-Off Without Bottlenecks</span>
                      </div>
                      <p className="text-xs text-[#7C6A5E] leading-relaxed">
                        Executives don&rsquo;t have time to read 40 pages of copy. FIDELIS gives you a concise, verified summary showing exactly what was verified, flagged, and corrected.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#FDBA74] space-y-1.5">
                      <div className="text-xs font-black text-[#D95D0D] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#027A48] shrink-0" />
                        <span>Full Non-Repudiation Defense</span>
                      </div>
                      <p className="text-xs text-[#7C6A5E] leading-relaxed">
                        Approvals generate cryptographic brand receipts that defend your company in regulatory or trademark disputes, proving due diligence was exercised before publication.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#FDBA74] space-y-1.5">
                      <div className="text-xs font-black text-[#D95D0D] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#027A48] shrink-0" />
                        <span>High-Level Governance Analytics</span>
                      </div>
                      <p className="text-xs text-[#7C6A5E] leading-relaxed">
                        Inspect top repeated rule violations, common brand exceptions, and team compliance velocities directly from the executive dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {rolePerspective === "admin" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F4E2D3] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#FFF2E7] text-[#D95D0D] border border-[#FDBA74] flex items-center justify-center font-black">
                        <Cpu className="w-6 h-6 text-[#FF8A3D]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black text-[#201815]">System Administrator Perspective</h4>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#FFF2E7] text-[#D95D0D] border border-[#FDBA74]">
                            Alfred Biju
                          </span>
                        </div>
                        <p className="text-xs text-[#7C6A5E]">
                          IT Directors, Security Engineers, and Enterprise Platform Admins
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/audit"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF8A3D] to-[#FF721B] text-white text-xs font-black shadow-xs hover:shadow-md cursor-pointer self-start sm:self-auto"
                    >
                      <span>Verify Audit Chain</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#FDBA74] space-y-1.5">
                      <div className="text-xs font-black text-[#D95D0D] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#027A48] shrink-0" />
                        <span>Zero Cloud Data Leaks (100% Air-Gapped)</span>
                      </div>
                      <p className="text-xs text-[#7C6A5E] leading-relaxed">
                        Unreleased product launches, financial earnings drafts, and proprietary trade secrets are processed 100% offline via local models (Qwen2.5). Zero data leaves your internal network.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#FDBA74] space-y-1.5">
                      <div className="text-xs font-black text-[#D95D0D] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#027A48] shrink-0" />
                        <span>Zero Per-Seat License Fees (MIT)</span>
                      </div>
                      <p className="text-xs text-[#7C6A5E] leading-relaxed">
                        Fully open-source under the MIT license. Add 10 or 10,000 creators, freelancers, and marketing agencies without paying thousands in recurring SaaS seat fees.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#FDBA74] space-y-1.5">
                      <div className="text-xs font-black text-[#D95D0D] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#027A48] shrink-0" />
                        <span>Tamper-Proof SHA-256 Audit Ledger</span>
                      </div>
                      <p className="text-xs text-[#7C6A5E] leading-relaxed">
                        Audit events are cryptographically hash-chained. Even administrators cannot silently alter historical records or past approvals without triggering ledger invalidation.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          
          <div className="space-y-6 pt-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#D95D0D] uppercase tracking-wider">
                  <Scale className="w-3.5 h-3.5 text-[#FF8A3D]" />
                  <span>
                    {matrixPerspective === "user"
                      ? "CREATOR &amp; USER PERSPECTIVE MATRIX"
                      : "TECHNICAL ARCHITECTURE MATRIX"}
                  </span>
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-[#201815] mt-1">
                  {matrixPerspective === "user"
                    ? "What FIDELIS Does For Creators & Users vs. Competitors"
                    : "Feature-by-Feature Architectural Invariants Comparison"}
                </h3>
                <p className="text-xs text-[#7C6A5E] mt-0.5">
                  {matrixPerspective === "user"
                    ? "Direct day-to-day benefits and pain points solved for content writers, designers, and marketing teams."
                    : "Cryptographic, algorithmic, and software-compiler architectural specifications."}
                </p>
              </div>

              
              <div className="flex flex-wrap items-center gap-2">
                
                <div className="flex items-center gap-1 bg-[#FFF5EC] p-1 rounded-xl border border-[#F4E2D3] text-xs font-bold">
                  <button
                    onClick={() => setMatrixPerspective("user")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      matrixPerspective === "user"
                        ? "bg-gradient-to-r from-[#FF8A3D] to-[#FF721B] text-white shadow-xs font-black"
                        : "text-[#7C6A5E] hover:text-[#201815]"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Creator / User View</span>
                  </button>
                  <button
                    onClick={() => setMatrixPerspective("technical")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      matrixPerspective === "technical"
                        ? "bg-[#201815] text-white shadow-xs font-black"
                        : "text-[#7C6A5E] hover:text-[#201815]"
                    }`}
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Technical Architecture</span>
                  </button>
                </div>

                
                <div className="flex items-center gap-1 bg-[#FFF5EC] p-1 rounded-xl border border-[#F4E2D3] text-xs font-bold">
                  <button
                    onClick={() => setMatrixFilter("all")}
                    className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      matrixFilter === "all"
                        ? "bg-white text-[#D95D0D] shadow-xs"
                        : "text-[#7C6A5E] hover:text-[#201815]"
                    }`}
                  >
                    All 10
                  </button>
                  <button
                    onClick={() => setMatrixFilter("exclusive")}
                    className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      matrixFilter === "exclusive"
                        ? "bg-white text-[#D95D0D] shadow-xs"
                        : "text-[#7C6A5E] hover:text-[#201815]"
                    }`}
                  >
                    <span>Exclusives (8)</span>
                  </button>
                </div>
              </div>
            </div>

            
            <div className="rounded-3xl bg-white border border-[#F4E2D3] shadow-md shadow-[#FF8A3D]/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                  <thead>
                    <tr className="border-b border-[#F4E2D3] bg-[#FCFAF8]">
                      <th className="py-4 px-5 font-black text-[#201815] w-[34%]">
                        {matrixPerspective === "user"
                          ? "Day-to-Day Creator & User Capability"
                          : "Capability & Architectural Invariant"}
                      </th>
                      <th className="py-4 px-4 font-black bg-gradient-to-r from-[#FFF2E7] to-[#FFEAD9] text-[#D95D0D] border-x border-[#FDBA74] w-[20%] text-center">
                        <div className="flex items-center justify-center gap-1">
                          <ShieldCheck className="w-4 h-4 text-[#FF8A3D]" />
                          <span>FIDELIS (Our Platform)</span>
                        </div>
                      </th>
                      <th className="py-4 px-3 font-bold text-[#7C6A5E] text-center w-[11.5%]">
                        1. Dasho
                      </th>
                      <th className="py-4 px-3 font-bold text-[#7C6A5E] text-center w-[11.5%]">
                        2. Hypotenuse AI
                      </th>
                      <th className="py-4 px-3 font-bold text-[#7C6A5E] text-center w-[11.5%]">
                        3. Omneky
                      </th>
                      <th className="py-4 px-3 font-bold text-[#7C6A5E] text-center w-[11.5%]">
                        4. BrandOS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F4E2D3]">
                    {(matrixPerspective === "user"
                      ? [
                          {
                            name: "1-Click Word Fixes (Never Kills Your Voice)",
                            sub: "Swaps only the violating trademark or name; keeps 100% of your tone, energy & CTAs",
                            fidelis: "✓ 100% Voice Intact",
                            dasho: "✕ Rewrites full paragraphs",
                            hypo: "✕ Generative rewrites",
                            omneky: "✕ Ad variant spam",
                            brandos: "⚠️ Manual copy edits",
                            exclusive: true
                          },
                          {
                            name: "Zero Mystery Rejections ('Show Me The Rule')",
                            sub: "If the AI cannot point to the exact brand guide page and verbatim sentence, it cannot block your draft",
                            fidelis: "✓ Guaranteed Citation",
                            dasho: "✕ Mystery % score",
                            hypo: "✕ Uncited warnings",
                            omneky: "✕ Subjective opinion",
                            brandos: "✕ Human bottlenecks",
                            exclusive: true
                          },
                          {
                            name: "Expired Claims & Outdated Numbers Alert",
                            sub: "Stops writers from accidentally quoting old stats (e.g. '50k customers' or '99.9% uptime') that risk false ad fines",
                            fidelis: "✓ Live Proof & Expiry",
                            dasho: "✕ No claim checks",
                            hypo: "⚠️ Untimed catalog",
                            omneky: "✕ Visual focus only",
                            brandos: "✕ Static wiki text",
                            exclusive: true
                          },
                          {
                            name: "AI Reads Guidelines Directly From PDF",
                            sub: "Upload your company's 50-page brand guide PDF; AI extracts rules & starts checking copy in 15 seconds",
                            fidelis: "✓ 15-Sec PDF Learner",
                            dasho: "✕ Manual rule entry",
                            hypo: "✕ Keyword list",
                            omneky: "✕ Design tokens",
                            brandos: "⚠️ Static prose guide",
                            exclusive: true
                          },
                          {
                            name: "Signed 'Brand Receipts' (Ends Approval Blame)",
                            sub: "Creators get a tamper-proof digital certificate proving who approved their campaign and when",
                            fidelis: "✓ Official Sign-Off Receipt",
                            dasho: "✕ No verifiable proof",
                            hypo: "✕ No sign-off receipt",
                            omneky: "✕ No sign-off receipt",
                            brandos: "✕ Basic web logs",
                            exclusive: true
                          },
                          {
                            name: "Rules That Adapt to You (No Dead-End Rules)",
                            sub: "When reviewers approve exceptions for new marketing slogans, FIDELIS drafts updates to the brand book",
                            fidelis: "✓ Rules Evolve With You",
                            dasho: "✕ Rules never adapt",
                            hypo: "✕ Static catalog",
                            omneky: "✕ Static assets",
                            brandos: "✕ Dead-end overrides",
                            exclusive: true
                          },
                          {
                            name: "Logo Stretch, Clearspace & Contrast Safecheck",
                            sub: "Catches squished logos, crowded clearspace margins, and low-contrast text before assets go live",
                            fidelis: "✓ Pixel Safecheck",
                            dasho: "✕ Plain text only",
                            hypo: "✕ Plain text only",
                            omneky: "⚠️ Approximate vision",
                            brandos: "⚠️ Static asset viewer",
                            exclusive: false
                          },
                          {
                            name: "100% Privacy for Unreleased Products & Launches",
                            sub: "Runs completely offline on your device; confidential drafts and embargoed releases never touch the cloud",
                            fidelis: "✓ Zero Cloud Leaks",
                            dasho: "✕ Cloud SaaS (leak risk)",
                            hypo: "✕ Cloud SaaS (leak risk)",
                            omneky: "✕ Cloud SaaS (leak risk)",
                            brandos: "✕ Cloud SaaS (leak risk)",
                            exclusive: true
                          },
                          {
                            name: "Zero Seat Fees / Free for All Writers & Agencies",
                            sub: "MIT Open Source; invite unlimited in-house copywriters, freelance designers, and agency partners for free",
                            fidelis: "✓ Free for All Creators",
                            dasho: "✕ Costly per-seat fee",
                            hypo: "✕ Costly per-seat fee",
                            omneky: "✕ Enterprise paywall",
                            brandos: "✕ Enterprise paywall",
                            exclusive: true
                          },
                          {
                            name: "1-Click Rule Health Checks",
                            sub: "Brand managers can test new rules in 1 click against pass/fail test pairs to prevent false alarms",
                            fidelis: "✓ 1-Click Health Check",
                            dasho: "✕ No rule testing",
                            hypo: "✕ No rule testing",
                            omneky: "✕ No rule testing",
                            brandos: "✕ No rule testing",
                            exclusive: true
                          }
                        ]
                      : [
                          {
                            name: "Zero-Hallucination Citation Verifier",
                            sub: "Independent layer strictly demotes uncited AI flags to Advisory",
                            fidelis: "✓ Enforced Invariant",
                            dasho: "✕ Opaque scoring",
                            hypo: "✕ Probabilistic",
                            omneky: "✕ Subjective",
                            brandos: "✕ Manual",
                            exclusive: true
                          },
                          {
                            name: "Intent Lock™ Minimal Token Diff",
                            sub: "Replaces only violating words; preserves 100% of author voice & CTAs",
                            fidelis: "✓ Minimal AST Diff",
                            dasho: "✕ Full rewrite",
                            hypo: "✕ Generative rewrite",
                            omneky: "✕ Ad variant gen",
                            brandos: "⚠️ Manual edits",
                            exclusive: true
                          },
                          {
                            name: "Claim Ledger with Evidence Expiry",
                            sub: "Binds stats to lab dates; flags STALE metrics and NEEDS_PROOF",
                            fidelis: "✓ Temporal Lifecycle",
                            dasho: "✕ No claim check",
                            hypo: "⚠️ Static catalog",
                            omneky: "✕ Visual focus",
                            brandos: "✕ Static text",
                            exclusive: true
                          },
                          {
                            name: "Executable Unit-Testable Rulebooks",
                            sub: "Brand rules run automated pass/fail regression test suites in 1 click",
                            fidelis: "✓ Embedded Unit Tests",
                            dasho: "✕ Static guidelines",
                            hypo: "✕ Keyword list",
                            omneky: "✕ Design tokens",
                            brandos: "⚠️ Prose guardrails",
                            exclusive: true
                          },
                          {
                            name: "Cryptographic SHA-256 Chained Audit",
                            sub: "Append-only blockchain-style hash chain links prev_hash to current_hash",
                            fidelis: "✓ Append-Only Chain",
                            dasho: "✕ Basic log",
                            hypo: "✕ Basic history",
                            omneky: "✕ Asset history",
                            brandos: "⚠️ Mutable SQL log",
                            exclusive: true
                          },
                          {
                            name: "Signed HMAC-SHA256 Brand Receipts",
                            sub: "Tamper-evident compliance certificates for trademark & legal defense",
                            fidelis: "✓ Verifiable Receipts",
                            dasho: "✕ No certificates",
                            hypo: "✕ No certificates",
                            omneky: "✕ No certificates",
                            brandos: "✕ No certificates",
                            exclusive: true
                          },
                          {
                            name: "Self-Evolving Governance Loop",
                            sub: "Reviewer overrides cluster by rule ID to auto-draft guideline amendments",
                            fidelis: "✓ Auto-Drafts Proposals",
                            dasho: "✕ Static workflows",
                            hypo: "✕ Static catalog",
                            omneky: "✕ Static assets",
                            brandos: "✕ Dead-end overrides",
                            exclusive: true
                          },
                          {
                            name: "Multi-Modal Clearspace & Contrast Engine",
                            sub: "Mathematical pixel bounding box clearspace & WCAG 2.1 AA formulas",
                            fidelis: "✓ Deterministic Math",
                            dasho: "✕ Text only",
                            hypo: "✕ Text only",
                            omneky: "⚠️ Heuristic vision",
                            brandos: "⚠️ Asset viewer",
                            exclusive: false
                          },
                          {
                            name: "Pre-Trained Open-Source Inference",
                            sub: "Runs on pre-trained open-source Qwen 2.5 (Hugging Face / Local Ollama); zero third-party data retention",
                            fidelis: "✓ Zero Cloud Telemetry",
                            dasho: "✕ Cloud SaaS",
                            hypo: "✕ Cloud SaaS",
                            omneky: "✕ Cloud SaaS",
                            brandos: "✕ Cloud SaaS",
                            exclusive: true
                          },
                          {
                            name: "Open-Source & Self-Hostable (MIT)",
                            sub: "Inspectable source code, no vendor lock-in, zero per-seat fees",
                            fidelis: "✓ MIT Open-Source",
                            dasho: "✕ Closed SaaS",
                            hypo: "✕ Closed SaaS",
                            omneky: "✕ Closed SaaS",
                            brandos: "✕ Closed SaaS",
                            exclusive: true
                          }
                        ]
                    )
                      .filter((row) => (matrixFilter === "exclusive" ? row.exclusive : true))
                      .map((row, idx) => (
                        <tr key={idx} className="hover:bg-[#FFFDFB] transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="font-extrabold text-[#201815]">{row.name}</div>
                            <div className="text-[11px] text-[#7C6A5E] mt-0.5">{row.sub}</div>
                          </td>
                          <td className="py-3.5 px-4 bg-[#FFF9F3] border-x border-[#FDBA74] text-center">
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-[#027A48] bg-[#EDFDF5] px-2.5 py-1 rounded-full border border-[#A6F4C5]">
                              {row.fidelis}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className="text-[10px] font-bold text-[#B42318] bg-[#FFF0F0] px-2 py-0.5 rounded border border-[#FECDCA]">
                              {row.dasho}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              row.hypo.startsWith("⚠️")
                                ? "text-[#B54708] bg-[#FEF0C7] border-[#FEDF89]"
                                : "text-[#B42318] bg-[#FFF0F0] border-[#FECDCA]"
                            }`}>
                              {row.hypo}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              row.omneky.startsWith("⚠️")
                                ? "text-[#B54708] bg-[#FEF0C7] border-[#FEDF89]"
                                : "text-[#B42318] bg-[#FFF0F0] border-[#FECDCA]"
                            }`}>
                              {row.omneky}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              row.brandos.startsWith("⚠️")
                                ? "text-[#B54708] bg-[#FEF0C7] border-[#FEDF89]"
                                : "text-[#B42318] bg-[#FFF0F0] border-[#FECDCA]"
                            }`}>
                              {row.brandos}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          
          <div className="space-y-8 pt-6">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#FFF2E7] text-[#D95D0D] text-xs font-extrabold border border-[#FDBA74]">
                <Sparkles className="w-3.5 h-3.5 text-[#FF8A3D]" />
                <span>THE FIDELIS DIFFERENCE</span>
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-[#201815]">
                {matrixPerspective === "user"
                  ? "6 Major Features Built Specifically for Creators & Teams"
                  : "6 Architectural Inventions You Won’t Find in Other Brand Tools"}
              </h3>
              <p className="text-xs sm:text-sm text-[#7C6A5E]">
                {matrixPerspective === "user"
                  ? "Engineered so creators never lose their authentic voice, reviewers never get bogged down, and managers get complete peace of mind."
                  : "Engineered specifically to solve the false positives, voice disruption, and security gaps of existing AI platforms."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <SpotlightCard className="p-6 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF8A3D] to-[#FFAE74] text-white flex items-center justify-center shadow-sm shadow-[#FF8A3D]/25">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-extrabold text-[#201815]">
                      {matrixPerspective === "user"
                        ? "1. Surgical 1-Click Fixes"
                        : "1. Intent Lock™ Diff Engine"}
                    </h4>
                    <span className="text-[9px] font-black bg-[#FFF2E7] text-[#D95D0D] px-2 py-0.5 rounded-full border border-[#FDBA74]">
                      {matrixPerspective === "user" ? "KEEPS YOUR VOICE" : "MINIMAL DIFF"}
                    </span>
                  </div>
                  <p className="text-xs text-[#7C6A5E] leading-relaxed mt-2">
                    {matrixPerspective === "user"
                      ? "Never lets AI rewrite your entire paragraph into robotic corporate filler. FIDELIS surgically swaps only the violating trademark or name (e.g. Apex Core™), preserving 100% of your authentic tone and calls-to-action."
                      : "Computes minimal AST token replacements (e.g. swapping deprecated terms) while guaranteeing calls-to-action, author tone, and sentence structure are 100% untouched."}
                  </p>
                </div>
                <div className="pt-2 border-t border-[#F4E2D3] flex items-center justify-between text-xs">
                  <span className="text-[#A49184]">Dasho &amp; Hypotenuse: ✕ Full rewrites</span>
                  <Link href="/review" className="font-extrabold text-[#D95D0D] hover:underline flex items-center gap-1">
                    <span>Test Diff</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </SpotlightCard>

              
              <SpotlightCard className="p-6 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF8A3D] to-[#FFAE74] text-white flex items-center justify-center shadow-sm shadow-[#FF8A3D]/25">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-extrabold text-[#201815]">
                      {matrixPerspective === "user"
                        ? "2. 'Show Me The Rule' Protection"
                        : "2. Citation Verifier"}
                    </h4>
                    <span className="text-[9px] font-black bg-[#FFF2E7] text-[#D95D0D] px-2 py-0.5 rounded-full border border-[#FDBA74]">
                      {matrixPerspective === "user" ? "ZERO BOGUS REJECTIONS" : "ZERO HALLUCINATION"}
                    </span>
                  </div>
                  <p className="text-xs text-[#7C6A5E] leading-relaxed mt-2">
                    {matrixPerspective === "user"
                      ? "No more mysterious percentage scores or arbitrary AI flags. If FIDELIS cannot point to the exact page, sentence, and verbatim quote in your company's brand book, it is strictly forbidden from blocking you."
                      : "An independent verifier checks every AI finding against exact rule IDs, verbatim quotes, and content spans. If unverified, the flag is strictly demoted to Advisory."}
                  </p>
                </div>
                <div className="pt-2 border-t border-[#F4E2D3] flex items-center justify-between text-xs">
                  <span className="text-[#A49184]">Dasho: ✕ Mystery score</span>
                  <Link href="/findings" className="font-extrabold text-[#D95D0D] hover:underline flex items-center gap-1">
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </SpotlightCard>

              
              <SpotlightCard className="p-6 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF8A3D] to-[#FFAE74] text-white flex items-center justify-center shadow-sm shadow-[#FF8A3D]/25">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-extrabold text-[#201815]">
                      {matrixPerspective === "user"
                        ? "3. Outdated Numbers & Claims Alarm"
                        : "3. Temporal Claim Ledger"}
                    </h4>
                    <span className="text-[9px] font-black bg-[#FFF2E7] text-[#D95D0D] px-2 py-0.5 rounded-full border border-[#FDBA74]">
                      {matrixPerspective === "user" ? "SAVES YOU FROM FINES" : "EVIDENCE EXPIRY"}
                    </span>
                  </div>
                  <p className="text-xs text-[#7C6A5E] leading-relaxed mt-2">
                    {matrixPerspective === "user"
                      ? "Stops writers from accidentally publishing last year's statistics (e.g. quoting '50,000 users' or '99.9% uptime' when the audit has expired). Verifies every number against live proof certificates."
                      : "Binds numbers and statistics to lab-certified dates. When metrics pass their expiration horizon, FIDELIS automatically flags them as STALE before publication."}
                  </p>
                </div>
                <div className="pt-2 border-t border-[#F4E2D3] flex items-center justify-between text-xs">
                  <span className="text-[#A49184]">Hypotenuse: ⚠️ Untimed catalog</span>
                  <Link href="/facts" className="font-extrabold text-[#D95D0D] hover:underline flex items-center gap-1">
                    <span>Claim Vault</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </SpotlightCard>

              
              <SpotlightCard className="p-6 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF8A3D] to-[#FFAE74] text-white flex items-center justify-center shadow-sm shadow-[#FF8A3D]/25">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-extrabold text-[#201815]">
                      {matrixPerspective === "user"
                        ? "4. Drag &amp; Drop Brand PDF Compiler"
                        : "4. Unit-Testable Rulebooks"}
                    </h4>
                    <span className="text-[9px] font-black bg-[#FFF2E7] text-[#D95D0D] px-2 py-0.5 rounded-full border border-[#FDBA74]">
                      {matrixPerspective === "user" ? "15-SEC SETUP" : "PROGRAMMATIC CI"}
                    </span>
                  </div>
                  <p className="text-xs text-[#7C6A5E] leading-relaxed mt-2">
                    {matrixPerspective === "user"
                      ? "Brand managers don't have to code or configure complex rule systems. Drop in your company's 50-page Brand Guidelines PDF, and FIDELIS reads, parses, and begins enforcing rules in 15 seconds."
                      : "Brand rules compile into testable code with pass/fail test pairs. Brand managers can click 'Run Rule Health Check' to catch false flags before updating policy."}
                  </p>
                </div>
                <div className="pt-2 border-t border-[#F4E2D3] flex items-center justify-between text-xs">
                  <span className="text-[#A49184]">BrandOS &amp; Dasho: ✕ Manual prose</span>
                  <Link href="/rulebook" className="font-extrabold text-[#D95D0D] hover:underline flex items-center gap-1">
                    <span>Learn from PDF</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </SpotlightCard>

              
              <SpotlightCard className="p-6 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF8A3D] to-[#FFAE74] text-white flex items-center justify-center shadow-sm shadow-[#FF8A3D]/25">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-extrabold text-[#201815]">
                      {matrixPerspective === "user"
                        ? "5. Signed Digital Brand Receipts"
                        : "5. SHA-256 Hash Chaining"}
                    </h4>
                    <span className="text-[9px] font-black bg-[#FFF2E7] text-[#D95D0D] px-2 py-0.5 rounded-full border border-[#FDBA74]">
                      {matrixPerspective === "user" ? "ENDS BLAME GAMES" : "SIGNED RECEIPTS"}
                    </span>
                  </div>
                  <p className="text-xs text-[#7C6A5E] leading-relaxed mt-2">
                    {matrixPerspective === "user"
                      ? "Every approved piece of copy gets a certified digital brand receipt stamped with the approver's name and timestamp, protecting creators from post-launch blame and giving legal ironclad proof of sign-off."
                      : "Every audit log event cryptographically references previous hashes, preventing retroactive log manipulation. Approvals issue signed HMAC receipts for trademark defense."}
                  </p>
                </div>
                <div className="pt-2 border-t border-[#F4E2D3] flex items-center justify-between text-xs">
                  <span className="text-[#A49184]">All Competitors: ✕ No receipts</span>
                  <Link href="/audit" className="font-extrabold text-[#D95D0D] hover:underline flex items-center gap-1">
                    <span>Receipts Ledger</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </SpotlightCard>

              
              <SpotlightCard className="p-6 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF8A3D] to-[#FFAE74] text-white flex items-center justify-center shadow-sm shadow-[#FF8A3D]/25">
                  <GitCompare className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-extrabold text-[#201815]">
                      {matrixPerspective === "user"
                        ? "6. Self-Updating Company Rules"
                        : "6. Self-Evolving Governance"}
                    </h4>
                    <span className="text-[9px] font-black bg-[#FFF2E7] text-[#D95D0D] px-2 py-0.5 rounded-full border border-[#FDBA74]">
                      {matrixPerspective === "user" ? "RULES ADAPT TO YOU" : "FEEDBACK LOOP"}
                    </span>
                  </div>
                  <p className="text-xs text-[#7C6A5E] leading-relaxed mt-2">
                    {matrixPerspective === "user"
                      ? "Guidelines shouldn't be stubborn roadblocks. When reviewers repeatedly approve exceptions for new marketing slogans or campaign styles, FIDELIS automatically drafts an update to the rulebook."
                      : "When editorial reviewers override a rule repeatedly, FIDELIS clusters the overrides and auto-drafts guideline amendment proposals to modernize outdated guidelines."}
                  </p>
                </div>
                <div className="pt-2 border-t border-[#F4E2D3] flex items-center justify-between text-xs">
                  <span className="text-[#A49184]">All Competitors: ✕ Dead-end rules</span>
                  <Link href="/insights" className="font-extrabold text-[#D95D0D] hover:underline flex items-center gap-1">
                    <span>Rule Proposals</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </SpotlightCard>
            </div>
          </div>
        </div>
      </section>

      
      <section id="why-fidelis" className="py-20 bg-white/70 backdrop-blur-md border-y border-[#F4E2D3] px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#FFF2E7] text-[#D95D0D] text-xs font-extrabold border border-[#FDBA74]">
              <span>COMPARISON</span>
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#201815]">
              Why Generic Spellcheckers Aren’t Enough
            </h2>
            <p className="text-sm text-[#7C6A5E]">
              Spellcheckers check whether words are in the English dictionary. FIDELIS checks whether they are true and compliant with your brand.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            <div className="p-7 rounded-3xl bg-white border border-[#F4E2D3] space-y-5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF0F0] text-[#B42318] flex items-center justify-center font-bold">
                  ✕
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#201815]">Standard Grammar Checkers</h3>
                  <p className="text-xs text-[#7C6A5E]">Grammarly, Word, Basic Spellcheck</p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  "Only check grammar, typos, and commas",
                  "Don't know your company's approved product names",
                  "Can't tell if statistics (e.g. 100% uptime) are false or expired",
                  "Cannot inspect logos, clearspace padding, or banners",
                  "Randomly rewrite paragraphs and alter your creative voice",
                  "Send your private drafts to external public cloud APIs",
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-[#7C6A5E]">
                    <X className="w-4 h-4 text-[#B42318] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            
            <div className="p-7 rounded-3xl bg-gradient-to-br from-[#FFF5EC] to-white border border-[#FDBA74] space-y-5 shadow-md shadow-[#FF8A3D]/10 relative overflow-hidden">
              <BorderBeam duration={9} size={200} colorFrom="#FF8A3D" colorTo="#FFAE74" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF8A3D] to-[#FF721B] text-white flex items-center justify-center font-bold shadow-sm shadow-[#FF8A3D]/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#201815]">FIDELIS Brand Guard</h3>
                  <p className="text-xs text-[#D95D0D] font-bold">Built for Company Brand Guidelines</p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  "Enforces your company's actual brand book and terminology",
                  "Verifies statistics, dates, and numbers against verified facts",
                  "Checks logo aspect ratios, spacing padding, and image contrast",
                  "Surgically fixes only the wrong words—preserving your creative voice",
                  "Requires a clear cited rule for every suggestion (zero random guessing)",
                  "Runs securely and privately with zero cloud data leaks",
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-[#201815] font-semibold">
                    <Check className="w-4 h-4 text-[#027A48] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      
      <section id="faq" className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#FFF2E7] text-[#D95D0D] text-xs font-extrabold border border-[#FDBA74]">
              <span>HELP & ANSWERS</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#201815]">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-[#7C6A5E]">
              Quick answers about how FIDELIS works and how your team can use it.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaqs.includes(idx);
              return (
                <div
                  key={idx}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isOpen
                      ? "border-[#FDBA74] bg-white shadow-md shadow-[#FF8A3D]/5"
                      : "border-[#F4E2D3] bg-white/80 hover:border-[#FFAE74]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <span className="font-bold text-[#201815] text-sm">
                      {faq.q}
                    </span>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      isOpen ? "bg-[#FFF2E7] text-[#D95D0D]" : "bg-[#FFF5EC] text-[#7C6A5E]"
                    }`}>
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="p-5 pt-1 border-t border-[#FDF0E5] text-xs text-[#7C6A5E] leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      
      <section className="py-20 px-4 sm:px-6 bg-white/80 border-t border-[#F4E2D3]">
        <div className="relative max-w-4xl mx-auto p-10 sm:p-14 rounded-3xl bg-gradient-to-br from-[#FFF5EC] via-[#FFFBF7] to-[#FFEAD9] border border-[#FDBA74] text-center space-y-6 shadow-xl shadow-[#FF8A3D]/10 overflow-hidden">
          <BorderBeam duration={8} size={250} colorFrom="#FF8A3D" colorTo="#FFAE74" borderWidth={2} />

          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF8A3D] to-[#FF721B] text-white flex items-center justify-center mx-auto shadow-md shadow-[#FF8A3D]/30">
            <ShieldCheck className="w-7 h-7" />
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl sm:text-4xl font-black text-[#201815] tracking-tight">
              Start Publishing with Complete Confidence
            </h2>
            <p className="text-xs sm:text-sm text-[#7C6A5E] max-w-lg mx-auto leading-relaxed">
              Join marketing teams, copywriters, and brand managers who use FIDELIS to eliminate brand mistakes and speed up content sign-offs.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3.5">
            <MagnetButton strength={0.25}>
              <Link
                href="/dashboard"
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF8A3D] to-[#FF721B] hover:from-[#FF9952] hover:to-[#E8630D] text-white text-sm font-extrabold transition-all shadow-md shadow-[#FF8A3D]/30 flex items-center gap-2"
              >
                <span>Open Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </MagnetButton>

            <Link
              href="/review"
              className="px-5 py-3.5 rounded-2xl bg-white hover:bg-[#FFF5EC] text-[#201815] text-sm font-bold border border-[#F4E2D3] transition-all shadow-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-[#FF8A3D]" />
              <span>Try Live Review Studio</span>
            </Link>
          </div>
        </div>
      </section>

      
      <footer className="mt-auto py-8 bg-[#201815] text-[#A49184] text-xs px-4 sm:px-6 border-t border-[#382A20]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <FidelisLogo size={28} />
            <span className="font-bold text-white">FIDELIS — Brand Governance Platform</span>
          </div>

          <div className="flex items-center gap-4 text-[#A49184]">
            <Link href="/dashboard" className="hover:text-white transition-colors">Workspace</Link>
            <span>•</span>
            <a href="#ai-comparison" className="hover:text-white transition-colors">AI Comparison</a>
            <span>•</span>
            <Link href="/review" className="hover:text-white transition-colors">Review Studio</Link>
            <span>•</span>
            <Link href="/guide" className="hover:text-white transition-colors">User Guide</Link>
            <span>•</span>
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
