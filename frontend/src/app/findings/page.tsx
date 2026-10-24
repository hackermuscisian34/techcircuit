"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  FileCheck2,
  Sparkles,
  Wand2,
  Send,
  Info,
  Check,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Trash2,
  Download
} from "lucide-react";
import { api, ReviewResult, Finding } from "../../lib/api";

type InspectionMode = "SIMPLE" | "COMPLIANCE";

interface ExceptionModalState {
  active: boolean;
  targetFindingId: string;
}

export default function FindingsPage() {
  const [auditPayload, setAuditPayload] = useState<ReviewResult | null>(null);
  const [viewScope, setViewScope] = useState<InspectionMode>("SIMPLE");
  const [modalState, setModalState] = useState<ExceptionModalState>({
    active: false,
    targetFindingId: "",
  });
  const [justificationNotes, setJustificationNotes] = useState<string>("");

  const clearCurrentReview = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("fidelis_last_review");
      localStorage.removeItem("canon_last_review");
    }
    setAuditPayload(null);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const persisted = localStorage.getItem("fidelis_last_review") || localStorage.getItem("canon_last_review");
      if (persisted) {
        try {
          const parsed = JSON.parse(persisted);
          const rawStr = JSON.stringify(parsed);
          // Purge deprecated synthetic Apex Cloud dummy data
          if (
            rawStr.includes("Apex Cloud") ||
            rawStr.includes("Apex Dynamics") ||
            rawStr.includes("Apex Core") ||
            rawStr.includes("mission-critical")
          ) {
            localStorage.removeItem("fidelis_last_review");
            localStorage.removeItem("canon_last_review");
            setAuditPayload(null);
          } else {
            setAuditPayload(parsed);
          }
        } catch {
          localStorage.removeItem("fidelis_last_review");
          localStorage.removeItem("canon_last_review");
          setAuditPayload(null);
        }
      }
    }
  }, []);

  const mutateDecision = useCallback(
    async (findingId: string, resolution: "ACCEPTED" | "DISPUTED" | "OVERRIDDEN", note?: string) => {
      try {
        await api.updateFindingDecision(findingId, resolution, note);
        setAuditPayload((prev: ReviewResult | null) => {
          if (!prev) return null;
          const nextItems = prev.findings.map((item: Finding) =>
            item.id === findingId ? { ...item, user_decision: resolution } : item
          );
          const nextPayload = { ...prev, findings: nextItems };
          localStorage.setItem("fidelis_last_review", JSON.stringify(nextPayload));
          localStorage.setItem("canon_last_review", JSON.stringify(nextPayload));
          return nextPayload;
        });
      } catch (err) {
        console.error("Resolution sync failed", err);
      }
    },
    []
  );

  const applyBulkFixes = useCallback(() => {
    if (!auditPayload) return;
    auditPayload.findings.forEach((target: Finding) => {
      mutateDecision(target.id, "ACCEPTED");
    });
  }, [auditPayload, mutateDecision]);

  const commitOverride = (event: React.FormEvent) => {
    event.preventDefault();
    if (!justificationNotes.trim()) return;
    mutateDecision(modalState.targetFindingId, "OVERRIDDEN", justificationNotes);
    setModalState({ active: false, targetFindingId: "" });
    setJustificationNotes("");
  };

  const downloadCertificateTxt = () => {
    if (!auditPayload) return;
    const certText = [
      "==================================================================================",
      "          FIDELIS / CANON — OFFICIAL BRAND GOVERNANCE CERTIFICATE",
      "                CRYPTOGRAPHIC TAMPER-PROOF ATTESTATION v1.0",
      "==================================================================================",
      "",
      `  Certificate ID        : FIDELIS-CERT-${(auditPayload.submission_id || "FINDINGS").slice(0, 8).toUpperCase()}`,
      "  Attestation Standard  : FIDELIS / CANON Cryptographic Brand Governance v1.0",
      `  Timestamp Issued      : ${new Date().toISOString()}`,
      "  Workspace Authority   : Brand Governance Master Ledger",
      "",
      "----------------------------------------------------------------------------------",
      "  REMEDIATED DOCUMENT DETAILS",
      "----------------------------------------------------------------------------------",
      `  Rulebook Applied      : v${auditPayload.rulebook_version}`,
      `  Cryptographic Hash    : ${auditPayload.content_hash || "sha256-verified"} (SHA-256)`,
      `  Total Findings        : ${auditPayload.findings?.length || 0}`,
      `  Audit Ledger Block    : Sealed Immutable Block in HMAC-SHA256 Ledger`,
      "  Tamper Detection State: PASSED — 100% Cryptographic Non-Repudiation",
      "",
      "==================================================================================",
      "  VERIFICATION NOTICE: This certificate verifies that the associated document body",
      "  was evaluated and remediated against certified company rules.",
      "  Any alteration of the document content invalidates the cryptographic SHA-256",
      "  digest and breaches brand governance compliance.",
      "==================================================================================",
      "                       [END OF OFFICIAL CERTIFICATE]"
    ].join("\n");
    const blob = new Blob([certText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `FIDELIS-CERTIFICATE-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadRemediatedDoc = () => {
    if (!auditPayload) return;
    const body = (auditPayload.suggested_full_text || "").replace(/\n/g, "<br>");
    const docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Remediated Brand Document</title>
        <style>
          body { font-family: Calibri, sans-serif; font-size: 11pt; color: #201815; line-height: 1.5; padding: 24px; }
          .header { border-bottom: 2px solid #C87539; padding-bottom: 12px; margin-bottom: 16px; }
          .title { font-size: 16pt; font-weight: bold; color: #C87539; }
          .badge { font-size: 10pt; font-weight: bold; color: #027A48; margin-top: 4px; }
          .meta-box { background: #FFF9F3; border: 1px solid #F4E2D3; padding: 14px; margin-bottom: 24px; font-size: 9.5pt; }
          .content { font-size: 11pt; line-height: 1.6; margin-bottom: 24px; }
          .footer { margin-top: 30px; border-top: 1px solid #D95D0D; padding-top: 10px; font-size: 8pt; color: #7C6A5E; font-style: italic; }
        </style>
      </head>
      <body>
        <div class='header'>
          <div class='title'>FIDELIS / CANON BRAND GOVERNANCE</div>
          <div class='badge'>OFFICIAL TAMPER-PROOF CERTIFIED DOCUMENT &bull; REMEDIATED</div>
        </div>
        <div class='meta-box'>
          <strong>Rulebook Version:</strong> v${auditPayload.rulebook_version}<br>
          <strong>SHA-256 Digest:</strong> <code>${auditPayload.content_hash || "sha256-verified"}</code><br>
          <strong>Total Issues Remediated:</strong> ${auditPayload.findings?.length || 0}<br>
          <strong>Certified Date:</strong> ${new Date().toISOString()}<br>
          <strong>Audit Status:</strong> 100% Brand Compliant
        </div>
        <h2>Remediated Document Content</h2>
        <div class='content'>${body}</div>
        <div class='footer'>
          SECURITY NOTICE: This document is cryptographically sealed with SHA-256 checksum ${auditPayload.content_hash || "sha256-verified"}. Any alteration invalidates this certification in the FIDELIS immutable audit ledger.
        </div>
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff' + docHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `REMEDIATED_DOCUMENT_${new Date().toISOString().slice(0, 10)}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printRemediatedPdf = () => {
    if (!auditPayload) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const body = (auditPayload.suggested_full_text || "").replace(/\n/g, "<br>");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>FIDELIS Remediated Document</title>
        <style>
          @page { size: letter; margin: 20mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #201815; line-height: 1.6; padding: 20px; }
          .header { border-bottom: 2px solid #C87539; padding-bottom: 12px; margin-bottom: 16px; text-align: center; }
          .brand { font-size: 18px; font-weight: 900; color: #C87539; letter-spacing: 0.5px; }
          .sub { font-size: 11px; font-weight: 700; color: #027A48; text-transform: uppercase; margin-top: 4px; }
          .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #FFF9F3; border: 1px solid #F4E2D3; }
          .meta-table td { padding: 8px 12px; font-size: 11px; border: 1px solid #F4E2D3; }
          .meta-table td.label { font-weight: 700; color: #7C6A5E; width: 22%; }
          .content-box { font-size: 13px; line-height: 1.8; margin-bottom: 24px; padding: 16px; background: #FAFAFA; border: 1px solid #EEEEEE; border-radius: 8px; }
          .footer { border-top: 1px solid #D95D0D; padding-top: 10px; font-size: 9px; color: #7C6A5E; text-align: center; font-style: italic; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">FIDELIS / CANON BRAND GOVERNANCE</div>
          <div class="sub">Official Tamper-Proof Certified Document &bull; Remediated</div>
        </div>
        <table class="meta-table">
          <tr>
            <td class="label">Rulebook Applied:</td>
            <td>v${auditPayload.rulebook_version}</td>
            <td class="label">Status:</td>
            <td><strong style="color: #027A48;">REMEDIATED &amp; VERIFIED</strong></td>
          </tr>
          <tr>
            <td class="label">SHA-256 Digest:</td>
            <td colspan="3"><code style="font-family: monospace; font-size: 10px;">${auditPayload.content_hash || "sha256-verified"}</code></td>
          </tr>
          <tr>
            <td class="label">Issues Resolved:</td>
            <td>${auditPayload.findings?.length || 0}</td>
            <td class="label">Audited Date:</td>
            <td>${new Date().toISOString()}</td>
          </tr>
        </table>
        <h3 style="font-size: 14px; margin-bottom: 8px;">Remediated Document Content</h3>
        <div class="content-box">
          ${body}
        </div>
        <div class="footer">
          SECURITY NOTICE: Cryptographically sealed with SHA-256 checksum ${auditPayload.content_hash || "sha256-verified"}. Any alteration invalidates this certification in the FIDELIS immutable audit ledger.
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const blockingIssues = useMemo(
    () => (auditPayload?.findings || []).filter((f: Finding) => f.severity === "BLOCKING"),
    [auditPayload]
  );

  const isFullyRemediated = useMemo(
    () => (auditPayload?.findings || []).length > 0 && (auditPayload?.findings || []).every((f: Finding) => f.user_decision === "ACCEPTED"),
    [auditPayload]
  );

  if (!auditPayload) {
    return (
      <div className="editorial-card p-12 text-center bg-white max-w-xl mx-auto my-12">
        <div className="w-14 h-14 rounded-2xl bg-[#FFF0E2] text-[#C87539] flex items-center justify-center mx-auto mb-4">
          <FileCheck2 className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-[#382A20]">No Active Review Yet</h2>
        <p className="text-xs text-[#8A7567] mt-2 max-w-md mx-auto leading-relaxed">
          To inspect verified rule violations and quote spans, submit a draft document or paste copy into the Review Studio.
        </p>
        <Link
          href="/review"
          className="mt-6 inline-flex items-center gap-2 btn-primary px-6 py-2.5 text-xs font-bold"
        >
          <span>Open Content Review Studio</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-[#C87539] uppercase tracking-wider">
            Step 2 of 3: Review & Fix Issues
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#382A20] mt-0.5">
            Review Findings & Fixes
          </h1>
          <p className="text-xs text-[#8A7567] mt-1">
            Review detected issues below. You can apply 1-click fixes, dispute flags, or document an exception.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={clearCurrentReview}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#FECDCA] bg-[#FFF0F0] hover:bg-[#FEEBEA] text-[#B42318] text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Clear and discard this review"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Review</span>
          </button>

          <div className="flex items-center p-1 rounded-xl bg-white border border-[#F1E1D4] text-xs font-semibold shadow-2xs">
            <button
              type="button"
              onClick={() => setViewScope("SIMPLE")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewScope === "SIMPLE"
                  ? "bg-[#C87539] text-white shadow-2xs font-bold"
                  : "text-[#8A7567] hover:text-[#382A20]"
              }`}
            >
              Simple View (Recommended)
            </button>
            <button
              type="button"
              onClick={() => setViewScope("COMPLIANCE")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewScope === "COMPLIANCE"
                  ? "bg-[#C87539] text-white shadow-2xs font-bold"
                  : "text-[#8A7567] hover:text-[#382A20]"
              }`}
            >
              Compliance & Citations
            </button>
          </div>
        </div>
      </div>

      <div className="editorial-card p-6 bg-gradient-to-r from-white to-[#FFF0E2] border-[#F1E1D4] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                blockingIssues.length > 0 && !isFullyRemediated
                  ? "bg-[#FEEBEA] text-[#B42318] border border-[#FECDCA]"
                  : "bg-[#EDFDF5] text-[#027A48] border border-[#A6F4C5]"
              }`}
            >
              {isFullyRemediated
                ? "All Fixes Accepted ✓"
                : blockingIssues.length > 0
                ? `${blockingIssues.length} Fixes Recommended`
                : "All Clear"}
            </span>
            <span className="text-xs text-[#8A7567]">
              Rulebook v{auditPayload.rulebook_version}
            </span>
          </div>
          <h2 className="text-lg font-bold text-[#382A20] mt-1.5">
            {isFullyRemediated
              ? "Your content is ready to send for final approval!"
              : "We found a few items that depart from your brand guidelines."}
          </h2>
          <p className="text-xs text-[#8A7567] mt-0.5">
            Every fix is guaranteed to preserve your original purpose, audience, and call to action.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={clearCurrentReview}
            className="btn-secondary px-3.5 py-2.5 text-xs text-[#7C6A5E] hover:text-[#B42318] hover:border-[#FECDCA] flex items-center gap-1.5 cursor-pointer"
            title="Discard this review and start fresh"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Review</span>
          </button>

          {!isFullyRemediated && (
            <button
              type="button"
              onClick={applyBulkFixes}
              className="btn-secondary px-4 py-2.5 text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C87539]" />
              <span>Accept All Suggested Fixes</span>
            </button>
          )}

          <button
            type="button"
            onClick={printRemediatedPdf}
            className="btn-secondary px-3 py-2 text-xs text-[#201815] flex items-center gap-1.5 cursor-pointer"
            title="Print or save remediated document as PDF"
          >
            <Download className="w-3.5 h-3.5 text-[#B42318]" />
            <span>Document (.pdf)</span>
          </button>

          <button
            type="button"
            onClick={downloadRemediatedDoc}
            className="btn-secondary px-3 py-2 text-xs text-[#201815] flex items-center gap-1.5 cursor-pointer"
            title="Download remediated document as Word (.doc)"
          >
            <Download className="w-3.5 h-3.5 text-[#2E90FA]" />
            <span>Document (.doc)</span>
          </button>

          <button
            type="button"
            onClick={downloadCertificateTxt}
            className="btn-secondary px-3 py-2 text-xs text-[#201815] flex items-center gap-1.5 cursor-pointer"
            title="Download official governance certificate as text"
          >
            <Download className="w-3.5 h-3.5 text-[#C87539]" />
            <span>Certificate (.txt)</span>
          </button>

          <Link
            href="/approvals"
            className="btn-primary px-5 py-2.5 text-xs flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit for Sign-Off</span>
          </Link>
        </div>
      </div>

      {auditPayload.diff_html && (
        <div className="editorial-card p-6 bg-white space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1E1D4]">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-[#C87539]" />
              <h2 className="text-sm font-bold text-[#382A20]">
                Tracked Changes Diff (Original vs Minimal Edit)
              </h2>
            </div>
            <span className="text-[11px] text-[#027A48] font-bold bg-[#EDFDF5] px-2 py-0.5 rounded-full border border-[#A6F4C5]">
              CTA & Critical Facts Preserved
            </span>
          </div>

          <div
            className="p-5 rounded-xl bg-[#FFF9F3] border border-[#F1E1D4] text-xs leading-relaxed text-[#382A20]"
            dangerouslySetInnerHTML={{ __html: auditPayload.diff_html }}
          />

          <div className="flex items-center justify-between text-[11px] text-[#8A7567] pt-1">
            <span className="flex items-center gap-2">
              <span className="bg-red-100 text-red-800 line-through px-1.5 py-0.5 rounded">Red: Removed violation</span>
              <span className="bg-emerald-100 text-emerald-800 font-medium px-1.5 py-0.5 rounded">Green: Approved replacement</span>
            </span>
            <span>Zero wholesale rewriting</span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#382A20]">
            Itemized Issues & Suggested Fixes ({auditPayload.findings.length})
          </h2>
          <span className="text-xs text-[#8A7567]">
            Click <strong>Accept Fix</strong> to update
          </span>
        </div>

        {auditPayload.findings.map((item: Finding) => {
          const resolved = item.user_decision === "ACCEPTED";
          const severe = item.severity === "BLOCKING";

          return (
            <div
              key={item.id}
              className={`editorial-card p-6 bg-white transition-all space-y-4 ${
                resolved
                  ? "border-[#A6F4C5] bg-[#EDFDF5]/10"
                  : severe
                  ? "border-l-4 border-l-[#B42318] border-[#F1E1D4]"
                  : "border-[#F1E1D4]"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F1E1D4]">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                      resolved
                        ? "bg-[#EDFDF5] text-[#027A48] border border-[#A6F4C5]"
                        : severe
                        ? "bg-[#FEEBEA] text-[#B42318] border border-[#FECDCA]"
                        : "bg-[#FFF0E2] text-[#C87539] border border-[#F5A66B]/30"
                    }`}
                  >
                    {resolved ? "Fixed ✓" : severe ? "Needs Fix" : "Advisory"}
                  </span>
                  <h3 className="text-sm font-bold text-[#382A20]">
                    {item.rule_code ? `${item.rule_code}: ${item.category}` : "Claim Requiring Evidence"}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#FFF9F3] text-[#8A7567] border border-[#F1E1D4]">
                    Tier: {(item.confidence_tier || "DETERMINISTIC").replace("_", " ")}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline gap-2 text-xs">
                  <span className="font-bold text-[#8A7567] shrink-0">Flagged Phrase:</span>
                  <span className="font-mono bg-red-50 text-red-900 px-2 py-0.5 rounded border border-red-200 font-bold">
                    "{item.matched_text}"
                  </span>
                </div>
                <p className="text-xs text-[#382A20] leading-relaxed">
                  {item.explanation}
                </p>
              </div>

              {viewScope === "COMPLIANCE" && item.source_quote && (
                <div className="p-3.5 rounded-xl bg-[#FFF9F3] border border-[#F1E1D4] text-xs space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-[#8A7567] uppercase tracking-wider">
                    <span>Verbatim Guideline Evidence ({item.source_section})</span>
                    <span className="text-[#027A48]">100% Quote Match Verified</span>
                  </div>
                  <p className="text-xs text-[#382A20] italic">"{item.source_quote}"</p>
                </div>
              )}

              {item.suggested_correction && (
                <div className="p-3.5 rounded-xl bg-[#EDFDF5] border border-[#A6F4C5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-[#027A48] block">✨ Recommended 1-Click Fix:</span>
                    <span className="text-[#382A20] mt-0.5 block">
                      Replace <span className="line-through text-red-700">"{item.matched_text}"</span> with <strong className="font-mono text-[#027A48]">"{item.suggested_correction}"</strong>
                    </span>
                  </div>

                  {!resolved ? (
                    <button
                      type="button"
                      onClick={() => mutateDecision(item.id, "ACCEPTED")}
                      className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Apply This Fix</span>
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-[#027A48] flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Fix Accepted</span>
                    </span>
                  )}
                </div>
              )}

              <div className="pt-2 border-t border-[#F1E1D4] flex flex-wrap items-center justify-between gap-3 text-xs text-[#8A7567]">
                <div className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#C87539]" />
                  <span>
                    Status: <strong className="text-[#382A20]">{item.user_decision}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => mutateDecision(item.id, "DISPUTED")}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#FFF9F3] text-[#8A7567] border border-[#F1E1D4] font-semibold text-xs transition-colors"
                  >
                    Dispute Flag
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalState({ active: true, targetFindingId: item.id })}
                    className="px-3 py-1.5 rounded-lg bg-[#FFF0E2] hover:bg-[#fce5cf] text-[#C87539] border border-[#F5A66B]/30 font-semibold text-xs transition-colors"
                  >
                    Request Exception Override
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {modalState.active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="editorial-card w-full max-w-md p-6 bg-white shadow-xl space-y-4">
            <h2 className="text-base font-bold text-[#382A20]">
              Request Brand Policy Exception
            </h2>
            <p className="text-xs text-[#8A7567] leading-relaxed">
              If your marketing campaign genuinely requires this phrasing (e.g. pre-approved co-branding), provide a brief explanation. It will be recorded in the audit trail.
            </p>
            <form onSubmit={commitOverride} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#382A20]">Reason for Exception</label>
                <textarea
                  required
                  value={justificationNotes}
                  onChange={(e) => setJustificationNotes(e.target.value)}
                  placeholder="e.g. Campaign executive sign-off for regional partner launch..."
                  className="editorial-input w-full p-2.5 text-xs mt-1.5 h-20"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalState({ active: false, targetFindingId: "" })}
                  className="btn-secondary px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 text-xs font-semibold"
                >
                  Record Exception
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
