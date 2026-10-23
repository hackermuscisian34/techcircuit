"use client";

import React, { useMemo, useState } from "react";
import {
  Cpu,
  ShieldCheck,
  EyeOff,
  CheckCircle2,
  Lightbulb,
  Check
} from "lucide-react";

interface MaskingRule {
  pattern: RegExp;
  mask: string;
}

const REDACTION_PIPELINE: readonly MaskingRule[] = [
  {
    pattern: /\b(Project\s+[A-Z][a-zA-Z0-9]+)\b/g,
    mask: "[CONFIDENTIAL_PROJECT_REDACTED]",
  },
  {
    pattern: /\$(\d+(?:,\d{3})*)\s*(per|\/)\s*(mo|year)/gi,
    mask: "[SENSITIVE_PRICING_REDACTED]",
  },
  {
    pattern: /\b(sk-[a-zA-Z0-9]{20,})\b/g,
    mask: "[API_KEY_MASKED]",
  },
];

const RUNTIME_METRICS = [
  {
    caption: "Inference Runtime",
    title: "Hugging Face Cloud API / Local Ollama",
    body: "Pre-trained open-source inference hosted via Hugging Face Serverless/Dedicated Regional APIs on Render & Vercel, with local Ollama fallback.",
  },
  {
    caption: "Model Weight Architecture",
    title: "Qwen 2.5 (Open-Weight Apache 2.0)",
    body: "Pre-trained instruction-tuned model specialized in structured governance evaluations and zero-drift JSON schemas.",
  },
  {
    caption: "Sampling Temperature",
    title: "0.1 (Strict Constrained Governance)",
    body: "Eliminates creative drift to guarantee reproducible, consistent compliance findings.",
  },
  {
    caption: "Output Validation Format",
    title: "Strict Pydantic JSON Schema",
    body: "All evaluations are validated through strict schemas with zero hallucinated keys.",
  },
];

const CORE_INVARIANTS = [
  {
    num: "1",
    heading: "No Citation, No Blocking Flag",
    detail: "AI cannot block a marketing deadline without quoting the exact brand guideline clause.",
  },
  {
    num: "2",
    heading: "Human Authority Primacy",
    detail: "AI only recommends; human Brand Managers retain sole authority to approve or grant exceptions.",
  },
  {
    num: "3",
    heading: "Creator Intent Lock",
    detail: "Suggested edits are minimal surgical diffs that preserve the writer's Call to Action and message.",
  },
  {
    num: "4",
    heading: "Tamper-Proof Cryptographic Receipts",
    detail: "Every approved document is signed and anchored in an append-only sequential SHA-256 chain.",
  },
];

function sanitizeStream(raw: string): string {
  return REDACTION_PIPELINE.reduce(
    (acc, rule) => acc.replace(rule.pattern, rule.mask),
    raw
  );
}

export default function SettingsPage() {
  const [draftPayload, setDraftPayload] = useState<string>("");

  const quarantinedPayload = useMemo(
    () => sanitizeStream(draftPayload),
    [draftPayload]
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EDFDF5] text-[#027A48] border border-[#A6F4C5] uppercase tracking-wide">
              Privacy & Infrastructure
            </span>
            <span className="text-xs text-[#8A7567] font-medium">100% On-Premises Guarantee</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#382A20]">
            Settings, AI Architecture & Privacy Gateway
          </h1>
          <p className="text-sm text-[#8A7567] mt-1">
            Your draft marketing materials and company secrets never leave your local infrastructure.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#EDFDF5] text-[#027A48] border border-[#A6F4C5] flex items-center gap-2 shadow-2xs">
            <CheckCircle2 className="w-4 h-4" />
            <span>Zero Third-Party Cloud Leaks</span>
          </span>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-white border border-[#F1E1D4] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFF0E2] flex items-center justify-center text-[#C87539] shrink-0 mt-0.5">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#382A20]">
              The FIDELIS Privacy Guarantee for Non-Technical Teams
            </h2>
            <p className="text-xs text-[#8A7567] leading-relaxed mt-0.5">
              Unlike public consumer AI chatbots, FIDELIS runs completely inside your secure environment using open-weight local models. Unannounced product names, embargoed press releases, and pricing spreadsheets are never transmitted over the internet or used for AI training.
            </p>
          </div>
        </div>
      </div>

      <div className="editorial-card p-6 bg-white border border-[#F1E1D4] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F1E1D4]">
          <div className="flex items-center gap-2">
            <EyeOff className="w-5 h-5 text-[#C87539]" />
            <h2 className="text-base font-bold text-[#382A20]">
              Interactive Privacy & Redaction Gateway Simulator
            </h2>
          </div>
          <span className="text-xs text-[#027A48] font-bold flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            <span>Active Protection</span>
          </span>
        </div>

        <p className="text-xs text-[#8A7567]">
          Before any draft text reaches AI models, FIDELIS's Redaction Gateway automatically masks sensitive trade secrets. Try editing the input text below to see live redaction in action:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#382A20]">Draft Copy (Contains Sensitive Info)</label>
            <textarea
              value={draftPayload}
              onChange={(evt: React.ChangeEvent<HTMLTextAreaElement>) => setDraftPayload(evt.target.value)}
              className="editorial-input w-full h-32 p-3 text-xs leading-relaxed"
              placeholder="Type sensitive text containing codenames or pricing..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#027A48]">What the AI Sees (Quarantined & Masked)</label>
            <div className="p-3 rounded-xl bg-[#EDFDF5] border border-[#A6F4C5] h-32 text-xs leading-relaxed text-[#382A20] font-mono overflow-y-auto">
              {draftPayload.trim() ? (
                quarantinedPayload
              ) : (
                <span className="text-[#8A7567] italic font-sans">
                  Real-time masked text will appear here automatically when you enter draft copy...
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-[#8A7567]">
          <span className="font-bold text-[#382A20]">Protected Patterns:</span>
          <span className="px-2 py-0.5 rounded bg-[#FFF0E2] text-[#C87539] font-medium">Pre-release Codenames (Project X)</span>
          <span className="px-2 py-0.5 rounded bg-[#FFF0E2] text-[#C87539] font-medium">Unreleased Pricing ($X / mo)</span>
          <span className="px-2 py-0.5 rounded bg-[#FFF0E2] text-[#C87539] font-medium">API Keys & Tokens (sk-...)</span>
        </div>
      </div>

      <div className="editorial-card p-6 bg-white border border-[#F1E1D4] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F1E1D4]">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#C87539]" />
            <h2 className="text-base font-bold text-[#382A20]">
              Active AI Model & Local Inference Runtime
            </h2>
          </div>
          <span className="text-xs text-[#8A7567] font-semibold">Self-Hosted Daemon</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {RUNTIME_METRICS.map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-[#FFF9F3] border border-[#F1E1D4] space-y-1">
              <div className="text-[10px] uppercase font-bold text-[#8A7567]">{item.caption}</div>
              <div className="text-sm font-bold text-[#382A20]">{item.title}</div>
              <div className="text-[#8A7567] leading-relaxed">{item.body}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="editorial-card p-6 bg-white border border-[#F1E1D4] shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F1E1D4]">
          <ShieldCheck className="w-5 h-5 text-[#027A48]" />
          <h2 className="text-sm font-bold text-[#382A20] uppercase tracking-wider">
            FIDELIS's Four Non-Negotiable Core Invariants
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#382A20]">
          {CORE_INVARIANTS.map((invariant) => (
            <div key={invariant.num} className="p-4 rounded-xl bg-[#FFF9F3] border border-[#F1E1D4] flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-[#027A48] shrink-0 mt-0.5" />
              <div>
                <strong className="text-sm block text-[#382A20] mb-0.5">
                  {invariant.num}. {invariant.heading}
                </strong>
                <p className="text-[#8A7567] leading-relaxed">{invariant.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
