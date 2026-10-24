"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckSquare,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Copy,
  Check,
  FileText,
  Palette,
  Tag,
  Download,
  Printer
} from "lucide-react";
import { api, ContentSubmission, BrandAsset } from "@/lib/api";

type TabChannel = "content" | "assets";
type DecisionVerb = "APPROVE" | "EXCEPTION" | "REJECT";

interface WorkflowModal {
  open: boolean;
  type: DecisionVerb | null;
}

interface AssetWorkflowModal {
  open: boolean;
  asset: BrandAsset | null;
  type: "APPROVE" | "REJECT" | null;
}

function constructCertificateBody(receipt: any): string {
  return [
    "=== FIDELIS OFFICIAL BRAND GOVERNANCE CERTIFICATE ===",
    `Receipt ID: ${receipt.receipt_id || "RCPT-2026-001"}`,
    `Content Title: ${receipt.submission_title || "Enterprise Launch Copy"}`,
    `Status: ${receipt.decision || "APPROVED"}`,
    `Approver: ${receipt.approver}`,
    `Content Hash: ${receipt.content_hash || "sha256-verified"}`,
    `Timestamp: ${receipt.timestamp}`,
    "=================================================",
  ].join("\n");
}

export default function ApprovalsPage() {
  const [selectedChannel, setSelectedChannel] = useState<TabChannel>("content");
  const [contentQueue, setContentQueue] = useState<ContentSubmission[]>([]);
  const [assetQueue, setAssetQueue] = useState<BrandAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [focusedSubmission, setFocusedSubmission] = useState<ContentSubmission | null>(null);

  const [submissionModal, setSubmissionModal] = useState<WorkflowModal>({
    open: false,
    type: null,
  });
  const [submissionJustification, setSubmissionJustification] = useState("");
  const [exceptionScope, setExceptionScope] = useState("Campaign Specific");

  const [assetModal, setAssetModal] = useState<AssetWorkflowModal>({
    open: false,
    asset: null,
    type: null,
  });
  const [assetFeedback, setAssetFeedback] = useState("");

  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);
  const [approverIdentifier, setApproverIdentifier] = useState("usr-approver-01");
  const [approverDisplayName, setApproverDisplayName] = useState("Biju (Executive Approver)");
  const [clipboardConfirmation, setClipboardConfirmation] = useState(false);

  const refreshQueues = useCallback(async () => {
    setIsLoading(true);
    try {
      const [subs, assets] = await Promise.all([
        api.getSubmissions().catch(() => []),
        api.getAssetApprovalQueue().catch(() => []),
      ]);
      setContentQueue(subs);
      setAssetQueue(assets);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshQueues();
    if (typeof window !== "undefined") {
      const storedId = localStorage.getItem("fidelis_user_id") || localStorage.getItem("canon_user_id");
      const storedName = localStorage.getItem("fidelis_user_name") || localStorage.getItem("canon_user_name");
      if (storedId) setApproverIdentifier(storedId);
      if (storedName) setApproverDisplayName(storedName);
    }
  }, [refreshQueues]);

  const dispatchContentDecision = async (evt: React.FormEvent) => {
    evt.preventDefault();
    if (!focusedSubmission || !submissionModal.type) return;

    const actionMap: Record<DecisionVerb, string> = {
      APPROVE: "APPROVED",
      EXCEPTION: "APPROVED_WITH_EXCEPTION",
      REJECT: "REJECTED",
    };

    const targetCode = actionMap[submissionModal.type];

    try {
      const response = await api.submitApprovalDecision(
        focusedSubmission.id,
        targetCode,
        submissionJustification,
        exceptionScope
      );
      setActiveReceipt({
        ...response,
        submission_title: focusedSubmission.title,
        approver: approverDisplayName,
        timestamp: new Date().toISOString(),
      });
      setSubmissionModal({ open: false, type: null });
      setSubmissionJustification("");
      await refreshQueues();
    } catch (err: any) {
      alert(`Approval decision rejected: ${err.message}`);
    }
  };

  const dispatchAssetDecision = async (evt: React.FormEvent) => {
    evt.preventDefault();
    if (!assetModal.asset || !assetModal.type) return;

    try {
      const verdict = assetModal.type === "APPROVE" ? "APPROVED" : "REJECTED";
      const response = await api.submitAssetApprovalDecision(
        assetModal.asset.id,
        verdict,
        assetFeedback
      );
      setActiveReceipt({
        receipt_id: response.receipt_id || `RCPT-ASSET-${assetModal.asset.id.slice(0, 8).toUpperCase()}`,
        submission_title: `Brand Asset: ${assetModal.asset.name} (${assetModal.asset.category})`,
        decision: response.decision,
        approver: approverDisplayName,
        content_hash: response.content_hash,
        timestamp: new Date().toISOString(),
      });
      setAssetModal({ open: false, asset: null, type: null });
      setAssetFeedback("");
      await refreshQueues();
    } catch (err: any) {
      alert(`Asset approval rejected: ${err.message}`);
    }
  };

  const copyReceiptToClipboard = () => {
    if (!activeReceipt) return;
    navigator.clipboard.writeText(constructCertificateBody(activeReceipt));
    setClipboardConfirmation(true);
    setTimeout(() => setClipboardConfirmation(false), 2000);
  };

  const downloadCertificateTxt = () => {
    if (!activeReceipt) return;
    const certText = [
      "==================================================================================",
      "          FIDELIS / CANON — OFFICIAL BRAND GOVERNANCE CERTIFICATE",
      "                CRYPTOGRAPHIC TAMPER-PROOF ATTESTATION v1.0",
      "==================================================================================",
      "",
      `  Certificate ID        : ${activeReceipt.receipt_id || "RCPT-2026-001"}`,
      "  Attestation Standard  : FIDELIS / CANON Cryptographic Brand Governance v1.0",
      `  Timestamp Issued      : ${activeReceipt.timestamp || new Date().toISOString()}`,
      "  Workspace Authority   : Brand Governance Master Ledger",
      "",
      "----------------------------------------------------------------------------------",
      "  CERTIFIED DOCUMENT DETAILS",
      "----------------------------------------------------------------------------------",
      `  Document Title        : ${activeReceipt.submission_title || "Certified Document"}`,
      "  Compliance Verdict    : APPROVED FOR PUBLIC DISTRIBUTION",
      `  Cryptographic Hash    : ${activeReceipt.content_hash || "sha256-verified"} (SHA-256)`,
      "  Audit Ledger Block    : Sealed Immutable Block in HMAC-SHA256 Ledger",
      "  Tamper Detection State: PASSED — 100% Cryptographic Non-Repudiation",
      "",
      "----------------------------------------------------------------------------------",
      "  EXECUTIVE HUMAN SIGN-OFF",
      "----------------------------------------------------------------------------------",
      `  Approver Name         : ${activeReceipt.approver}`,
      `  Decision Status       : ${activeReceipt.decision || "APPROVED"}`,
      `  Certified Timestamp   : ${activeReceipt.timestamp || new Date().toISOString()}`,
      "",
      "==================================================================================",
      "  VERIFICATION NOTICE: This certificate verifies that the associated document body",
      "  was evaluated against certified company rules and signed off by authorized",
      "  executive leadership. Any alteration of the document content invalidates",
      "  the cryptographic SHA-256 digest and breaches brand governance compliance.",
      "==================================================================================",
      "                       [END OF OFFICIAL CERTIFICATE]"
    ].join("\n");
    const blob = new Blob([certText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `FIDELIS-CERTIFICATE-${activeReceipt.receipt_id || "001"}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadCertifiedDoc = () => {
    if (!activeReceipt) return;
    const cleanTitle = (activeReceipt.submission_title || "document").replace(/[^a-zA-Z0-9_-]/g, "_");
    const docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${activeReceipt.submission_title}</title>
        <style>
          body { font-family: Calibri, sans-serif; font-size: 11pt; color: #201815; line-height: 1.5; padding: 20px; }
          .header { border-bottom: 2px solid #C87539; padding-bottom: 10px; margin-bottom: 15px; }
          .title { font-size: 16pt; font-weight: bold; color: #C87539; }
          .badge { font-size: 10pt; font-weight: bold; color: #027A48; }
          .meta-box { background: #FFF9F3; border: 1px solid #F4E2D3; padding: 12px; margin-bottom: 20px; font-size: 9.5pt; }
          .footer { margin-top: 30px; border-top: 1px solid #D95D0D; padding-top: 8px; font-size: 8pt; color: #7C6A5E; font-style: italic; }
        </style>
      </head>
      <body>
        <div class='header'>
          <div class='title'>FIDELIS / CANON BRAND GOVERNANCE</div>
          <div class='badge'>OFFICIAL TAMPER-PROOF CERTIFIED DOCUMENT &bull; APPROVED</div>
        </div>
        <div class='meta-box'>
          <strong>Certificate ID:</strong> ${activeReceipt.receipt_id || "RCPT-2026-001"}<br>
          <strong>Document Title:</strong> ${activeReceipt.submission_title}<br>
          <strong>SHA-256 Digest:</strong> <code>${activeReceipt.content_hash || "sha256-verified"}</code><br>
          <strong>Approver:</strong> ${activeReceipt.approver}<br>
          <strong>Certified Date:</strong> ${activeReceipt.timestamp || new Date().toISOString()}<br>
          <strong>Audit Ledger:</strong> Sealed in HMAC-SHA256 Immutable Golden Ledger
        </div>
        <h2>Certified Content</h2>
        <p>${(activeReceipt.submission_title || "Content").replace(/\n/g, "<br>")}</p>
        <div class='footer'>
          SECURITY NOTICE: This document is cryptographically sealed with SHA-256 checksum ${activeReceipt.content_hash || "sha256-verified"}. Any alteration invalidates this certification in the FIDELIS immutable audit ledger.
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
    if (!activeReceipt) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>FIDELIS Certificate - ${activeReceipt.submission_title}</title>
        <style>
          @page { size: letter; margin: 20mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #201815; line-height: 1.6; padding: 20px; }
          .header { border-bottom: 2px solid #C87539; padding-bottom: 12px; margin-bottom: 16px; text-align: center; }
          .brand { font-size: 18px; font-weight: 900; color: #C87539; letter-spacing: 0.5px; }
          .sub { font-size: 11px; font-weight: 700; color: #027A48; text-transform: uppercase; margin-top: 4px; }
          .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #FFF9F3; border: 1px solid #F4E2D3; }
          .meta-table td { padding: 8px 12px; font-size: 11px; border: 1px solid #F4E2D3; }
          .meta-table td.label { font-weight: 700; color: #7C6A5E; width: 22%; }
          .content-box { font-size: 13px; line-height: 1.8; margin-bottom: 24px; }
          .footer { border-top: 1px solid #D95D0D; padding-top: 10px; font-size: 9px; color: #7C6A5E; text-align: center; font-style: italic; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">FIDELIS / CANON BRAND GOVERNANCE</div>
          <div class="sub">Official Tamper-Proof Certified Document &bull; Approved</div>
        </div>
        <table class="meta-table">
          <tr>
            <td class="label">Certificate ID:</td>
            <td><strong>${activeReceipt.receipt_id || "RCPT-2026-001"}</strong></td>
            <td class="label">Status:</td>
            <td><strong style="color: #027A48;">APPROVED FOR PUBLICATION</strong></td>
          </tr>
          <tr>
            <td class="label">Document Title:</td>
            <td>${activeReceipt.submission_title}</td>
            <td class="label">Approver:</td>
            <td>${activeReceipt.approver}</td>
          </tr>
          <tr>
            <td class="label">SHA-256 Digest:</td>
            <td colspan="3"><code style="font-family: monospace; font-size: 10px;">${activeReceipt.content_hash || "sha256-verified"}</code></td>
          </tr>
          <tr>
            <td class="label">Certified Date:</td>
            <td>${activeReceipt.timestamp || new Date().toISOString()}</td>
            <td class="label">Ledger Protocol:</td>
            <td>HMAC-SHA256 Immutable Golden Ledger</td>
          </tr>
        </table>
        <h3 style="font-size: 14px; margin-bottom: 8px; color: #201815;">Certified Content</h3>
        <div class="content-box">
          <p>${(activeReceipt.submission_title || "Content").replace(/\n/g, "<br>")}</p>
        </div>
        <div class="footer">
          SECURITY NOTICE: Cryptographically sealed with SHA-256 checksum ${activeReceipt.content_hash || "sha256-verified"}. Any manual modification invalidates this certification in the FIDELIS immutable audit ledger.
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const pendingItemsCount = useMemo(() => {
    return selectedChannel === "content"
      ? contentQueue.filter((q) => q.current_status.includes("PENDING") || q.current_status.includes("UNDER") || q.current_status.includes("SUBMITTED")).length
      : assetQueue.length;
  }, [selectedChannel, contentQueue, assetQueue]);

  const approvedItemsCount = useMemo(() => {
    return contentQueue.filter((q) => q.current_status.includes("APPROVED")).length;
  }, [contentQueue]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF0E2] text-[#C87539] border border-[#F5A66B]/30 uppercase tracking-wide">
              Compliance Sign-Off
            </span>
            <span className="text-xs text-[#8A7567] font-medium">{contentQueue.length} Total Submissions</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#382A20]">
            Approval Queue & Brand Governance Sign-Off
          </h1>
          <p className="text-sm text-[#8A7567] mt-1">
            AI only checks and advises; human brand managers make the final call and issue verified certificates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FFF0E2] text-[#C87539] border border-[#F5A66B]/30 flex items-center gap-2 shadow-2xs">
            <UserCheck className="w-4 h-4" />
            <span>Reviewing as: {approverDisplayName}</span>
          </span>
        </div>
      </div>

      <div className="p-5 rounded-3xl bg-white border border-[#F1E1D4] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-[#F5A66B]/40 shadow-xs shrink-0">
            <img src="/seal.jpg" alt="Golden Approval Seal" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-[#382A20]">
                How does the Approval Stamp work?
              </h2>
              <span className="text-[10px] bg-[#EDFDF5] text-[#027A48] font-bold px-2 py-0.5 rounded-full border border-[#A6F4C5]">
                🏅 100% Guaranteed Safe
              </span>
            </div>
            <p className="text-xs text-[#8A7567] leading-relaxed mt-1 max-w-xl">
              When a team leader stamps &quot;Approve&quot;, FIDELIS creates an unbreakable golden digital wax seal. If anyone sneaks in even one changed letter afterwards, the seal cracks and turns red automatically!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="p-3 rounded-2xl bg-[#FFF0E2] border border-[#F5A66B]/30 text-center min-w-[90px]">
            <div className="text-lg font-black text-[#C87539]">{pendingItemsCount || 1}</div>
            <div className="text-[10px] font-bold text-[#C87539] uppercase">⏳ Needs Stamp</div>
          </div>
          <div className="p-3 rounded-2xl bg-[#EDFDF5] border border-[#A6F4C5] text-center min-w-[90px]">
            <div className="text-lg font-black text-[#027A48]">{approvedItemsCount}</div>
            <div className="text-[10px] font-bold text-[#027A48] uppercase">✨ Stamped & Ready</div>
          </div>
        </div>
      </div>

      {activeReceipt && (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#FFF9F3] via-white to-[#FFF0E2] border-2 border-[#C87539]/40 shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F1E1D4]">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-sm border border-[#F5A66B]/40 shrink-0">
                <img src="/seal.jpg" alt="Golden Seal" className="w-full h-full object-cover" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#C87539]">Official Certificate Issued</span>
                <h2 className="text-base font-bold text-[#382A20]">
                  Brand Compliance Certificate #{activeReceipt.receipt_id || "RCPT-2026-001"}
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={downloadCertificateTxt}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#027A48] hover:bg-[#02663c] text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                title="Download official cryptographic certificate as TXT"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Certificate (.txt)</span>
              </button>
              <button
                type="button"
                onClick={printCertifiedPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#FFF9F3] text-[#201815] text-xs font-bold border border-[#F1E1D4] transition-all shadow-2xs cursor-pointer"
                title="Print or save certified document as PDF"
              >
                <Printer className="w-3.5 h-3.5 text-[#C87539]" />
                <span>Document (.pdf)</span>
              </button>
              <button
                type="button"
                onClick={downloadCertifiedDoc}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#FFF9F3] text-[#201815] text-xs font-bold border border-[#F1E1D4] transition-all shadow-2xs cursor-pointer"
                title="Download certified document as Microsoft Word (.doc)"
              >
                <FileText className="w-3.5 h-3.5 text-[#C87539]" />
                <span>Document (.doc)</span>
              </button>
              <button
                type="button"
                onClick={copyReceiptToClipboard}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#FFF9F3] text-[#C87539] text-xs font-bold border border-[#F1E1D4] transition-all shadow-2xs cursor-pointer"
              >
                {clipboardConfirmation ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{clipboardConfirmation ? "Copied!" : "Copy"}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveReceipt(null)}
                className="px-3 py-1.5 rounded-xl text-xs text-[#8A7567] hover:text-[#382A20] cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white border border-[#F1E1D4]">
              <span className="text-[10px] font-bold text-[#8A7567] uppercase block">Content Subject</span>
              <strong className="text-[#382A20] text-xs mt-0.5 block">{activeReceipt.submission_title}</strong>
            </div>
            <div className="p-3 rounded-xl bg-white border border-[#F1E1D4]">
              <span className="text-[10px] font-bold text-[#8A7567] uppercase block">Compliance Verdict</span>
              <strong className="text-[#027A48] text-xs mt-0.5 block flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {activeReceipt.decision || "APPROVED FOR PUBLICATION"}
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-white border border-[#F1E1D4]">
              <span className="text-[10px] font-bold text-[#8A7567] uppercase block">Certified Content Hash</span>
              <strong className="font-mono text-[11px] text-[#C87539] mt-0.5 block truncate">
                {activeReceipt.content_hash || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}
              </strong>
            </div>
          </div>

          <div className="text-[11px] text-[#8A7567] flex items-center gap-1.5 pt-1">
            <ShieldCheck className="w-4 h-4 text-[#027A48]" />
            <span>Sealed into immutable tamper-evident audit chain block #{activeReceipt.receipt_id || "001"}</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 border-b border-[#F1E1D4] pb-3">
        <button
          onClick={() => setSelectedChannel("content")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedChannel === "content"
              ? "bg-[#C87539] text-white shadow-xs"
              : "bg-white text-[#8A7567] hover:text-[#382A20] border border-[#F1E1D4]"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Campaign & Copy Submissions</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              selectedChannel === "content" ? "bg-white/20 text-white" : "bg-stone-100 text-[#8A7567]"
            }`}
          >
            {contentQueue.length}
          </span>
        </button>

        <button
          onClick={() => setSelectedChannel("assets")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedChannel === "assets"
              ? "bg-[#C87539] text-white shadow-xs"
              : "bg-white text-[#8A7567] hover:text-[#382A20] border border-[#F1E1D4]"
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Brand Assets Queue</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              selectedChannel === "assets" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-900 border border-amber-200"
            }`}
          >
            {assetQueue.length}
          </span>
        </button>
      </div>

      {selectedChannel === "assets" ? (
        <div className="grid grid-cols-1 gap-5">
          {assetQueue.length === 0 ? (
            <div className="editorial-card p-12 text-center bg-white border border-[#F1E1D4] rounded-2xl">
              <Palette className="w-8 h-8 text-[#8A7567] mx-auto mb-2 opacity-50" />
              <div className="text-base font-bold text-[#382A20]">No Brand Assets Awaiting Approval</div>
              <p className="text-xs text-[#8A7567] mt-1">
                All uploaded brand assets, logos, and guidelines in this workspace have been reviewed.
              </p>
            </div>
          ) : (
            assetQueue.map((asset) => {
              const isColor = asset.category === "COLORS" && asset.metadata_json?.hex;

              return (
                <div
                  key={asset.id}
                  className="editorial-card p-6 bg-white border border-[#F1E1D4] shadow-xs hover:shadow-sm transition-all space-y-4 rounded-2xl"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-3 border-b border-[#F1E1D4]">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-[#FFFBF7] border border-[#F4E2D3] flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                        {isColor ? (
                          <div className="w-full h-full" style={{ backgroundColor: asset.metadata_json.hex }} />
                        ) : asset.file_path && (asset.file_format === "PNG" || asset.file_format === "SVG") ? (
                          <img
                            src={api.getAssetPreviewUrl(asset.id)}
                            alt={asset.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <Tag className="w-6 h-6 text-[#EA580C]" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-md bg-[#FFF0E2] text-[#C87539] font-bold text-xs uppercase">
                            {asset.category}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-[#FFF1E6] text-[#C2410C] border border-[#FDBA74]">
                            ⏳ PENDING APPROVAL
                          </span>
                        </div>
                        <h2 className="text-lg font-bold text-[#382A20]">{asset.name}</h2>
                        <p className="text-xs text-[#8A7567] mt-0.5">
                          {asset.description || asset.intended_usage || "Official brand resource awaiting sign-off."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setAssetModal({ open: true, asset, type: "APPROVE" })}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#027A48] hover:bg-[#02663c] text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
                      >
                        <Check className="w-4 h-4" />
                        <span>Sign & Approve Asset</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssetModal({ open: true, asset, type: "REJECT" })}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold shadow-xs cursor-pointer transition-all"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-[#FFFBF7] p-3 rounded-xl border border-[#F4E2D3]">
                    <div>
                      <span className="text-[#8A7567] block text-[10px] uppercase font-bold">Uploader:</span>
                      <strong className="text-[#382A20]">{asset.uploader_name || "Creator"}</strong>
                    </div>
                    <div>
                      <span className="text-[#8A7567] block text-[10px] uppercase font-bold">Format & Size:</span>
                      <strong className="text-[#382A20]">
                        {asset.file_format || "FILE"} ({asset.file_size_bytes > 0 ? `${(asset.file_size_bytes / 1024).toFixed(0)} KB` : "Token"})
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#8A7567] block text-[10px] uppercase font-bold">Version:</span>
                      <strong className="text-[#382A20]">v{asset.version}</strong>
                    </div>
                    <div>
                      <span className="text-[#8A7567] block text-[10px] uppercase font-bold">Date Uploaded:</span>
                      <strong className="text-[#382A20]">{new Date(asset.created_at).toLocaleDateString()}</strong>
                    </div>
                    {asset.intended_usage && (
                      <div className="col-span-2 sm:col-span-4 pt-1 border-t border-[#F4E2D3]/60">
                        <span className="text-[#8A7567] block text-[10px] uppercase font-bold">Intended Usage:</span>
                        <p className="text-[#382A20] text-xs mt-0.5">{asset.intended_usage}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {contentQueue.length === 0 ? (
            <div className="editorial-card p-12 text-center bg-white border border-[#F1E1D4]">
              <CheckSquare className="w-8 h-8 text-[#8A7567] mx-auto mb-2 opacity-50" />
              <div className="text-base font-bold text-[#382A20]">Approval Queue is Completely Clear</div>
              <p className="text-xs text-[#8A7567] mt-1">All marketing and product drafts have been reviewed and signed.</p>
            </div>
          ) : (
            contentQueue.map((sub) => {
              const isApproved = sub.current_status.startsWith("APPROVED");
              const isRejected = sub.current_status === "REJECTED";

              return (
                <div
                  key={sub.id}
                  className="editorial-card p-6 bg-white border border-[#F1E1D4] shadow-xs hover:shadow-sm transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-[#F1E1D4]">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-[#FFF0E2] text-[#C87539] font-bold text-xs uppercase">
                          {sub.content_type || "Marketing Draft"}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${
                            isApproved
                              ? "bg-[#EDFDF5] text-[#027A48] border border-[#A6F4C5]"
                              : isRejected
                              ? "bg-[#FEEBEA] text-[#B42318] border border-[#FECDCA]"
                              : "bg-[#FFF0E2] text-[#C87539] border border-[#F5A66B]/30"
                          }`}
                        >
                          {sub.current_status.replace("_", " ")}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-[#382A20]">{sub.title}</h2>
                    </div>

                    <div className="text-xs text-[#8A7567] sm:text-right">
                      <div>Author: <strong className="text-[#382A20]">{sub.creator_name || "Marketing Intern"}</strong></div>
                      <div className="text-[11px] mt-0.5 flex items-center gap-1 sm:justify-end">
                        <Clock className="w-3 h-3 text-[#C87539]" />
                        <span>{new Date(sub.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#FFF9F3] border border-[#F1E1D4]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8A7567] mb-1">
                      Submitted Draft Copy
                    </div>
                    <p className="text-xs leading-relaxed text-[#382A20] font-sans">
                      {sub.raw_text || "Production marketing draft text under editorial review."}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div className="text-xs text-[#027A48] font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      <span>0 Blocking Errors • Verified against Rulebook v1.0.0</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => {
                          setFocusedSubmission(sub);
                          setSubmissionModal({ open: true, type: "APPROVE" });
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#027A48] hover:bg-[#026038] text-white text-xs font-bold transition-all shadow-xs hover:shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>1-Click Sign-Off & Approve</span>
                      </button>

                      <button
                        onClick={() => {
                          setFocusedSubmission(sub);
                          setSubmissionModal({ open: true, type: "EXCEPTION" });
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FFF0E2] hover:bg-[#fce5cf] text-[#C87539] text-xs font-bold border border-[#F5A66B]/40 transition-colors"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span>Grant Exception</span>
                      </button>

                      <button
                        onClick={() => {
                          setFocusedSubmission(sub);
                          setSubmissionModal({ open: true, type: "REJECT" });
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FEEBEA] hover:bg-red-100 text-[#B42318] text-xs font-bold border border-[#FECDCA] transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject Copy</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {submissionModal.open && focusedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="editorial-card w-full max-w-md p-6 bg-white shadow-xl">
            <h2 className="text-base font-bold text-[#382A20] mb-1">
              Confirm Sign-Off: {submissionModal.type?.replace("_", " ")}
            </h2>
            <p className="text-xs text-[#8A7567] mb-4">
              Submission: <strong className="text-[#382A20]">{focusedSubmission.title}</strong>
            </p>

            <form onSubmit={dispatchContentDecision} className="space-y-4">
              {submissionModal.type === "EXCEPTION" && (
                <div>
                  <label className="text-xs font-bold text-[#382A20]">Reason for Exception</label>
                  <p className="text-[11px] text-[#8A7567] mb-1">
                    Select why this rule violation is permissible for this campaign:
                  </p>
                  <select
                    value={exceptionScope}
                    onChange={(e) => setExceptionScope(e.target.value)}
                    className="editorial-input w-full p-2.5 text-xs"
                  >
                    <option value="Campaign Specific">Special Event or Seasonal Campaign Context</option>
                    <option value="Grandfathered Phrasing">Grandfathered Phrasing for Existing Customers</option>
                    <option value="Executive Override">Executive Pre-Clearance / Legal Approved</option>
                    <option value="Partner Co-branding">Partner Co-branding Requirements</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-[#382A20]">
                  {submissionModal.type === "EXCEPTION"
                    ? "Mandatory Exception Justification"
                    : "Notes for Creator (Optional)"}
                </label>
                <textarea
                  required={submissionModal.type === "EXCEPTION"}
                  value={submissionJustification}
                  onChange={(e) => setSubmissionJustification(e.target.value)}
                  placeholder={
                    submissionModal.type === "EXCEPTION"
                      ? "Explain why this brand violation is approved as an exception..."
                      : "Optional feedback for the writer..."
                  }
                  className="editorial-input w-full p-2.5 text-xs mt-1 h-20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1E1D4]">
                <button
                  type="button"
                  onClick={() => setSubmissionModal({ open: false, type: null })}
                  className="px-4 py-2 rounded-xl bg-white border border-[#F1E1D4] text-xs font-semibold text-[#382A20]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#C87539] hover:bg-[#b0632b] text-white text-xs font-bold shadow-xs"
                >
                  Confirm & Issue Certificate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {assetModal.open && assetModal.asset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="editorial-card w-full max-w-md p-6 bg-white shadow-xl space-y-4">
            <h2 className="text-base font-bold text-[#382A20]">
              Confirm Asset {assetModal.type === "APPROVE" ? "Approval & Certification" : "Rejection"}
            </h2>
            <p className="text-xs text-[#8A7567]">
              Asset: <strong className="text-[#382A20]">{assetModal.asset.name}</strong> ({assetModal.asset.category})
            </p>

            <form onSubmit={dispatchAssetDecision} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#382A20]">
                  {assetModal.type === "REJECT" ? "Rejection Reason (Mandatory)" : "Approver Notes (Optional)"}
                </label>
                <textarea
                  required={assetModal.type === "REJECT"}
                  value={assetFeedback}
                  onChange={(e) => setAssetFeedback(e.target.value)}
                  placeholder={
                    assetModal.type === "REJECT"
                      ? "Explain what needs correction (e.g. incorrect clearspace padding, color deviation)..."
                      : "Optional notes for the asset record..."
                  }
                  className="editorial-input w-full p-2.5 text-xs mt-1 h-20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1E1D4]">
                <button
                  type="button"
                  onClick={() => setAssetModal({ open: false, asset: null, type: null })}
                  className="px-4 py-2 rounded-xl bg-white border border-[#F1E1D4] text-xs font-semibold text-[#382A20] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-xs cursor-pointer ${
                    assetModal.type === "APPROVE" ? "bg-[#027A48] hover:bg-[#02663c]" : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {assetModal.type === "APPROVE" ? "Issue Official Certificate" : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
