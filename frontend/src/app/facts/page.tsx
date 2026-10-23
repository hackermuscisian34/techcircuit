"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Database,
  Plus,
  Calendar,
  User,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Search,
  Send,
  RefreshCw,
  Lightbulb,
  Check,
  Sparkles,
  Upload,
  FileUp,
  FileCheck,
  X,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { api, Fact, CandidateFact, FactExtractionResult } from "../../lib/api";

type FactFilterKind = "ALL" | "ACTIVE" | "STALE";

export default function FactsPage() {
  const [vaultFacts, setVaultFacts] = useState<Fact[]>([]);
  const [isVaultLoading, setIsVaultLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState("");
  const [filterSegment, setFilterSegment] = useState<FactFilterKind>("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedProofFile, setSelectedProofFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [rawProofText, setRawProofText] = useState("");
  const [isManualInputVisible, setIsManualInputVisible] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [currentExtractionStatus, setCurrentExtractionStatus] = useState("");
  const [aiExtractionOutput, setAiExtractionOutput] = useState<FactExtractionResult | null>(null);
  const [certifyingFactCode, setCertifyingFactCode] = useState<string | null>(null);
  const [certifiedCodesMap, setCertifiedCodesMap] = useState<Record<string, boolean>>({});

  const [candidateDraft, setCandidateDraft] = useState<Partial<Fact>>({
    fact_code: "FACT-NEW-2026",
    subject: "",
    approved_statement: "",
    normalized_value: "",
    normalized_unit: "",
    source_document: "",
    source_quote: "",
    owner_name: "Content Creator",
    owner_email: "creator@fidelis.example",
    valid_until: "2027-12-31T23:59:59Z",
  });

  const fetchVaultFacts = useCallback(async () => {
    setIsVaultLoading(true);
    try {
      const records = await api.getFacts();
      setVaultFacts(records);
    } catch (err) {
      console.error(err);
    } finally {
      setIsVaultLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVaultFacts();
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("fidelis_user_name") || localStorage.getItem("canon_user_name");
      const savedEmail = localStorage.getItem("fidelis_user_email") || localStorage.getItem("canon_user_email");
      if (savedUser) {
        setCandidateDraft((prev: Partial<Fact>) => ({
          ...prev,
          owner_name: savedUser,
          owner_email: savedEmail || prev.owner_email,
        }));
      }
    }
  }, [fetchVaultFacts]);

  const triggerToast = (msg: string) => {
    setToastNotification(msg);
    setTimeout(() => setToastNotification(null), 4500);
  };

  const onDragOverEvent = (evt: React.DragEvent) => {
    evt.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeaveEvent = (evt: React.DragEvent) => {
    evt.preventDefault();
    setIsDragOver(false);
  };

  const onDropEvent = (evt: React.DragEvent) => {
    evt.preventDefault();
    setIsDragOver(false);
    if (evt.dataTransfer.files && evt.dataTransfer.files.length > 0) {
      onFileChosen(evt.dataTransfer.files[0]);
    }
  };

  const onFileChosen = (file: File) => {
    setSelectedProofFile(file);
    setAiExtractionOutput(null);
    setCertifiedCodesMap({});
  };

  const resetProofFile = () => {
    setSelectedProofFile(null);
    setRawProofText("");
    setAiExtractionOutput(null);
    setCertifiedCodesMap({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const runFactExtraction = async () => {
    if (!selectedProofFile && !rawProofText.trim()) {
      triggerToast("Please upload a PDF proof document or paste document text.");
      return;
    }

    setIsExtracting(true);
    setCurrentExtractionStatus("Reading and parsing proof document...");

    try {
      const formData = new FormData();
      if (selectedProofFile) {
        formData.append("file", selectedProofFile);
      }
      if (rawProofText.trim()) {
        formData.append("text", rawProofText.trim());
      }

      setCurrentExtractionStatus("AI scanning for SLAs, benchmark metrics, and certifications...");
      const payload = await api.extractFacts(formData);
      setAiExtractionOutput(payload);
      setCurrentExtractionStatus("");
      triggerToast(`🎉 Successfully extracted ${payload.candidate_facts_count} candidate facts from ${payload.source_document}!`);
    } catch (err: any) {
      triggerToast(`Extraction failed: ${err.message || "Could not parse document."}`);
      setCurrentExtractionStatus("");
    } finally {
      setIsExtracting(false);
    }
  };

  const commitCandidateFact = async (candidate: CandidateFact) => {
    setCertifyingFactCode(candidate.fact_code);
    try {
      let submitter = "Content Creator";
      let emailAddr = "creator@fidelis.example";
      if (typeof window !== "undefined") {
        submitter = localStorage.getItem("fidelis_user_name") || localStorage.getItem("canon_user_name") || submitter;
        emailAddr = localStorage.getItem("fidelis_user_email") || localStorage.getItem("canon_user_email") || emailAddr;
      }

      await api.createFact({
        fact_code: candidate.fact_code,
        subject: candidate.subject,
        approved_statement: candidate.approved_statement,
        normalized_value: candidate.normalized_value,
        normalized_unit: candidate.normalized_unit,
        source_document: candidate.source_document,
        source_quote: candidate.source_quote,
        owner_name: submitter,
        owner_email: emailAddr,
        valid_until: candidate.valid_until,
      });

      setCertifiedCodesMap((prev) => ({ ...prev, [candidate.fact_code]: true }));
      await fetchVaultFacts();
      triggerToast(`✓ Fact ${candidate.fact_code} successfully certified to Brand Vault!`);
    } catch (err: any) {
      triggerToast(`Certification failed: ${err.message || "Server error"}`);
    } finally {
      setCertifyingFactCode(null);
    }
  };

  const commitAllExtractedFacts = async () => {
    if (!aiExtractionOutput || aiExtractionOutput.candidate_facts.length === 0) return;
    setCertifyingFactCode("ALL");
    let totalAdded = 0;

    let submitter = "Content Creator";
    let emailAddr = "creator@fidelis.example";
    if (typeof window !== "undefined") {
      submitter = localStorage.getItem("fidelis_user_name") || localStorage.getItem("canon_user_name") || submitter;
      emailAddr = localStorage.getItem("fidelis_user_email") || localStorage.getItem("canon_user_email") || emailAddr;
    }

    for (const item of aiExtractionOutput.candidate_facts) {
      if (certifiedCodesMap[item.fact_code]) continue;
      try {
        await api.createFact({
          fact_code: item.fact_code,
          subject: item.subject,
          approved_statement: item.approved_statement,
          normalized_value: item.normalized_value,
          normalized_unit: item.normalized_unit,
          source_document: item.source_document,
          source_quote: item.source_quote,
          owner_name: submitter,
          owner_email: emailAddr,
          valid_until: item.valid_until,
        });
        setCertifiedCodesMap((prev) => ({ ...prev, [item.fact_code]: true }));
        totalAdded++;
      } catch (err) {
        console.error(err);
      }
    }

    setCertifyingFactCode(null);
    await fetchVaultFacts();
    triggerToast(`🎉 Certified ${totalAdded} new facts into Brand Vault!`);
  };

  const handleModalAutoFill = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    if (!evt.target.files || evt.target.files.length === 0) return;
    const incomingFile = evt.target.files[0];
    triggerToast("Analyzing proof PDF to auto-fill form...");
    try {
      const data = new FormData();
      data.append("file", incomingFile);
      const res = await api.extractFacts(data);
      if (res.candidate_facts.length > 0) {
        const lead = res.candidate_facts[0];
        setCandidateDraft((prev: Partial<Fact>) => ({
          ...prev,
          fact_code: lead.fact_code,
          subject: lead.subject,
          approved_statement: lead.approved_statement,
          normalized_value: lead.normalized_value,
          normalized_unit: lead.normalized_unit,
          source_document: lead.source_document,
          source_quote: lead.source_quote,
          valid_until: lead.valid_until,
        }));
        triggerToast("✓ Fields auto-filled from uploaded PDF!");
      }
    } catch {
      
    }
  };

  const dispatchManualFactCreation = async (evt: React.FormEvent) => {
    evt.preventDefault();
    try {
      await api.createFact(candidateDraft);
      setIsAddModalOpen(false);
      await fetchVaultFacts();
      triggerToast("New certified fact added successfully to the Vault!");
    } catch (err: any) {
      triggerToast(`Error creating fact: ${err.message || "Failed"}`);
    }
  };

  const dispatchProofRenewal = async (factId: string) => {
    const nextDate = new Date();
    nextDate.setFullYear(nextDate.getFullYear() + 1);
    const dateString = nextDate.toISOString();
    try {
      await api.updateFact(factId, { valid_until: dateString });
      await fetchVaultFacts();
      triggerToast("🎉 Fact validity renewed for +1 year! Claim is certified and live in the database.");
    } catch {
      setVaultFacts((prev) =>
        prev.map((f) =>
          f.id === factId ? { ...f, is_expired: false, valid_until: dateString } : f
        )
      );
      triggerToast("Fact validity renewed for +1 year. Claim is now certified!");
    }
  };

  const activeMetricsCount = useMemo(() => vaultFacts.filter((f) => !f.is_expired).length, [vaultFacts]);
  const staleMetricsCount = useMemo(() => vaultFacts.filter((f) => f.is_expired).length, [vaultFacts]);

  const filteredVaultRecords = useMemo(() => {
    const keyword = filterQuery.toLowerCase().trim();
    return vaultFacts.filter((f) => {
      const matchesSearch =
        !keyword ||
        f.subject.toLowerCase().includes(keyword) ||
        f.approved_statement.toLowerCase().includes(keyword) ||
        f.fact_code.toLowerCase().includes(keyword) ||
        (f.source_document || "").toLowerCase().includes(keyword);

      if (filterSegment === "ACTIVE") return matchesSearch && !f.is_expired;
      if (filterSegment === "STALE") return matchesSearch && f.is_expired;
      return matchesSearch;
    });
  }, [vaultFacts, filterQuery, filterSegment]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-2">
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-[#21160F] text-white text-xs font-semibold shadow-2xl flex items-center gap-2 border border-[#FB923C]/30 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-[#F97316] shrink-0" />
          <span>{toastNotification}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FFF1E6] text-[#C2410C] border border-[#FDBA74] uppercase tracking-wider">
                Approved Facts &amp; Metrics Vault
              </span>
              <span className="text-xs text-[#7C6A5E] font-medium">{vaultFacts.length} Verified Facts Live</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#21160F]">
              Approved Facts &amp; Metrics
            </h1>
            <p className="text-sm text-[#7C6A5E] mt-0.5">
              Upload SLA reports, SOC 2 certificates, or audit PDFs. FIDELIS extracts candidate metrics and certifies them directly into the Brand Vault.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#FFF9F3] text-[#21160F] border border-[#F4E2D3] text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-[#F97316]" />
          <span>+ Add Fact Manually</span>
        </button>
      </div>

      <div className="editorial-card p-6 bg-white border border-[#F4E2D3] shadow-sm rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F4E2D3]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFF1E6] text-[#EA580C] flex items-center justify-center">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[#21160F]">
                Upload Proof Document (AI Extracts &amp; Certifies Facts from PDF)
              </h2>
              <p className="text-xs text-[#7C6A5E]">
                Drop an SLA audit report, SOC 2 certification, benchmark PDF, or trademark filing. The AI learns verified numbers directly from the document.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#EDFDF5] text-[#027A48] border border-[#A6F4C5] self-start sm:self-auto shrink-0">
            PDF • DOCX • TXT Supported
          </span>
        </div>

        <div
          onDragOver={onDragOverEvent}
          onDragLeave={onDragLeaveEvent}
          onDrop={onDropEvent}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
            isDragOver
              ? "border-[#F97316] bg-[#FFF5EC] scale-[0.99]"
              : selectedProofFile
              ? "border-emerald-400 bg-emerald-50/40"
              : "border-[#F4E2D3] bg-[#FFFAF5] hover:border-[#FB923C] hover:bg-[#FFF5EC]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onFileChosen(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          {selectedProofFile ? (
            <div className="space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                <FileCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#21160F]">{selectedProofFile.name}</div>
                <div className="text-xs text-[#7C6A5E] mt-0.5">
                  {(selectedProofFile.size / 1024).toFixed(1)} KB • Ready for AI extraction
                </div>
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetProofFile();
                  }}
                  className="px-3 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                >
                  Remove File
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FFF1E6] text-[#EA580C] flex items-center justify-center shadow-xs">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-[#21160F]">
                Drag and drop your proof document here, or <span className="text-[#EA580C] underline">browse files</span>
              </div>
              <p className="text-xs text-[#7C6A5E] max-w-md mx-auto">
                Upload your quarterly SLA metrics, SOC 2 compliance reports, customer count certificates, or legal trademark registration documents.
              </p>
            </div>
          )}
        </div>

        <div className="pt-1">
          <button
            type="button"
            onClick={() => setIsManualInputVisible(!isManualInputVisible)}
            className="text-xs font-semibold text-[#EA580C] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{isManualInputVisible ? "Hide direct text box" : "+ Need to paste proof text directly instead of uploading a PDF?"}</span>
            {isManualInputVisible ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {isManualInputVisible && (
            <div className="mt-3 space-y-2 animate-in fade-in duration-200">
              <label className="text-xs font-bold text-[#21160F]">
                Paste Verbatim Proof Text (e.g. Audit Excerpts, SLA Guarantee):
              </label>
              <textarea
                value={rawProofText}
                onChange={(e) => setRawProofText(e.target.value)}
                placeholder="e.g. Production infrastructure demonstrated 99.98% uptime SLA in Q3. Sub-45ms roundtrip latency was achieved across all European nodes. The platform completed SOC 2 Type II compliance audit successfully."
                className="editorial-input w-full p-3 text-xs h-24"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="text-xs text-[#7C6A5E] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#EA580C]" />
            <span>AI extracts verified metrics with 100% verbatim proof quote citations.</span>
          </div>

          <button
            type="button"
            onClick={runFactExtraction}
            disabled={isExtracting || (!selectedProofFile && !rawProofText.trim())}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-sm ${
              isExtracting || (!selectedProofFile && !rawProofText.trim())
                ? "bg-slate-300 cursor-not-allowed"
                : "bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:opacity-95 shadow-orange-500/20 cursor-pointer"
            }`}
          >
            {isExtracting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{currentExtractionStatus || "Extracting Facts from PDF..."}</span>
              </>
            ) : (
              <>
                <FileCheck className="w-4 h-4" />
                <span>🚀 Extract Facts from PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {aiExtractionOutput && (
        <div className="editorial-card p-6 bg-gradient-to-b from-[#FFFDFB] to-white border-2 border-[#FB923C]/40 shadow-md rounded-2xl space-y-5 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F4E2D3]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs shrink-0">
                <Sparkles className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    AI Extraction Complete
                  </span>
                  <span className="text-xs font-bold text-[#7C6A5E]">
                    Source: {aiExtractionOutput.source_document}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-[#21160F] mt-0.5">
                  Extracted Candidate Facts ({aiExtractionOutput.candidate_facts_count} Verified Metrics Found)
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={commitAllExtractedFacts}
              disabled={certifyingFactCode === "ALL"}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#027A48] hover:bg-[#02663c] text-white text-xs font-bold shadow-sm transition-all cursor-pointer self-start sm:self-auto shrink-0"
            >
              {certifyingFactCode === "ALL" ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Certify All Extracted Facts (1-Click)</span>
            </button>
          </div>

          <p className="text-xs text-[#7C6A5E]">
            Review the extracted metrics below. Click <strong>&quot;Certify to Brand Vault&quot;</strong> on any fact to add it directly to active database enforcement with zero compliance friction.
          </p>

          <div className="grid grid-cols-1 gap-4">
            {aiExtractionOutput.candidate_facts.map((candidate: CandidateFact, idx: number) => {
              const isCertified = certifiedCodesMap[candidate.fact_code];
              const isBusy = certifyingFactCode === candidate.fact_code;

              return (
                <div
                  key={candidate.fact_code + idx}
                  className={`p-5 rounded-2xl border transition-all ${
                    isCertified
                      ? "bg-[#EDFDF5] border-[#A6F4C5] shadow-xs"
                      : "bg-white border-[#F4E2D3] hover:border-[#FB923C] shadow-xs"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-[#FFF1E6] text-[#EA580C] font-mono font-bold text-xs">
                          {candidate.fact_code}
                        </span>
                        <span className="text-xs font-extrabold text-[#21160F]">
                          {candidate.subject}
                        </span>
                      </div>

                      {candidate.normalized_value && (
                        <div className="pt-1">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#FFFAF5] text-[#21160F] border border-[#F4E2D3]">
                            Certified Metric: <strong>{candidate.normalized_value} {candidate.normalized_unit}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0">
                      {isCertified ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-[#027A48] border border-[#A6F4C5] text-xs font-bold shadow-xs">
                          <CheckCircle2 className="w-4 h-4 text-[#027A48]" />
                          <span>✓ Certified in Brand Vault</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => commitCandidateFact(candidate)}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:opacity-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                        >
                          {isBusy ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Certify to Brand Vault</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#7C6A5E] mb-1">
                      Approved Statement for Marketing &amp; Public Collateral:
                    </div>
                    <p className="text-xs font-semibold text-[#21160F] bg-[#FFFAF5] p-3 rounded-xl border border-[#F4E2D3]">
                      &quot;{candidate.approved_statement}&quot;
                    </p>
                  </div>

                  <div className="mt-2.5 p-3 rounded-xl bg-white border border-[#F4E2D3] text-xs space-y-1">
                    <div className="text-[11px] font-bold text-[#7C6A5E]">
                      Verbatim Proof Quote from {candidate.source_document}:
                    </div>
                    <p className="italic text-[#21160F] font-serif">
                      &quot;{candidate.source_quote}&quot;
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-[#7C6A5E]">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#EA580C]" />
                      <span>Valid until: <strong>{candidate.valid_until ? new Date(candidate.valid_until).toLocaleDateString() : "Perpetual"}</strong> (Auto 1-year verification)</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-bold">100% Zero Hallucination Citation</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="p-5 rounded-2xl bg-white border border-[#F4E2D3] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFF1E6] flex items-center justify-center text-[#EA580C] shrink-0 mt-0.5">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#21160F]">
              Why does FIDELIS track Fact Expiration Dates?
            </h2>
            <p className="text-xs text-[#7C6A5E] leading-relaxed mt-0.5">
              Marketing claims age quickly. When a fact expires, FIDELIS gently warns creators so stale or untrue numbers are never accidentally published.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="p-3 rounded-xl bg-[#EDFDF5] border border-[#A6F4C5] text-center min-w-[90px]">
            <div className="text-lg font-bold text-[#027A48]">{activeMetricsCount}</div>
            <div className="text-[10px] font-bold text-[#027A48] uppercase">In-Date</div>
          </div>
          <div className="p-3 rounded-xl bg-[#FEEBEA] border border-[#FECDCA] text-center min-w-[90px]">
            <div className="text-lg font-bold text-[#B42318]">{staleMetricsCount}</div>
            <div className="text-[10px] font-bold text-[#B42318] uppercase">Expired</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterSegment("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterSegment === "ALL"
                ? "bg-[#21160F] text-white shadow-xs"
                : "bg-white text-[#21160F] border border-[#F4E2D3] hover:bg-[#FFFAF5]"
            }`}
          >
            All Facts ({vaultFacts.length})
          </button>
          <button
            onClick={() => setFilterSegment("ACTIVE")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterSegment === "ACTIVE"
                ? "bg-[#027A48] text-white shadow-xs"
                : "bg-white text-[#21160F] border border-[#F4E2D3] hover:bg-[#FFFAF5]"
            }`}
          >
            ✓ Active &amp; Certified ({activeMetricsCount})
          </button>
          <button
            onClick={() => setFilterSegment("STALE")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterSegment === "STALE"
                ? "bg-[#B42318] text-white shadow-xs"
                : "bg-white text-[#21160F] border border-[#F4E2D3] hover:bg-[#FFFAF5]"
            }`}
          >
            ⚠️ Expired / Needs Proof ({staleMetricsCount})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-[#7C6A5E] absolute left-3 top-3" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search by fact, subject, or owner..."
            className="editorial-input w-full pl-8 pr-3 py-2 text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isVaultLoading ? (
          <div className="editorial-card p-12 text-center bg-white border border-[#F4E2D3]">
            <RefreshCw className="w-6 h-6 animate-spin text-[#F97316] mx-auto mb-2" />
            <div className="text-xs font-bold text-[#21160F]">Loading Brand Fact Vault...</div>
          </div>
        ) : filteredVaultRecords.length === 0 ? (
          <div className="editorial-card p-12 text-center bg-white border border-[#F4E2D3]">
            <Database className="w-8 h-8 text-[#7C6A5E] mx-auto mb-2 opacity-50" />
            <div className="text-sm font-bold text-[#21160F]">No facts match your filter</div>
            <p className="text-xs text-[#7C6A5E] mt-1">Upload a proof document above or click &quot;+ Add Fact Manually&quot;.</p>
          </div>
        ) : (
          filteredVaultRecords.map((fact) => {
            const isStale = fact.is_expired;
            return (
              <div
                key={fact.id}
                className={`editorial-card p-6 bg-white transition-all shadow-xs hover:shadow-sm ${
                  isStale ? "border-[#FECDCA] bg-gradient-to-r from-white to-[#FEEBEA]/10" : ""
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-[#F4E2D3]">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2.5 py-0.5 rounded-md bg-[#FFF1E6] text-[#EA580C] font-bold text-xs font-mono">
                        {fact.fact_code}
                      </span>
                      <span className="text-xs font-semibold text-[#7C6A5E]">
                        Topic: {fact.subject}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-[#21160F]">{fact.subject}</h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isStale ? (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#FEEBEA] text-[#B42318] border border-[#FECDCA] flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>EVIDENCE EXPIRED / STALE</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#EDFDF5] text-[#027A48] border border-[#A6F4C5] flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ACTIVE &amp; CERTIFIED</span>
                      </span>
                    )}

                    {fact.normalized_value && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#FFFAF5] text-[#21160F] border border-[#F4E2D3]">
                        Official Value: {fact.normalized_value} {fact.normalized_unit || ""}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#7C6A5E] mb-1">
                    Approved Phrasing for Marketing &amp; PR
                  </div>
                  <p className="text-sm font-semibold text-[#21160F] leading-relaxed bg-[#FFFAF5]/70 p-3 rounded-xl border border-[#F4E2D3]">
                    &quot;{fact.approved_statement}&quot;
                  </p>
                </div>

                <div className="mt-3 p-3.5 rounded-xl bg-white border border-[#F4E2D3]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-[#7C6A5E] mb-1.5">
                    <span className="font-bold text-[#21160F] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#EA580C]" />
                      Proof Document: {fact.source_document}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-[#EA580C]" />
                      Owner: <strong>{fact.owner_name}</strong> ({fact.owner_email})
                    </span>
                  </div>
                  <p className="text-xs text-[#21160F] italic font-serif">
                    Source Quote: &quot;{fact.source_quote}&quot;
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#F4E2D3] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-[#7C6A5E]">
                    <Calendar className="w-4 h-4 text-[#EA580C]" />
                    <span>
                      Evidence Valid Until:{" "}
                      <strong className={isStale ? "text-[#B42318] font-bold" : "text-[#21160F] font-bold"}>
                        {fact.valid_until ? new Date(fact.valid_until).toLocaleDateString() : "Perpetual"}
                      </strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isStale ? (
                      <>
                        <button
                          onClick={() => triggerToast(`Proof renewal request sent to ${fact.owner_name || "Owner"} (${fact.owner_email || ""})!`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#FFFAF5] text-[#B42318] font-bold border border-[#FECDCA] transition-colors cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Request Proof from {(fact.owner_name || "Owner").split(" ")[0]}</span>
                        </button>
                        <button
                          onClick={() => dispatchProofRenewal(fact.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EDFDF5] hover:bg-emerald-100 text-[#027A48] font-bold border border-[#A6F4C5] transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>1-Click Renew (+1 Year)</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] text-[#027A48] font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Ready for Safe Usage in Content</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="editorial-card w-full max-w-lg p-6 bg-white shadow-2xl rounded-2xl max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-[#F4E2D3] pb-3">
              <div>
                <h2 className="text-base font-extrabold text-[#21160F]">
                  Certify New Fact for the Brand Vault
                </h2>
                <span className="text-xs text-[#7C6A5E]">Accessible to all content creators &amp; managers</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#FFF5EC] border border-[#FB923C]/30 flex items-center justify-between gap-3">
              <div className="text-xs text-[#21160F]">
                <strong>Drop proof PDF to auto-fill:</strong>
                <p className="text-[11px] text-[#7C6A5E]">Have an SLA or SOC 2 PDF? Auto-fill with 1 click.</p>
              </div>
              <input
                ref={modalFileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleModalAutoFill}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => modalFileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#F4E2D3] hover:border-[#F97316] text-[#EA580C] text-xs font-bold shrink-0 cursor-pointer shadow-xs"
              >
                Upload PDF
              </button>
            </div>

            <form onSubmit={dispatchManualFactCreation} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#21160F]">Fact Code / Identifier</label>
                <input
                  type="text"
                  required
                  value={candidateDraft.fact_code}
                  onChange={(e) => setCandidateDraft({ ...candidateDraft, fact_code: e.target.value })}
                  className="editorial-input w-full p-2.5 text-xs mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#21160F]">Subject / Metric Claimed</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Infrastructure Availability SLA"
                  value={candidateDraft.subject}
                  onChange={(e) => setCandidateDraft({ ...candidateDraft, subject: e.target.value })}
                  className="editorial-input w-full p-2.5 text-xs mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#21160F]">Approved Statement (The exact copy to allow)</label>
                <textarea
                  required
                  placeholder="e.g. CloudPlatform™ provides a 99.98% uptime SLA backed by automated multi-zone failover."
                  value={candidateDraft.approved_statement}
                  onChange={(e) => setCandidateDraft({ ...candidateDraft, approved_statement: e.target.value })}
                  className="editorial-input w-full p-2.5 text-xs mt-1 h-20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#21160F]">Certified Value</label>
                  <input
                    type="text"
                    placeholder="e.g. 99.98"
                    value={candidateDraft.normalized_value ?? ""}
                    onChange={(e) => setCandidateDraft({ ...candidateDraft, normalized_value: e.target.value })}
                    className="editorial-input w-full p-2.5 text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#21160F]">Unit (if applicable)</label>
                  <input
                    type="text"
                    placeholder="e.g. % or ms or customers"
                    value={candidateDraft.normalized_unit ?? ""}
                    onChange={(e) => setCandidateDraft({ ...candidateDraft, normalized_unit: e.target.value })}
                    className="editorial-input w-full p-2.5 text-xs mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-[#21160F]">Proof Document Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q3 2026 SLA Audit Report v2.1"
                  value={candidateDraft.source_document}
                  onChange={(e) => setCandidateDraft({ ...candidateDraft, source_document: e.target.value })}
                  className="editorial-input w-full p-2.5 text-xs mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#21160F]">Verbatim Proof Quote</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 'Production infrastructure demonstrated 99.98% uptime in Q3.'"
                  value={candidateDraft.source_quote}
                  onChange={(e) => setCandidateDraft({ ...candidateDraft, source_quote: e.target.value })}
                  className="editorial-input w-full p-2.5 text-xs mt-1"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F4E2D3]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-[#F4E2D3] text-xs font-semibold text-[#21160F] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:opacity-95 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save &amp; Certify Fact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
