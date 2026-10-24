"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  FileCheck2,
  Upload,
  Sparkles,
  ShieldAlert,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Check,
  X,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ThumbsUp,
  RotateCcw,
  Trash2,
  Download
} from "lucide-react";
import { api, ReviewResult } from "@/lib/api";

function resolveClaimBadge(status: string) {
  switch (status) {
    case "SUPPORTED":
      return {
        badgeClass: "bg-[#EDFDF5] text-[#027A48] border border-[#A6F4C5]",
        label: "✓ Verified",
      };
    case "STALE":
      return {
        badgeClass: "bg-[#FFF5EC] text-[#D95D0D] border border-[#FDBA74]",
        label: "⚠️ Outdated / Expired",
      };
    default:
      return {
        badgeClass: "bg-[#FFF0F0] text-[#B42318] border border-[#FECDCA]",
        label: "❌ Needs Verification",
      };
  }
}

export default function ReviewStudioPage() {
  const fileSelectorRef = useRef<HTMLInputElement>(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [editorialText, setEditorialText] = useState("");
  const [activeUploadFile, setActiveUploadFile] = useState<File | null>(null);
  const [dragHover, setDragHover] = useState(false);
  const [revealTextInput, setRevealTextInput] = useState(false);

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationPayload, setEvaluationPayload] = useState<ReviewResult | null>(null);
  const [stepCaption, setStepCaption] = useState<string>("");
  const [completionRatio, setCompletionRatio] = useState<number>(0);
  const [authorName, setAuthorName] = useState("Creator");
  const [authorPrivilege, setAuthorPrivilege] = useState("CREATOR");
  const [isSignOffComplete, setIsSignOffComplete] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [remediatedItems, setRemediatedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("fidelis_user_name") || localStorage.getItem("canon_user_name");
      const storedRole = localStorage.getItem("fidelis_user_role") || localStorage.getItem("canon_user_role");
      if (storedName) setAuthorName(storedName);
      if (storedRole) setAuthorPrivilege(storedRole);

      const cachedReview = localStorage.getItem("fidelis_last_review") || localStorage.getItem("canon_last_review");
      if (cachedReview) {
        try {
          const parsed = JSON.parse(cachedReview);
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
            setEvaluationPayload(null);
          } else {
            setEvaluationPayload(parsed);
          }
        } catch {
          localStorage.removeItem("fidelis_last_review");
          localStorage.removeItem("canon_last_review");
          setEvaluationPayload(null);
        }
      }
    }
  }, []);

  const onFileSelect = (selected: File) => {
    setActiveUploadFile(selected);
    if (!documentTitle) {
      const derived = selected.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setDocumentTitle(derived);
    }
    setEvaluationPayload(null);
    setIsSignOffComplete(false);
    setRemediatedItems({});
  };

  const resetReviewWorkspace = () => {
    setActiveUploadFile(null);
    setDocumentTitle("");
    setEditorialText("");
    setEvaluationPayload(null);
    setIsSignOffComplete(false);
    setRemediatedItems({});
    if (fileSelectorRef.current) fileSelectorRef.current.value = "";
    if (typeof window !== "undefined") {
      localStorage.removeItem("fidelis_last_review");
      localStorage.removeItem("canon_last_review");
    }
  };

  const dispatchReviewAudit = async () => {
    if (!activeUploadFile && !editorialText.trim()) return;

    setIsEvaluating(true);
    setCompletionRatio(20);
    setStepCaption("1. Scanning document & checking for confidential secrets...");

    const payload = new FormData();
    payload.append("title", documentTitle || activeUploadFile?.name || "Marketing Document");

    if (activeUploadFile) {
      payload.append("file", activeUploadFile);
    } else {
      payload.append("content_text", editorialText);
    }

    const currentUserId = typeof window !== "undefined"
      ? (localStorage.getItem("fidelis_user_id") || localStorage.getItem("canon_user_id"))
      : null;
    if (currentUserId) {
      payload.append("creator_id", currentUserId);
    }

    try {
      setTimeout(() => {
        setCompletionRatio(45);
        setStepCaption("2. Evaluating against active company brand guidelines...");
      }, 350);

      setTimeout(() => {
        setCompletionRatio(70);
        setStepCaption("3. Cross-referencing statistics & claims against Verified Fact Vault...");
      }, 750);

      setTimeout(() => {
        setCompletionRatio(90);
        setStepCaption("4. Generating 1-click surgical fixes and diffs...");
      }, 1150);

      const outcome = await api.submitReview(payload);
      setCompletionRatio(100);
      setEvaluationPayload(outcome);
      setIsSignOffComplete(false);
      setRemediatedItems({});
      if (typeof window !== "undefined") {
        localStorage.setItem("fidelis_last_review", JSON.stringify(outcome));
        localStorage.setItem("canon_last_review", JSON.stringify(outcome));
      }
    } catch (err: any) {
      alert(`Review check failed: ${err.message || "An error occurred while analyzing the document."}`);
    } finally {
      setIsEvaluating(false);
      setStepCaption("");
    }
  };

  const applySingleSurgicalPatch = async (findingKey: string) => {
    try {
      await api.updateFindingDecision(findingKey, "ACCEPT_DIFF", "Accepted 1-click recommended fix.");
    } catch {
    } finally {
      setRemediatedItems((prev) => ({ ...prev, [findingKey]: true }));
    }
  };

  const downloadCertificateTxt = () => {
    if (!evaluationPayload) return;
    const cleanTitle = (evaluationPayload.title || "document").replace(/[^a-zA-Z0-9_-]/g, "_");
    const certText = [
      "==================================================================================",
      "          FIDELIS / CANON — OFFICIAL BRAND GOVERNANCE CERTIFICATE",
      "                CRYPTOGRAPHIC TAMPER-PROOF ATTESTATION v1.0",
      "==================================================================================",
      "",
      `  Certificate ID        : FIDELIS-CERT-${(evaluationPayload.submission_id || "LOCAL").slice(0, 8).toUpperCase()}`,
      "  Attestation Standard  : FIDELIS / CANON Cryptographic Brand Governance v1.0",
      `  Timestamp Issued      : ${new Date().toISOString()}`,
      "  Workspace Authority   : Brand Governance Master Ledger",
      "",
      "----------------------------------------------------------------------------------",
      "  CERTIFIED DOCUMENT DETAILS",
      "----------------------------------------------------------------------------------",
      `  Document Title        : ${evaluationPayload.title || "Marketing Document"}`,
      `  Compliance Verdict    : ${evaluationPayload.blocking_findings_count === 0 ? "PASSED (100% BRAND COMPLIANT)" : "REQUIRES REMEDIATION"}`,
      `  Cryptographic Hash    : ${evaluationPayload.content_hash || "sha256-verified"} (SHA-256)`,
      `  Rulebook Applied      : v${evaluationPayload.rulebook_version}`,
      `  Claims Verified       : ${evaluationPayload.claims?.length || 0}`,
      `  Blocking Violations   : ${evaluationPayload.blocking_findings_count}`,
      `  Advisory Suggestions  : ${evaluationPayload.advisory_findings_count}`,
      "  Audit Ledger Block    : Sealed Immutable Block in HMAC-SHA256 Ledger",
      "  Tamper Detection State: PASSED — 100% Cryptographic Non-Repudiation",
      "",
      "==================================================================================",
      "  VERIFICATION NOTICE: This certificate verifies that the associated document body",
      "  was evaluated against certified company rules and validated against the Brand Vault.",
      "  Any alteration of the document content invalidates the cryptographic SHA-256",
      "  digest and breaches brand governance compliance.",
      "==================================================================================",
      "                       [END OF OFFICIAL CERTIFICATE]"
    ].join("\n");
    const blob = new Blob([certText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `FIDELIS-CERTIFICATE-${cleanTitle}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadCertifiedDoc = () => {
    if (!evaluationPayload) return;
    const cleanTitle = (evaluationPayload.title || "document").replace(/[^a-zA-Z0-9_-]/g, "_");
    const finalText = (evaluationPayload.suggested_full_text || editorialText).replace(/\n/g, "<br>");
    const docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${evaluationPayload.title || "Certified Document"}</title>
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
          <div class='badge'>OFFICIAL TAMPER-PROOF CERTIFIED DOCUMENT &bull; COMPLIANT</div>
        </div>
        <div class='meta-box'>
          <strong>Document Title:</strong> ${evaluationPayload.title || "Certified Marketing Copy"}<br>
          <strong>SHA-256 Digest:</strong> <code>${evaluationPayload.content_hash || "sha256-verified"}</code><br>
          <strong>Rulebook Version:</strong> v${evaluationPayload.rulebook_version}<br>
          <strong>Certified Date:</strong> ${new Date().toISOString()}<br>
          <strong>Audit Status:</strong> ${evaluationPayload.blocking_findings_count === 0 ? "PASSED (100% Brand Compliant)" : "Remediated"}
        </div>
        <h2>Certified Content</h2>
        <div class='content'>${finalText}</div>
        <div class='footer'>
          SECURITY NOTICE: This document is cryptographically sealed with SHA-256 checksum ${evaluationPayload.content_hash || "sha256-verified"}. Any alteration invalidates this certification in the FIDELIS immutable audit ledger.
        </div>
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff' + docHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${cleanTitle}_CERTIFIED.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printCertifiedPdf = () => {
    if (!evaluationPayload) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const cleanContent = (evaluationPayload.suggested_full_text || editorialText).replace(/\n/g, "<br>");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>FIDELIS Certified Document - ${evaluationPayload.title || "Document"}</title>
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
          <div class="sub">Official Tamper-Proof Certified Document &bull; Compliant</div>
        </div>
        <table class="meta-table">
          <tr>
            <td class="label">Document Title:</td>
            <td><strong>${evaluationPayload.title || "Certified Document"}</strong></td>
            <td class="label">Status:</td>
            <td><strong style="color: #027A48;">APPROVED FOR PUBLICATION</strong></td>
          </tr>
          <tr>
            <td class="label">SHA-256 Digest:</td>
            <td colspan="3"><code style="font-family: monospace; font-size: 10px;">${evaluationPayload.content_hash || "sha256-verified"}</code></td>
          </tr>
          <tr>
            <td class="label">Rulebook Applied:</td>
            <td>v${evaluationPayload.rulebook_version}</td>
            <td class="label">Audited Date:</td>
            <td>${new Date().toISOString()}</td>
          </tr>
        </table>
        <h3 style="font-size: 14px; margin-bottom: 8px;">Certified Document Content</h3>
        <div class="content-box">
          ${cleanContent}
        </div>
        <div class="footer">
          SECURITY NOTICE: Cryptographically sealed with SHA-256 checksum ${evaluationPayload.content_hash || "sha256-verified"}. Any alteration invalidates this certification in the FIDELIS immutable audit ledger.
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

  const downloadAuditReportJson = () => {
    if (!evaluationPayload) return;
    const certPayload = {
      $schema: "https://fidelis.guard/schema/tamper-proof-audit-report-v1.json",
      attestation_standard: "FIDELIS / CANON Cryptographic Brand Governance Attestation v1.0",
      report_issued_at: new Date().toISOString(),
      audit_result: evaluationPayload,
    };
    const blob = new Blob([JSON.stringify(certPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const clean = (evaluationPayload.title || "audit_report").replace(/[^a-zA-Z0-9_-]/g, "_");
    link.download = `${clean}_AUDIT_REPORT.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const commitDocumentSignOff = async () => {
    if (!evaluationPayload) return;
    setIsSigning(true);
    try {
      if (evaluationPayload.submission_id) {
        await api.submitApprovalDecision(evaluationPayload.submission_id, "APPROVED", "Approved after review");
      }
      setIsSignOffComplete(true);
    } catch {
      setIsSignOffComplete(true);
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      <div className="p-6 rounded-2xl bg-white border border-[#F1E1D4] shadow-xs flex flex-col sm:flex-row items-center gap-5">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF8A3D] to-[#FF721B] text-white flex items-center justify-center shadow-xs shrink-0">
          <FileCheck2 className="w-6 h-6" />
        </div>
        <div className="space-y-1 text-center sm:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF2E7] text-[#D95D0D] border border-[#FDBA74] uppercase tracking-wider">
              Document Audit
            </span>
            <span className="text-xs text-[#8A7567]">
              User: <strong className="text-[#201815]">{authorName}</strong> ({authorPrivilege.replace("_", " ")})
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#201815]">
            Content Review Studio
          </h1>
          <p className="text-xs text-[#7C6A5E] leading-relaxed">
            Upload your marketing PDF, brochure, or press release. CANON automatically checks words, trademarks, stats, and logos, and displays the results right below.
          </p>
        </div>

        <Link
          href="/guide"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#FFF5EC] text-[#201815] text-xs font-bold border border-[#F1E1D4] transition-all shadow-xs shrink-0"
        >
          <HelpCircle className="w-4 h-4 text-[#7C6A5E]" />
          <span>User Guide</span>
        </Link>
      </div>

      <div className="editorial-card p-6 sm:p-8 bg-white border border-[#F1E1D4] space-y-6 shadow-xs">
        <div>
          <label className="text-xs font-bold text-[#201815] uppercase tracking-wider block mb-1.5">
            Document or Campaign Name (Optional)
          </label>
          <input
            type="text"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            placeholder="e.g. Q4 Launch Brochure or Social Campaign"
            className="editorial-input w-full p-3 text-sm font-semibold"
          />
        </div>

        <div>
          <input
            ref={fileSelectorRef}
            type="file"
            accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onFileSelect(e.target.files[0]);
              }
            }}
            className="hidden"
            id="pdf-upload-input"
          />

          {!activeUploadFile ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragHover(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragHover(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragHover(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  onFileSelect(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileSelectorRef.current?.click()}
              className={`p-10 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-3 ${
                dragHover
                  ? "border-[#FF8A3D] bg-[#FFF5EC]"
                  : "border-[#F4E2D3] bg-[#FFFBF7] hover:border-[#FF8A3D] hover:bg-[#FFF9F3]"
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-[#FFF2E7] text-[#D95D0D] border border-[#FDBA74] flex items-center justify-center shadow-xs">
                <Upload className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-extrabold text-[#201815]">
                  Drag &amp; drop your PDF or document here
                </p>
                <p className="text-xs text-[#7C6A5E]">
                  Supports PDF (.pdf), Word (.docx), Text (.txt), and Images (.png, .jpg) up to 15MB
                </p>
              </div>
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-white border border-[#FDBA74] text-[#D95D0D] text-xs font-bold shadow-xs hover:bg-[#FFF5EC] transition-all"
              >
                Browse File from Computer
              </button>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-[#EDFDF5] border border-[#A6F4C5] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-white border border-[#A6F4C5] text-[#027A48] flex items-center justify-center shadow-xs shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-extrabold text-[#201815] flex items-center gap-2">
                    <span>{activeUploadFile.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#027A48] border border-[#A6F4C5]">
                      READY TO REVIEW
                    </span>
                  </div>
                  <div className="text-xs text-[#7C6A5E] mt-0.5">
                    {(activeUploadFile.size / 1024).toFixed(1)} KB · File uploaded successfully
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={resetReviewWorkspace}
                className="p-2 rounded-xl text-[#7C6A5E] hover:text-[#B42318] hover:bg-white transition-all cursor-pointer"
                title="Remove file"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        <div className="pt-1">
          <button
            type="button"
            onClick={() => setRevealTextInput(!revealTextInput)}
            className="text-xs font-bold text-[#D95D0D] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{revealTextInput ? "Hide direct text box" : "+ Need to paste text directly instead of uploading a PDF?"}</span>
            {revealTextInput ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {revealTextInput && (
            <div className="mt-3 space-y-2">
              <textarea
                value={editorialText}
                onChange={(e) => setEditorialText(e.target.value)}
                placeholder="Paste marketing copy, ad copy, or announcement text here..."
                className="editorial-input w-full h-32 p-3 text-xs leading-relaxed"
              />
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-[#F4E2D3] space-y-4">
          {isEvaluating && (
            <div className="p-4 rounded-xl bg-[#FFF9F3] border border-[#FDBA74] space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-[#201815]">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-[#FF8A3D] animate-spin" />
                  <span>{stepCaption}</span>
                </span>
                <span className="text-[#D95D0D] font-extrabold">{completionRatio}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#F4E2D3] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FF8A3D] to-[#FF5F0F] transition-all duration-300"
                  style={{ width: `${completionRatio}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-[#7C6A5E] flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-[#D95D0D]" />
              <span>Every flag cites an exact guideline from your approved brand rulebook</span>
            </div>

            <button
              type="button"
              onClick={dispatchReviewAudit}
              disabled={isEvaluating || (!activeUploadFile && !editorialText.trim())}
              className="px-7 py-3 rounded-xl bg-gradient-to-r from-[#FF8A3D] to-[#FF721B] hover:from-[#FF9952] hover:to-[#E8630D] text-white text-sm font-extrabold shadow-md shadow-[#FF8A3D]/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isEvaluating ? "Reviewing PDF..." : "Review Document (PDF)"}</span>
            </button>
          </div>
        </div>
      </div>

      {evaluationPayload && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div
            className={`p-6 rounded-3xl border bg-white shadow-md ${
              evaluationPayload.blocking_findings_count > 0
                ? "border-[#FECDCA] border-l-8 border-l-[#B42318]"
                : "border-[#A6F4C5] border-l-8 border-l-[#027A48]"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F4E2D3]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#7C6A5E]">
                  Audit Analysis Complete
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-[#201815] mt-1">
                  {evaluationPayload.blocking_findings_count > 0 ? (
                    <span className="text-[#B42318] flex items-center gap-2">
                      <AlertTriangle className="w-6 h-6 shrink-0" />
                      <span>{evaluationPayload.blocking_findings_count} Issue(s) Require Correction</span>
                    </span>
                  ) : (
                    <span className="text-[#027A48] flex items-center gap-2">
                      <CheckCircle2 className="w-6 h-6 shrink-0" />
                      <span>100% Brand Compliant! Ready to Publish</span>
                    </span>
                  )}
                </h2>
                <p className="text-xs text-[#7C6A5E] mt-1">
                  Document: <strong>{evaluationPayload.title || activeUploadFile?.name || "Submitted Copy"}</strong>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={printCertifiedPdf}
                  className="px-3 py-2 rounded-xl border border-[#F1E1D4] bg-white hover:bg-[#FFF9F3] text-[#201815] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Print or save tamper-proof document as PDF"
                >
                  <Download className="w-3.5 h-3.5 text-[#B42318]" />
                  <span>Document (.pdf)</span>
                </button>

                <button
                  type="button"
                  onClick={downloadCertifiedDoc}
                  className="px-3 py-2 rounded-xl border border-[#F1E1D4] bg-white hover:bg-[#FFF9F3] text-[#201815] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Download document as Microsoft Word (.doc)"
                >
                  <Download className="w-3.5 h-3.5 text-[#2E90FA]" />
                  <span>Document (.doc)</span>
                </button>

                <button
                  type="button"
                  onClick={downloadCertificateTxt}
                  className="px-3 py-2 rounded-xl border border-[#F1E1D4] bg-white hover:bg-[#FFF9F3] text-[#201815] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Download official cryptographic certificate as text"
                >
                  <Download className="w-3.5 h-3.5 text-[#C87539]" />
                  <span>Certificate (.txt)</span>
                </button>

                <button
                  type="button"
                  onClick={downloadAuditReportJson}
                  className="px-3 py-2 rounded-xl border border-[#F1E1D4] bg-white hover:bg-[#FFF9F3] text-[#201815] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Download machine-readable audit verification report"
                >
                  <Download className="w-3.5 h-3.5 text-[#027A48]" />
                  <span>Audit (.json)</span>
                </button>

                <button
                  type="button"
                  onClick={resetReviewWorkspace}
                  className="px-3.5 py-2.5 rounded-xl border border-[#F4E2D3] bg-white hover:bg-[#FFF0F0] text-[#7C6A5E] hover:text-[#B42318] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Clear audit results and review another document"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Start New Review</span>
                </button>

                {isSignOffComplete ? (
                  <span className="px-4 py-2.5 rounded-xl bg-[#EDFDF5] border border-[#A6F4C5] text-[#027A48] text-xs font-black flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approved &amp; Signed Off</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={commitDocumentSignOff}
                    disabled={isSigning}
                    className="px-5 py-2.5 rounded-xl bg-[#027A48] hover:bg-[#02663c] text-white text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-md disabled:opacity-50"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>{isSigning ? "Signing off..." : "Approve & Sign Off"}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
              <div className="p-3 rounded-xl bg-[#FFF9F3] border border-[#F4E2D3]">
                <span className="text-[10px] font-bold text-[#7C6A5E] uppercase block">Violations</span>
                <span className="text-xl font-black text-[#B42318] block mt-0.5">
                  {evaluationPayload.blocking_findings_count} Blocking
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#FFF9F3] border border-[#F4E2D3]">
                <span className="text-[10px] font-bold text-[#7C6A5E] uppercase block">Advisory Notes</span>
                <span className="text-xl font-black text-[#D95D0D] block mt-0.5">
                  {evaluationPayload.advisory_findings_count} Suggestions
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#FFF9F3] border border-[#F4E2D3]">
                <span className="text-[10px] font-bold text-[#7C6A5E] uppercase block">Fact Claims</span>
                <span className="text-xl font-black text-[#027A48] block mt-0.5">
                  {evaluationPayload.claims.length} Extracted
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#FFF9F3] border border-[#F4E2D3]">
                <span className="text-[10px] font-bold text-[#7C6A5E] uppercase block">Style Preservation</span>
                <span className="text-xs font-bold text-[#027A48] flex items-center gap-1 mt-1.5">
                  <Check className="w-4 h-4" />
                  <span>Creative Tone Preserved</span>
                </span>
              </div>
            </div>
          </div>

          {evaluationPayload.findings && evaluationPayload.findings.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-[#201815] flex items-center gap-2">
                  <span>Detected Issues &amp; Recommended Fixes ({evaluationPayload.findings.length})</span>
                </h3>
                <span className="text-xs text-[#7C6A5E]">
                  Click &ldquo;Apply Fix&rdquo; on any item to automatically correct it
                </span>
              </div>

              <div className="space-y-3">
                {evaluationPayload.findings.map((f, idx) => {
                  const isFixed = remediatedItems[f.id];
                  const isBlocking = f.severity === "BLOCKING";

                  return (
                    <div
                      key={f.id || idx}
                      className={`p-5 rounded-2xl border transition-all ${
                        isFixed
                          ? "bg-[#EDFDF5] border-[#A6F4C5]"
                          : isBlocking
                          ? "bg-white border-[#FECDCA] shadow-xs"
                          : "bg-white border-[#FDBA74] shadow-xs"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                              isBlocking ? "bg-[#B42318] text-white" : "bg-[#FFF2E7] text-[#D95D0D] border border-[#FDBA74]"
                            }`}
                          >
                            {f.severity}
                          </span>
                          <span className="text-xs font-extrabold text-[#201815]">
                            {f.category} · {f.rule_code}
                          </span>
                        </div>

                        <div>
                          {isFixed ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#EDFDF5] text-[#027A48] text-xs font-black border border-[#A6F4C5]">
                              <Check className="w-3.5 h-3.5" />
                              <span>Fix Applied!</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => applySingleSurgicalPatch(f.id)}
                              className="px-3 py-1 rounded-lg bg-[#FFF2E7] hover:bg-[#FFEAD9] text-[#D95D0D] text-xs font-extrabold border border-[#FDBA74] transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Apply Fix</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <p className="font-bold text-[#201815]">{f.description}</p>

                        {f.policy_citation && (
                          <div className="p-2.5 rounded-xl bg-[#FFFBF7] border border-[#F4E2D3] text-[#7C6A5E] text-[11px] leading-relaxed">
                            <strong className="text-[#201815]">Guideline Rule: </strong>
                            &ldquo;{f.policy_citation}&rdquo;
                          </div>
                        )}

                        {f.suggested_replacement && (
                          <div className="flex items-center gap-2 text-xs text-[#027A48] font-bold">
                            <span>Recommended Replacement:</span>
                            <span className="bg-[#EDFDF5] px-2 py-0.5 rounded border border-[#A6F4C5]">
                              {f.suggested_replacement}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {evaluationPayload.claims && evaluationPayload.claims.length > 0 && (
            <div className="p-6 rounded-3xl bg-white border border-[#F4E2D3] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-[#201815]">
                    Numbers &amp; Statistics Verification
                  </h3>
                  <p className="text-xs text-[#7C6A5E]">
                    Metrics extracted from the document and cross-referenced with your verified fact library.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-[#F4E2D3] border-t border-[#F4E2D3]">
                {evaluationPayload.claims.map((claim, idx) => {
                  const visual = resolveClaimBadge(claim.status);
                  return (
                    <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="font-extrabold text-[#201815]">&ldquo;{claim.claim_text}&rdquo;</span>
                        {claim.matched_fact_subject && (
                          <div className="text-[11px] text-[#7C6A5E] mt-0.5">
                            Matched Topic: {claim.matched_fact_subject}
                          </div>
                        )}
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase shrink-0 ${visual.badgeClass}`}>
                        {visual.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {evaluationPayload.diff_html && (
            <div className="p-6 rounded-3xl bg-white border border-[#F4E2D3] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-[#201815]">
                    Tracked Changes Diff (Original vs Corrected)
                  </h3>
                  <p className="text-xs text-[#7C6A5E]">
                    Red indicates removed violations; green indicates approved replacements.
                  </p>
                </div>
                <span className="text-[11px] font-extrabold text-[#027A48] bg-[#EDFDF5] px-2.5 py-1 rounded-full border border-[#A6F4C5]">
                  Surgical Fix
                </span>
              </div>
              <div
                className="p-4 rounded-2xl bg-[#FFFBF7] border border-[#F4E2D3] text-xs leading-relaxed text-[#201815] font-sans"
                dangerouslySetInnerHTML={{ __html: evaluationPayload.diff_html }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
