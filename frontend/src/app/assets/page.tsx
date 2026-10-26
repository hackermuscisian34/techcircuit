"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Palette,
  Image as ImageIcon,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Download,
  Upload,
  Plus,
  Trash2,
  Eye,
  ShieldCheck,
  Filter,
  Search,
  Grid,
  List,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Tag,
  FileUp,
  Sliders,
  Type,
  X,
  Shield,
  Layers,
  ArrowRight,
  FileCheck,
  UserCheck,
  Lock
} from "lucide-react";
import { api, BrandAsset, BrandAssetStats } from "@/lib/api";

type CategoryFilter = "ALL" | "LOGOS" | "TYPOGRAPHY" | "COLORS" | "MARKETING" | "GUIDELINES" | "OTHER";
type StatusFilter = "ALL" | "APPROVED" | "PENDING_APPROVAL" | "REJECTED" | "ARCHIVED";
type ViewMode = "grid" | "list";
type SortOption = "newest" | "oldest" | "name_asc" | "name_desc" | "updated";

export default function BrandAssetsPage() {
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [stats, setStats] = useState<BrandAssetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  
  const [userRole, setUserRole] = useState("CREATOR");
  const [userName, setUserName] = useState("User");

  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  const [activeAsset, setActiveAsset] = useState<BrandAsset | null>(null);
  const [auditResult, setAuditResult] = useState<any | null>(null);
  const [auditingLogo, setAuditingLogo] = useState(false);

  
  const [notification, setNotification] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState<string>("LOGOS");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadUsage, setUploadUsage] = useState("");
  const [uploadVersion, setUploadVersion] = useState("1.0.0");
  const [uploading, setUploading] = useState(false);

  
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#C87539");
  const [colorRole, setColorRole] = useState("Primary");
  const [colorUsage, setColorUsage] = useState("");
  const [savingColor, setSavingColor] = useState(false);

  
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectPrompt, setShowRejectPrompt] = useState(false);

  const canApprove = ["ADMIN", "BRAND_MANAGER", "APPROVER", "AUTHORISED_REVIEWER"].includes(userRole);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(label);
    setTimeout(() => setCopiedToken(null), 2000);
    showToast(`Copied ${label} to clipboard!`);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assetsData, statsData] = await Promise.all([
        api.getAssets({
          category: selectedCategory,
          status: selectedStatus,
          search: searchQuery,
          sort: sortOption
        }),
        api.getAssetStats()
      ]);
      setAssets(assetsData);
      setStats(statsData);
    } catch (err: any) {
      console.error("Failed to load brand assets:", err);
      setError(err.message || "Failed to load brand assets from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedRole = localStorage.getItem("fidelis_user_role") || localStorage.getItem("canon_user_role");
      const storedName = localStorage.getItem("fidelis_user_name") || localStorage.getItem("canon_user_name");
      if (storedRole) setUserRole(storedRole);
      if (storedName) setUserName(storedName);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedStatus, searchQuery, sortOption]);

  
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName.trim()) {
      showToast("Please enter an asset name.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("name", uploadName.trim());
      formData.append("category", uploadCategory);
      if (uploadDesc.trim()) formData.append("description", uploadDesc.trim());
      if (uploadUsage.trim()) formData.append("intended_usage", uploadUsage.trim());
      formData.append("version", uploadVersion || "1.0.0");
      if (uploadFile) {
        formData.append("file", uploadFile);
      }

      await api.uploadAsset(formData);
      showToast("🎉 Brand asset uploaded successfully!");
      setShowUploadModal(false);
      resetUploadForm();
      loadData();
    } catch (err: any) {
      console.error("Upload failed:", err);
      showToast(`Upload failed: ${err.message || "Server error"}`);
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadName("");
    setUploadCategory("LOGOS");
    setUploadDesc("");
    setUploadUsage("");
    setUploadVersion("1.0.0");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  
  const handleColorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colorName.trim() || !colorHex.trim()) {
      showToast("Please provide both color name and hex code.");
      return;
    }

    setSavingColor(true);
    try {
      await api.addBrandColor({
        name: colorName.trim(),
        hex: colorHex.trim(),
        role: colorRole,
        intended_usage: colorUsage.trim() || undefined
      });
      showToast(`✓ Color '${colorName}' added and WCAG evaluated!`);
      setShowColorModal(false);
      setColorName("");
      setColorHex("#C87539");
      loadData();
    } catch (err: any) {
      console.error("Color save failed:", err);
      showToast(`Failed to add color: ${err.message || "Invalid hex format"}`);
    } finally {
      setSavingColor(false);
    }
  };

  
  const handleDecision = async (decision: "APPROVED" | "REJECTED") => {
    if (!activeAsset) return;
    if (decision === "REJECTED" && !rejectionReason.trim()) {
      setShowRejectPrompt(true);
      return;
    }

    try {
      const updated = await api.approveAsset(
        activeAsset.id,
        decision,
        decision === "REJECTED" ? rejectionReason.trim() : undefined
      );
      setActiveAsset(updated);
      showToast(
        decision === "APPROVED"
          ? `✓ Asset "${updated.name}" approved and certified!`
          : `Asset marked as REJECTED.`
      );
      setShowRejectPrompt(false);
      setRejectionReason("");
      loadData();
    } catch (err: any) {
      showToast(`Action failed: ${err.message || "Forbidden"}`);
    }
  };

  const handleQuickApprove = async (asset: BrandAsset, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canApprove) {
      showToast("Approval requires Approver role. Switch persona using the dropdown in the header.");
      return;
    }
    try {
      const updated = await api.approveAsset(asset.id, "APPROVED");
      showToast(`✓ "${asset.name}" approved successfully!`);
      loadData();
      if (activeAsset?.id === asset.id) {
        setActiveAsset(updated);
      }
    } catch (err: any) {
      showToast(`Approval failed: ${err.message || "Forbidden"}`);
    }
  };

  
  const handleArchive = async (assetId: string) => {
    if (!confirm("Are you sure you want to archive this asset? It will be excluded from active brand usage.")) return;
    try {
      await api.archiveAsset(assetId);
      showToast("Asset successfully archived.");
      if (activeAsset?.id === assetId) setActiveAsset(null);
      loadData();
    } catch (err: any) {
      showToast(`Archive failed: ${err.message}`);
    }
  };

  
  const handleDelete = async (assetId: string) => {
    if (!confirm("Permanently delete this brand asset? This cannot be undone.")) return;
    try {
      await api.deleteAsset(assetId);
      showToast("Asset permanently deleted.");
      if (activeAsset?.id === assetId) setActiveAsset(null);
      loadData();
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`);
    }
  };

  
  const handleRunLogoAudit = async (assetId: string) => {
    setAuditingLogo(true);
    try {
      const result = await api.auditLogoAsset(assetId);
      setAuditResult(result);
      showToast(result.is_compliant ? "✓ Logo complies with brand clearspace & aspect ratio!" : "⚠️ Visual compliance issues detected.");
    } catch (err: any) {
      showToast(`Audit failed: ${err.message}`);
    } finally {
      setAuditingLogo(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-2">
      
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-[#21160F] text-white text-xs font-semibold shadow-2xl flex items-center gap-2 border border-[#FB923C]/30 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-[#F97316] shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FFF1E6] text-[#C2410C] border border-[#FDBA74] uppercase tracking-wider">
                Brand Asset Vault
              </span>
              <span className="text-xs text-[#7C6A5E] font-medium">Brand Governance Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#21160F]">
              Brand Assets
            </h1>
            <p className="text-sm text-[#7C6A5E] mt-0.5">
              Manage your brand identity, approved assets, and visual standards.
            </p>
          </div>
        </div>

        
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#F4E2D3] shadow-2xs">
            <UserCheck className="w-4 h-4 text-[#EA580C] shrink-0" />
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-bold text-[#7C6A5E] uppercase tracking-wider leading-none">Signed In As</span>
              <span className="text-xs font-bold text-[#21160F] py-0.5">
                {userName} <span className="text-[#D95D0D]">({userRole.replace("_", " ")})</span>
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowColorModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#FFFAF5] text-[#21160F] border border-[#F4E2D3] text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Palette className="w-4 h-4 text-[#EA580C]" />
            <span>+ Add Brand Color</span>
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:opacity-95 text-white text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Asset</span>
          </button>
          <Link
            href="/approvals"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#FFFAF5] text-[#7C6A5E] hover:text-[#21160F] border border-[#F4E2D3] text-xs font-semibold transition-all"
          >
            <FileCheck className="w-4 h-4 text-[#027A48]" />
            <span>Approvals Queue</span>
          </Link>
          <Link
            href="/rulebook"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#FFFAF5] text-[#7C6A5E] hover:text-[#21160F] border border-[#F4E2D3] text-xs font-semibold transition-all"
          >
            <FileText className="w-4 h-4" />
            <span>Brand Rules</span>
          </Link>
        </div>
      </div>

      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="editorial-card p-5 bg-white border border-[#F4E2D3] shadow-xs rounded-2xl">
          <div className="flex items-center justify-between text-[#7C6A5E] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Assets</span>
            <Layers className="w-4 h-4 text-[#EA580C]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#21160F]">
            {stats ? stats.total_assets : "—"}
          </div>
          <p className="text-[11px] text-[#7C6A5E] mt-1">Across all workspace categories</p>
        </div>

        <div className="editorial-card p-5 bg-white border border-[#A6F4C5] shadow-xs rounded-2xl bg-gradient-to-br from-white to-[#EDFDF5]/40">
          <div className="flex items-center justify-between text-[#027A48] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Approved</span>
            <CheckCircle2 className="w-4 h-4 text-[#027A48]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#027A48]">
            {stats ? stats.approved_assets : "—"}
          </div>
          <p className="text-[11px] text-[#027A48] mt-1">Certified for external use</p>
        </div>

        <div className="editorial-card p-5 bg-white border border-[#FDBA74] shadow-xs rounded-2xl bg-gradient-to-br from-white to-[#FFF1E6]/40">
          <div className="flex items-center justify-between text-[#C2410C] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Review</span>
            <Clock className="w-4 h-4 text-[#EA580C]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#C2410C]">
            {stats ? stats.pending_approval : "—"}
          </div>
          <p className="text-[11px] text-[#C2410C] mt-1">Awaiting brand manager sign-off</p>
        </div>

        <div className="editorial-card p-5 bg-white border border-[#E2E8F0] shadow-xs rounded-2xl">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Archived</span>
            <Tag className="w-4 h-4 text-[#64748B]" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#64748B]">
            {stats ? stats.archived_assets : "—"}
          </div>
          <p className="text-[11px] text-[#64748B] mt-1">Excluded from active use</p>
        </div>
      </div>

      
      <div className="space-y-4">
        
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "ALL", label: "All Assets", icon: Layers },
            { id: "LOGOS", label: "Logos & Monograms", icon: ImageIcon },
            { id: "COLORS", label: "Color Palette & WCAG", icon: Palette },
            { id: "TYPOGRAPHY", label: "Typography & Fonts", icon: Type },
            { id: "MARKETING", label: "Marketing Templates", icon: Sparkles },
            { id: "GUIDELINES", label: "Guidelines & PDFs", icon: FileText },
            { id: "OTHER", label: "Other Assets", icon: Tag },
          ].map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            const count = stats?.categories_summary?.[cat.id] ?? 0;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as CategoryFilter)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? "bg-[#21160F] text-white shadow-xs"
                    : "bg-white text-[#7C6A5E] hover:text-[#21160F] border border-[#F4E2D3] hover:bg-[#FFFAF5]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-[#F97316]" : "text-[#7C6A5E]"}`} />
                <span>{cat.label}</span>
                {cat.id !== "ALL" && count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${isSelected ? "bg-white/20 text-white" : "bg-[#FFF1E6] text-[#C2410C]"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-[#F4E2D3] shadow-xs">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-[#7C6A5E] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assets by name, format, or tag..."
                className="editorial-input w-full pl-9 pr-3 py-1.5 text-xs"
              />
            </div>

            
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-[#7C6A5E]">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as StatusFilter)}
                className="editorial-input px-2.5 py-1.5 text-xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="APPROVED">✓ Approved Only</option>
                <option value="PENDING_APPROVAL">⏳ Pending Approval</option>
                <option value="REJECTED">✕ Rejected</option>
                <option value="ARCHIVED">📦 Archived</option>
              </select>
            </div>

            
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-[#7C6A5E]">Sort:</span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="editorial-input px-2.5 py-1.5 text-xs"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="name_desc">Name (Z-A)</option>
                <option value="updated">Recently Updated</option>
              </select>
            </div>
          </div>

          
          <div className="flex items-center gap-1 self-end sm:self-auto border border-[#F4E2D3] rounded-xl p-0.5 bg-[#FFFAF5]">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "grid" ? "bg-white text-[#21160F] shadow-xs" : "text-[#7C6A5E] hover:text-[#21160F]"
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "list" ? "bg-white text-[#21160F] shadow-xs" : "text-[#7C6A5E] hover:text-[#21160F]"
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      
      {loading ? (
        <div className="editorial-card p-16 text-center bg-white border border-[#F4E2D3] rounded-2xl">
          <RefreshCw className="w-7 h-7 animate-spin text-[#EA580C] mx-auto mb-3" />
          <div className="text-sm font-bold text-[#21160F]">Loading Brand Assets...</div>
          <p className="text-xs text-[#7C6A5E] mt-1">Connecting to workspace asset storage</p>
        </div>
      ) : error ? (
        <div className="editorial-card p-12 text-center bg-rose-50 border border-rose-200 rounded-2xl">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
          <div className="text-sm font-bold text-rose-900">{error}</div>
          <button
            onClick={loadData}
            className="mt-3 px-4 py-2 rounded-xl bg-white border border-rose-300 text-xs font-bold text-rose-800 hover:bg-rose-100"
          >
            Retry Loading
          </button>
        </div>
      ) : assets.length === 0 ? (
        
        <div className="editorial-card p-14 text-center bg-white border-2 border-dashed border-[#F4E2D3] rounded-2xl space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-[#FFF1E6] text-[#EA580C] flex items-center justify-center shadow-xs">
            <Palette className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-black text-[#21160F]">
              No brand assets match your criteria
            </h3>
            <p className="text-xs text-[#7C6A5E] leading-relaxed">
              {searchQuery || selectedCategory !== "ALL" || selectedStatus !== "ALL"
                ? "Try clearing your search filters to view all workspace resources."
                : "Your brand repository is ready. Upload your official vector logo, register primary brand colors, or upload brand identity guidelines."}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white text-xs font-bold shadow-xs hover:opacity-95 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload First Asset</span>
            </button>
            <button
              onClick={() => setShowColorModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#F4E2D3] text-[#21160F] text-xs font-bold hover:bg-[#FFFAF5] cursor-pointer"
            >
              <Palette className="w-4 h-4 text-[#EA580C]" />
              <span>Add Brand Color</span>
            </button>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {assets.map((asset) => {
            const isApproved = asset.status === "APPROVED";
            const isPending = asset.status === "PENDING_APPROVAL";
            const isColor = asset.category === "COLORS" && asset.metadata_json?.hex;

            return (
              <div
                key={asset.id}
                onClick={() => {
                  setActiveAsset(asset);
                  setAuditResult(null);
                }}
                className="editorial-card group bg-white border border-[#F4E2D3] hover:border-[#FB923C] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                
                <div className="relative h-44 bg-[#FFFBF7] border-b border-[#F4E2D3] flex items-center justify-center overflow-hidden p-4">
                  {isColor ? (
                    <div className="w-full h-full rounded-xl flex flex-col items-center justify-center text-white shadow-inner relative group-hover:scale-102 transition-transform" style={{ backgroundColor: asset.metadata_json.hex }}>
                      <span className="text-sm font-black font-mono drop-shadow-sm">
                        {asset.metadata_json.hex}
                      </span>
                      <span className="text-[11px] opacity-90 drop-shadow-sm">
                        {asset.metadata_json.role || "Color Token"}
                      </span>
                      {asset.metadata_json.wcag_rating && (
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold bg-black/40 text-white backdrop-blur-xs">
                          WCAG {asset.metadata_json.wcag_rating}
                        </span>
                      )}
                    </div>
                  ) : asset.file_path && (asset.file_format === "PNG" || asset.file_format === "JPG" || asset.file_format === "JPEG" || asset.file_format === "WEBP" || asset.file_format === "SVG") ? (
                    <img
                      src={api.getAssetPreviewUrl(asset.id)}
                      alt={asset.name}
                      className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105"
                      onError={(e) => {
                        
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : asset.file_format === "PDF" ? (
                    <div className="flex flex-col items-center gap-1.5 text-rose-600">
                      <FileText className="w-12 h-12" />
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 px-2 py-0.5 rounded">PDF Document</span>
                    </div>
                  ) : asset.category === "TYPOGRAPHY" ? (
                    <div className="flex flex-col items-center gap-1 text-[#21160F] p-2 text-center">
                      <span className="text-3xl font-serif font-black">Aa Bb 123</span>
                      <span className="text-xs font-semibold text-[#7C6A5E]">{asset.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-[#7C6A5E]">
                      <Tag className="w-10 h-10 text-[#EA580C]" />
                      <span className="text-xs font-bold">{asset.file_format || "SPEC"}</span>
                    </div>
                  )}

                  
                  <div className="absolute top-3 right-3">
                    {isApproved ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EDFDF5] text-[#027A48] border border-[#A6F4C5] shadow-xs flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>APPROVED</span>
                      </span>
                    ) : isPending ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FFF1E6] text-[#C2410C] border border-[#FDBA74] shadow-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>PENDING</span>
                      </span>
                    ) : asset.status === "REJECTED" ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FEEBEA] text-[#B42318] border border-[#FECDCA] shadow-xs flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        <span>REJECTED</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200">
                        ARCHIVED
                      </span>
                    )}
                  </div>

                  
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/90 text-[#21160F] border border-[#F4E2D3] shadow-xs backdrop-blur-xs">
                      {asset.category}
                    </span>
                  </div>
                </div>

                
                <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#21160F] group-hover:text-[#EA580C] transition-colors line-clamp-1">
                      {asset.name}
                    </h3>
                    <p className="text-xs text-[#7C6A5E] line-clamp-2 mt-0.5 leading-relaxed">
                      {asset.description || asset.intended_usage || "Official verified workspace asset."}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#F4E2D3] flex items-center justify-between text-[11px] text-[#7C6A5E]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-[#21160F]">{asset.file_format || "FILE"}</span>
                      {asset.file_size_bytes > 0 && (
                        <span>• {(asset.file_size_bytes / 1024).toFixed(0)} KB</span>
                      )}
                    </div>
                    <span>v{asset.version}</span>
                  </div>

                  {isPending && canApprove && (
                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        Needs Sign-Off
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleQuickApprove(asset, e)}
                        className="px-2.5 py-1 rounded-lg bg-[#027A48] hover:bg-[#02663c] text-white text-[11px] font-bold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                        title="Quick approve this asset"
                      >
                        <Check className="w-3 h-3" />
                        <span>Approve</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        
        <div className="editorial-card bg-white border border-[#F4E2D3] rounded-2xl overflow-hidden shadow-xs divide-y divide-[#F4E2D3]">
          {assets.map((asset) => {
            const isApproved = asset.status === "APPROVED";
            const isPending = asset.status === "PENDING_APPROVAL";
            const isColor = asset.category === "COLORS" && asset.metadata_json?.hex;

            return (
              <div
                key={asset.id}
                onClick={() => {
                  setActiveAsset(asset);
                  setAuditResult(null);
                }}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FFFAF5] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  
                  <div className="w-12 h-12 rounded-xl bg-[#FFFBF7] border border-[#F4E2D3] flex items-center justify-center shrink-0 overflow-hidden">
                    {isColor ? (
                      <div className="w-full h-full" style={{ backgroundColor: asset.metadata_json.hex }} />
                    ) : asset.file_path && (asset.file_format === "PNG" || asset.file_format === "SVG") ? (
                      <img src={api.getAssetPreviewUrl(asset.id)} alt={asset.name} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <Tag className="w-5 h-5 text-[#EA580C]" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-[#21160F] truncate">{asset.name}</h3>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FFF1E6] text-[#EA580C]">
                        {asset.category}
                      </span>
                    </div>
                    <p className="text-xs text-[#7C6A5E] truncate mt-0.5">
                      {asset.description || asset.intended_usage || "Verified workspace asset"}
                    </p>
                  </div>
                </div>

                
                <div className="flex items-center gap-4 shrink-0 text-xs text-[#7C6A5E]">
                  <span className="font-mono">{asset.file_format || "SPEC"}</span>
                  <span className="hidden sm:inline">v{asset.version}</span>

                  {isApproved ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#EDFDF5] text-[#027A48] border border-[#A6F4C5] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Approved</span>
                    </span>
                  ) : isPending ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#FFF1E6] text-[#C2410C] border border-[#FDBA74] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Pending</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#FEEBEA] text-[#B42318] border border-[#FECDCA]">
                      {asset.status}
                    </span>
                  )}

                  {isPending && canApprove && (
                    <button
                      type="button"
                      onClick={(e) => handleQuickApprove(asset, e)}
                      className="px-2.5 py-1 rounded-lg bg-[#027A48] hover:bg-[#02663c] text-white text-[11px] font-bold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                      title="Quick approve this asset"
                    >
                      <Check className="w-3 h-3" />
                      <span>Approve</span>
                    </button>
                  )}

                  <span className="text-[#EA580C] font-bold flex items-center gap-1">
                    Details <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="editorial-card w-full max-w-lg p-6 bg-white shadow-2xl rounded-2xl max-h-[92vh] overflow-y-auto space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#F4E2D3] pb-3">
              <div>
                <h2 className="text-base font-extrabold text-[#21160F]">
                  Upload Official Brand Asset
                </h2>
                <span className="text-xs text-[#7C6A5E]">Store securely in Brand Governance Vault</span>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              
              <div>
                <label className="text-xs font-bold text-[#21160F] block mb-1">
                  Select File (.png, .svg, .jpg, .webp, .pdf, .ttf, .woff2)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#F4E2D3] hover:border-[#F97316] rounded-xl p-5 text-center cursor-pointer bg-[#FFFAF5] transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".png,.svg,.jpg,.jpeg,.webp,.pdf,.docx,.txt,.ttf,.woff,.woff2"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const f = e.target.files[0];
                        setUploadFile(f);
                        if (!uploadName) {
                          setUploadName(f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
                        }
                      }
                    }}
                    className="hidden"
                  />
                  {uploadFile ? (
                    <div className="space-y-1">
                      <FileCheck className="w-6 h-6 text-emerald-600 mx-auto" />
                      <div className="text-xs font-bold text-[#21160F]">{uploadFile.name}</div>
                      <div className="text-[11px] text-[#7C6A5E]">
                        {(uploadFile.size / 1024).toFixed(1)} KB • Ready
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-6 h-6 text-[#EA580C] mx-auto" />
                      <div className="text-xs font-bold text-[#21160F]">
                        Click to browse or drag file here
                      </div>
                      <div className="text-[11px] text-[#7C6A5E]">Up to 25MB</div>
                    </div>
                  )}
                </div>
              </div>

              
              <div>
                <label className="text-xs font-bold text-[#21160F]">Asset Name</label>
                <input
                  type="text"
                  required
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="e.g. Primary Horizontal Vector Logo"
                  className="editorial-input w-full p-2.5 text-xs mt-1"
                />
              </div>

              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#21160F]">Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="editorial-input w-full p-2.5 text-xs mt-1"
                  >
                    <option value="LOGOS">Logos &amp; Monograms</option>
                    <option value="TYPOGRAPHY">Typography &amp; Fonts</option>
                    <option value="MARKETING">Marketing &amp; Graphics</option>
                    <option value="GUIDELINES">Guidelines &amp; PDFs</option>
                    <option value="OTHER">Other Resources</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#21160F]">Version</label>
                  <input
                    type="text"
                    value={uploadVersion}
                    onChange={(e) => setUploadVersion(e.target.value)}
                    placeholder="1.0.0"
                    className="editorial-input w-full p-2.5 text-xs mt-1"
                  />
                </div>
              </div>

              
              <div>
                <label className="text-xs font-bold text-[#21160F]">Description &amp; Context</label>
                <textarea
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  placeholder="Official vector lockup for dark backgrounds with certified clearspace."
                  className="editorial-input w-full p-2.5 text-xs mt-1 h-18"
                />
              </div>

              
              <div>
                <label className="text-xs font-bold text-[#21160F]">Intended Usage Guidance</label>
                <input
                  type="text"
                  value={uploadUsage}
                  onChange={(e) => setUploadUsage(e.target.value)}
                  placeholder="e.g. Dark backgrounds, digital websites, 4:1 aspect ratio"
                  className="editorial-input w-full p-2.5 text-xs mt-1"
                />
              </div>

              
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F4E2D3]">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-[#F4E2D3] text-xs font-semibold text-[#21160F] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white text-xs font-bold shadow-xs hover:opacity-95 cursor-pointer disabled:opacity-50"
                >
                  {uploading ? "Saving..." : "Save Brand Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      
      {showColorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="editorial-card w-full max-w-md p-6 bg-white shadow-2xl rounded-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#F4E2D3] pb-3">
              <div>
                <h2 className="text-base font-extrabold text-[#21160F]">
                  Add Brand Color Token
                </h2>
                <span className="text-xs text-[#7C6A5E]">Automatic WCAG contrast calculation</span>
              </div>
              <button
                type="button"
                onClick={() => setShowColorModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleColorSubmit} className="space-y-3.5">
              
              <div className="p-4 rounded-xl text-center text-white font-mono font-bold shadow-inner flex flex-col items-center justify-center gap-1 transition-colors" style={{ backgroundColor: colorHex }}>
                <span className="text-lg drop-shadow">{colorHex.toUpperCase()}</span>
                <span className="text-xs opacity-90 drop-shadow">{colorRole} Role</span>
              </div>

              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#21160F]">Color Name</label>
                  <input
                    type="text"
                    required
                    value={colorName}
                    onChange={(e) => setColorName(e.target.value)}
                    placeholder="e.g. Brand Terracotta"
                    className="editorial-input w-full p-2.5 text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#21160F]">HEX Code</label>
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="color"
                      value={colorHex.startsWith("#") ? colorHex : "#C87539"}
                      onChange={(e) => setColorHex(e.target.value.toUpperCase())}
                      className="w-8 h-8 rounded cursor-pointer border border-[#F4E2D3] p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      required
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value.toUpperCase())}
                      className="editorial-input flex-1 p-2 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              
              <div>
                <label className="text-xs font-bold text-[#21160F]">Semantic Role</label>
                <select
                  value={colorRole}
                  onChange={(e) => setColorRole(e.target.value)}
                  className="editorial-input w-full p-2.5 text-xs mt-1"
                >
                  <option value="Primary">Primary (Main brand identity)</option>
                  <option value="Secondary">Secondary (Accent &amp; highlights)</option>
                  <option value="Accent">Accent (CTAs &amp; buttons)</option>
                  <option value="Background">Background Canvas</option>
                  <option value="Text">Typography &amp; Headings</option>
                </select>
              </div>

              
              <div>
                <label className="text-xs font-bold text-[#21160F]">Usage Guidance</label>
                <input
                  type="text"
                  value={colorUsage}
                  onChange={(e) => setColorUsage(e.target.value)}
                  placeholder="e.g. Card containers, primary CTA buttons"
                  className="editorial-input w-full p-2.5 text-xs mt-1"
                />
              </div>

              
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F4E2D3]">
                <button
                  type="button"
                  onClick={() => setShowColorModal(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-[#F4E2D3] text-xs font-semibold text-[#21160F] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingColor}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white text-xs font-bold shadow-xs hover:opacity-95 cursor-pointer disabled:opacity-50"
                >
                  {savingColor ? "Evaluating..." : "Save Brand Color"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      
      {activeAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="editorial-card w-full max-w-2xl p-6 bg-white shadow-2xl rounded-2xl max-h-[92vh] overflow-y-auto space-y-5 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-start justify-between border-b border-[#F4E2D3] pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#FFF1E6] text-[#EA580C]">
                    {activeAsset.category}
                  </span>
                  <span className="text-xs text-[#7C6A5E]">Version {activeAsset.version}</span>
                  {activeAsset.status === "APPROVED" ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EDFDF5] text-[#027A48] border border-[#A6F4C5]">
                      ✓ APPROVED
                    </span>
                  ) : activeAsset.status === "PENDING_APPROVAL" ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FFF1E6] text-[#C2410C] border border-[#FDBA74]">
                      ⏳ PENDING APPROVAL
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FEEBEA] text-[#B42318] border border-[#FECDCA]">
                      {activeAsset.status}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-black text-[#21160F]">{activeAsset.name}</h2>
              </div>

              <button
                type="button"
                onClick={() => setActiveAsset(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            
            <div className="rounded-2xl border border-[#F4E2D3] p-6 bg-[#FFFBF7] flex items-center justify-center min-h-[220px]">
              {activeAsset.category === "COLORS" && activeAsset.metadata_json?.hex ? (
                <div className="w-full max-w-sm p-6 rounded-2xl text-white shadow-lg space-y-2 text-center" style={{ backgroundColor: activeAsset.metadata_json.hex }}>
                  <div className="text-2xl font-black font-mono">{activeAsset.metadata_json.hex}</div>
                  <div className="text-xs opacity-90">{activeAsset.metadata_json.rgb}</div>
                  <div className="pt-2 flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(activeAsset.metadata_json.hex, "HEX")}
                      className="px-3 py-1 rounded-lg bg-black/30 hover:bg-black/50 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Copy HEX
                    </button>
                  </div>
                </div>
              ) : activeAsset.file_path && (activeAsset.file_format === "PNG" || activeAsset.file_format === "JPG" || activeAsset.file_format === "JPEG" || activeAsset.file_format === "WEBP" || activeAsset.file_format === "SVG") ? (
                <div className="space-y-3 text-center">
                  <img
                    src={api.getAssetPreviewUrl(activeAsset.id)}
                    alt={activeAsset.name}
                    className="max-h-56 max-w-full object-contain mx-auto shadow-xs rounded-lg"
                  />
                  {activeAsset.category === "LOGOS" && (
                    <button
                      type="button"
                      onClick={() => handleRunLogoAudit(activeAsset.id)}
                      disabled={auditingLogo}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-[#F4E2D3] hover:border-[#F97316] text-[#EA580C] text-xs font-bold shadow-xs cursor-pointer"
                    >
                      {auditingLogo ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      <span>Run Visual Clearspace Audit</span>
                    </button>
                  )}
                </div>
              ) : activeAsset.file_format === "PDF" ? (
                <div className="text-center space-y-2">
                  <FileText className="w-16 h-16 text-rose-600 mx-auto" />
                  <div className="text-sm font-bold text-[#21160F]">{activeAsset.file_name}</div>
                  <a
                    href={api.getAssetDownloadUrl(activeAsset.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#EA580C] underline"
                  >
                    Open PDF in new tab <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : (
                <div className="text-center space-y-1">
                  <Tag className="w-12 h-12 text-[#EA580C] mx-auto" />
                  <div className="text-sm font-bold text-[#21160F]">{activeAsset.name}</div>
                  <div className="text-xs text-[#7C6A5E]">{activeAsset.file_format} specification</div>
                </div>
              )}
            </div>

            
            {auditResult && (
              <div className={`p-4 rounded-xl border ${auditResult.is_compliant ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-amber-50 border-amber-200 text-amber-900"} space-y-2`}>
                <div className="flex items-center gap-2 font-bold text-xs">
                  {auditResult.is_compliant ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
                  <span>Visual Brand Audit Verdict: {auditResult.is_compliant ? "PASSED COMPLIANCE" : "VIOLATION DETECTED"}</span>
                </div>
                <div className="text-xs space-y-1">
                  <div>Aspect Ratio: <strong>{auditResult.aspect_ratio}:1</strong> (Dimensions: {auditResult.width}x{auditResult.height}px)</div>
                  {auditResult.visual_findings.map((f: any, i: number) => (
                    <div key={i} className="text-rose-700 font-semibold">• [{f.rule_code}] {f.explanation}</div>
                  ))}
                </div>
              </div>
            )}

            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-[#FFFAF5] p-4 rounded-xl border border-[#F4E2D3]">
              <div>
                <span className="text-[#7C6A5E] block">Format &amp; Size</span>
                <span className="font-bold text-[#21160F]">
                  {activeAsset.file_format || "SPEC"}{" "}
                  {activeAsset.file_size_bytes > 0 && `(${(activeAsset.file_size_bytes / 1024).toFixed(0)} KB)`}
                </span>
              </div>
              <div>
                <span className="text-[#7C6A5E] block">Uploaded By</span>
                <span className="font-bold text-[#21160F]">{activeAsset.uploader_name || "Creator"}</span>
              </div>
              <div>
                <span className="text-[#7C6A5E] block">Date Added</span>
                <span className="font-bold text-[#21160F]">{new Date(activeAsset.created_at).toLocaleDateString()}</span>
              </div>

              {activeAsset.intended_usage && (
                <div className="col-span-2 sm:col-span-3 pt-2 border-t border-[#F4E2D3]">
                  <span className="text-[#7C6A5E] block font-bold">Approved Intended Usage:</span>
                  <p className="text-[#21160F] mt-0.5">{activeAsset.intended_usage}</p>
                </div>
              )}

              {activeAsset.rejection_reason && (
                <div className="col-span-2 sm:col-span-3 pt-2 border-t border-rose-200 text-rose-800">
                  <span className="font-bold block">Rejection Feedback:</span>
                  <p className="mt-0.5">{activeAsset.rejection_reason}</p>
                </div>
              )}
            </div>

            
            {showRejectPrompt && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2 animate-in fade-in">
                <label className="text-xs font-bold text-rose-900">
                  Provide Rejection Reason for Creator:
                </label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Logo padding violates LOGO-01 isolation clearspace."
                  className="editorial-input w-full p-2 text-xs"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectPrompt(false)}
                    className="px-3 py-1 text-xs text-slate-600 hover:underline"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision("REJECTED")}
                    className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            )}

            
            {activeAsset.status === "APPROVED" && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7] border border-[#86EFAC] space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#027A48]" />
                    <span className="text-xs font-black text-[#027A48] uppercase tracking-wider">
                      Official Brand Compliance Certified
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-[#027A48] px-2 py-0.5 rounded-full bg-white border border-[#A6F4C5] shadow-2xs font-mono">
                    {activeAsset.metadata_json?.receipt_id || `RCPT-ASSET-${activeAsset.id.substring(0, 8).toUpperCase()}`}
                  </span>
                </div>
                <div className="text-[11px] text-[#054E29] grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-[#A6F4C5]/60">
                  <div>
                    <span className="text-[#027A48] opacity-80 block text-[10px] font-bold uppercase">Certified Approver:</span>
                    <strong className="text-[#054E29]">{activeAsset.approved_by_name || "Biju (Executive Approver)"}</strong>
                  </div>
                  <div>
                    <span className="text-[#027A48] opacity-80 block text-[10px] font-bold uppercase">Timestamp:</span>
                    <strong className="text-[#054E29]">
                      {activeAsset.approved_at ? new Date(activeAsset.approved_at).toLocaleString() : new Date().toLocaleString()}
                    </strong>
                  </div>
                  {activeAsset.metadata_json?.approval_hash && (
                    <div className="col-span-1 sm:col-span-2 pt-1">
                      <span className="text-[#027A48] opacity-80 block text-[10px] font-bold uppercase">Cryptographic Content SHA-256:</span>
                      <span className="font-mono text-[10px] text-[#027A48] bg-white/70 px-2 py-0.5 rounded border border-[#A6F4C5] inline-block break-all">
                        {activeAsset.metadata_json.approval_hash}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            
            {!canApprove && activeAsset.status === "PENDING_APPROVAL" && (
              <div className="p-3.5 rounded-xl bg-[#FFF9F3] border border-[#FDBA74] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-[#D95D0D] shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-[#21160F]">Approval Authority Required</div>
                    <div className="text-[11px] text-[#7C6A5E]">
                      Current session: <strong className="text-[#21160F]">{userName} ({userRole.replace("_", " ")})</strong>. Governance rules require sign-off from an Approver, Brand Manager, or Admin.
                    </div>
                  </div>
                </div>
              </div>
            )}

            
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#F4E2D3]">
              <div className="flex items-center gap-2">
                {activeAsset.file_path && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        showToast(`Downloading ${activeAsset.file_name || activeAsset.name}...`);
                        await api.downloadAssetFile(activeAsset.id, activeAsset.file_name);
                      } catch (err: any) {
                        window.open(api.getAssetDownloadUrl(activeAsset.id), "_blank");
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#F4E2D3] hover:border-[#F97316] text-[#21160F] text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#EA580C]" />
                    <span>Download File</span>
                  </button>
                )}
                {canApprove && (
                  <button
                    type="button"
                    onClick={() => handleDelete(activeAsset.id)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>

              
              <div className="flex items-center gap-2">
                {canApprove && activeAsset.status !== "APPROVED" && (
                  <button
                    type="button"
                    onClick={() => handleDecision("APPROVED")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#027A48] hover:bg-[#02663c] text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve Asset</span>
                  </button>
                )}
                {canApprove && activeAsset.status !== "REJECTED" && (
                  <button
                    type="button"
                    onClick={() => handleDecision("REJECTED")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold shadow-xs cursor-pointer transition-all"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
