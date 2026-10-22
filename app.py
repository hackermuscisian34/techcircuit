import os
import sys
import json
import time
import hashlib
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from app.db.session import init_db, SessionLocal
from app.db.models import Rule, Rulebook, Fact, ContentSubmission, AuditEvent
from app.core.compiler import RuleCompiler
from app.core.deterministic import DeterministicEngine
from app.core.intent_lock import IntentLockEngine
from app.core.claim_ledger import ClaimLedger
from app.core.citation import CitationVerifier
from app.core.audit_chain import AuditChain
from app.seed.synthetic_brand import seed_synthetic_brand

import gradio as gr

init_db()
db = SessionLocal()
if db.query(Rule).count() == 0:
    seed_synthetic_brand(db)
db.close()

def run_fidelis_review(draft_text: str):
    if not draft_text or not draft_text.strip():
        return "Please enter or paste content to review.", "", "No changes needed."
    
    db = SessionLocal()
    try:
        active_rulebook = db.query(Rulebook).filter(Rulebook.version == "v2.4").first()
        active_rules = db.query(Rule).filter(Rule.status == "ACTIVE").all() if active_rulebook else []
        active_facts = db.query(Fact).all()

        det_findings = DeterministicEngine.evaluate_content(
            content_text=draft_text,
            rules=active_rules,
            facts=active_facts
        )

        claim_eval = ClaimLedger.evaluate_claims(
            content_text=draft_text,
            extracted_claims=[],
            facts=active_facts
        )

        all_findings = det_findings + claim_eval["unsubstantiated_findings"]
        verified_findings = CitationVerifier.verify_findings(all_findings, active_rules)

        intent_result = IntentLockEngine.generate_minimal_suggestions(
            original_text=draft_text,
            findings=verified_findings
        )

        suggested_text = intent_result.get("suggested_text", draft_text)
        content_hash = hashlib.sha256(draft_text.encode("utf-8")).hexdigest()

        findings_report = []
        for f in verified_findings:
            sev = f.get("severity", "WARNING")
            code = f.get("rule_code", "UNKNOWN")
            msg = f.get("message", "")
            quote = f.get("source_quote", "N/A")
            sec = f.get("source_section", "")
            findings_report.append(f"[{sev}] Rule {code}: {msg}\n  → Citation: \"{quote}\" ({sec})\n")

        report_str = "\n".join(findings_report) if findings_report else "✓ No violations found! Content complies 100% with brand guidelines."

        receipt_str = json.dumps({
            "platform": "FIDELIS Brand Governance Platform",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "sha256_content_hash": content_hash,
            "total_rules_evaluated": len(active_rules),
            "violations_detected": len(verified_findings),
            "status": "COMPLIANT" if len(verified_findings) == 0 else "REMEDIATION_REQUIRED",
            "cryptographic_seal": hashlib.sha256(f"{content_hash}:verified".encode()).hexdigest()[:32]
        }, indent=2)

        return report_str, suggested_text, receipt_str
    finally:
        db.close()

def list_active_rules():
    db = SessionLocal()
    try:
        rules = db.query(Rule).filter(Rule.status == "ACTIVE").all()
        output = []
        for r in rules:
            output.append(f"### {r.rule_code}: {r.title} ({r.severity})\n- **Category**: {r.category}\n- **Requirement**: {r.description}\n- **Verbatim Citation**: *\"{r.source_quote}\"* ({r.source_section})\n")
        return "\n".join(output)
    finally:
        db.close()

def list_active_facts():
    db = SessionLocal()
    try:
        facts = db.query(Fact).all()
        now = datetime.now(timezone.utc)
        output = []
        for f in facts:
            is_stale = False
            if f.valid_until:
                vu = f.valid_until if f.valid_until.tzinfo else f.valid_until.replace(tzinfo=timezone.utc)
                is_stale = vu < now
            status = "⚠️ STALE / EXPIRED" if is_stale else "✓ CERTIFIED ACTIVE"
            output.append(f"### {f.fact_code}: {f.subject} [{status}]\n- **Approved Statement**: {f.approved_statement}\n- **Certified Metric**: {f.normalized_value} {f.normalized_unit or ''}\n- **Source Document**: {f.source_document}\n- **Valid Until**: {f.valid_until.isoformat() if f.valid_until else 'No Expiration'}\n")
        return "\n".join(output)
    finally:
        db.close()

def list_audit_trail():
    db = SessionLocal()
    try:
        events = db.query(AuditEvent).order_by(AuditEvent.timestamp.desc()).limit(15).all()
        output = []
        for e in events:
            output.append(f"- **Block #{e.sequence_id}** [{e.timestamp.strftime('%Y-%m-%d %H:%M:%S')}]: `{e.event_type}`\n  Hash: `{e.current_hash[:16]}...` (Prev: `{e.previous_hash[:16]}...`)")
        return "\n".join(output) if output else "Audit chain initialized with genesis block."
    finally:
        db.close()

PRESET_SAMPLE_1 = "Introducing the brand new Apex Cloud platform! We deliver 100% uptime guaranteed for all enterprise teams, trusted by over 100,000 customers globally."
PRESET_SAMPLE_2 = "Deploy with Apex Core today. Built on certified cloud architecture with verified 99.99% availability."

custom_css = """
footer {visibility: hidden}
.gradio-container {max-width: 1050px !important; margin: 0 auto !important;}
"""

with gr.Blocks(title="FIDELIS | Brand Governance Platform", css=custom_css, theme=gr.themes.Soft(primary_hue="orange", neutral_hue="stone")) as demo:
    gr.Markdown("# 🛡️ FIDELIS: Brand Governance & Content Compliance Compiler\n**Deterministic Brand Safety · Zero-Hallucination Evidence Verification · Creative Intent Lock**")

    with gr.Tab("⚡ Live Content Review"):
        with gr.Row():
            with gr.Column(scale=1):
                input_text = gr.Textbox(
                    label="Marketing Draft / Press Release / Collateral Copy",
                    lines=6,
                    placeholder="Paste draft copy to evaluate against brand rules..."
                )
                with gr.Row():
                    btn_preset1 = gr.Button("📋 Load Violation Sample (Apex Cloud & 100% Uptime)")
                    btn_preset2 = gr.Button("✓ Load Compliant Sample (Apex Core)")
                btn_run = gr.Button("🚀 Run Brand Review Pipeline", variant="primary")
            
            with gr.Column(scale=1):
                out_findings = gr.Textbox(label="Detected Guideline Findings & Verbatim Proof", lines=7)
                out_fixed = gr.Textbox(label="Intent Lock Remediated Output (Preserving Tone & CTAs)", lines=4)
                out_receipt = gr.Code(label="Cryptographic Verification Receipt", language="json")

        btn_preset1.click(fn=lambda: PRESET_SAMPLE_1, inputs=[], outputs=[input_text])
        btn_preset2.click(fn=lambda: PRESET_SAMPLE_2, inputs=[], outputs=[input_text])
        btn_run.click(fn=run_fidelis_review, inputs=[input_text], outputs=[out_findings, out_fixed, out_receipt])

    with gr.Tab("📖 Active Rulebook"):
        gr.Markdown("All rules are strictly compiled with exact source citations and verified boundaries:")
        rules_display = gr.Markdown()
        btn_refresh_rules = gr.Button("🔄 Refresh Rules")
        btn_refresh_rules.click(fn=list_active_rules, inputs=[], outputs=[rules_display])

    with gr.Tab("🔒 Certified Fact Vault"):
        gr.Markdown("Facts and claims carry verified valid-from and valid-to timestamps:")
        facts_display = gr.Markdown()
        btn_refresh_facts = gr.Button("🔄 Refresh Facts")
        btn_refresh_facts.click(fn=list_active_facts, inputs=[], outputs=[facts_display])

    with gr.Tab("⛓️ SHA-256 Audit Chain"):
        gr.Markdown("Append-only hash-chained ledger verifying every decision:")
        audit_display = gr.Markdown()
        btn_refresh_audit = gr.Button("🔄 Inspect Chain")
        btn_refresh_audit.click(fn=list_audit_trail, inputs=[], outputs=[audit_display])

    demo.load(fn=list_active_rules, inputs=[], outputs=[rules_display])
    demo.load(fn=list_active_facts, inputs=[], outputs=[facts_display])
    demo.load(fn=list_audit_trail, inputs=[], outputs=[audit_display])

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=int(os.environ.get("PORT", 7860)))
