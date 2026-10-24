import os
import hashlib
from datetime import datetime, timezone
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "test files")
os.makedirs(OUTPUT_DIR, exist_ok=True)
CERT_ID = "RCPT-AURORA-2026-001"
DOC_TITLE = "Aurora Compliant Campaign Draft"
RULEBOOK = "Aurora Labs Brand Guidelines (v1.1.0)"
APPROVER = "Biju (Executive Approver • usr-approver-01)"
ISSUED_DATE = "2026-10-23T22:35:00Z"
SHA256_HASH = "d5185af58c2a98715f337e23b70e39def182e3bc3415ae42541cbaae012766f5"

BODY_PARAGRAPHS = [
    "Meet Aurora Desk: The modern team workspace designed for seamless project coordination and structured team collaboration.",
    "Sign in to your team workspace today. In internal usability evaluations, 24 participants completed the initial onboarding walkthrough in under 10 minutes (UX-24 report).",
    "The standard plan costs $12 per user per month when billed monthly. Experience transparent pricing with verified infrastructure.",
    "Aurora Labs currently has 18 team members dedicated to high-reliability software. Explore our documentation and customer onboarding guide to get started."
]

VERIFIED_FACTS = [
    ("FACT-001", "Aurora Desk supports team workspaces", "CERTIFIED • Valid through 2027-06-30"),
    ("FACT-002", "$12 per user per month when billed monthly", "CERTIFIED • Valid through 2026-12-31"),
    ("FACT-003", "24 participants onboarding walkthrough in under 10 minutes", "CERTIFIED • Valid through 2027-01-31"),
    ("FACT-005", "Aurora Labs has 18 team members", "CERTIFIED • Valid through 2026-11-30")
]

def generate_certificate_txt():
    txt_path = os.path.join(OUTPUT_DIR, "09_Aurora_Tamper_Proof_Certificate.txt")
    lines = [
        "==================================================================================",
        "          FIDELIS / CANON — OFFICIAL BRAND GOVERNANCE CERTIFICATE",
        "                CRYPTOGRAPHIC TAMPER-PROOF ATTESTATION v1.0",
        "==================================================================================",
        "",
        f"  Certificate ID        : {CERT_ID}",
        f"  Attestation Standard  : FIDELIS / CANON Cryptographic Brand Governance v1.0",
        f"  Timestamp Issued      : {ISSUED_DATE}",
        f"  Workspace Authority   : Aurora Labs Governance (ws-aurora-001)",
        "",
        "----------------------------------------------------------------------------------",
        "  CERTIFIED DOCUMENT DETAILS",
        "----------------------------------------------------------------------------------",
        f"  Document Title        : {DOC_TITLE}",
        f"  Source Format         : Marketing Copy / Distribution Collateral",
        f"  Character Count       : 575 characters",
        f"  Cryptographic Hash    : {SHA256_HASH} (SHA-256)",
        f"  Compliance Verdict    : APPROVED FOR PUBLIC DISTRIBUTION",
        f"  Governance Rulebook   : {RULEBOOK}",
        f"  Blocking Violations   : 0 (Zero Tolerance Passed)",
        f"  Advisory Notes        : 0",
        "",
        "----------------------------------------------------------------------------------",
        "  VERIFIED BRAND VAULT CITATIONS (CLAIMS LEDGER)",
        "----------------------------------------------------------------------------------",
    ]
    for code, claim, status in VERIFIED_FACTS:
        lines.append(f"  • [{code}] {claim}")
        lines.append(f"    Verification: {status}")
    lines.extend([
        "",
        "----------------------------------------------------------------------------------",
        "  EXECUTIVE HUMAN SIGN-OFF",
        "----------------------------------------------------------------------------------",
        f"  Approver ID           : usr-approver-01",
        f"  Approver Name         : {APPROVER}",
        f"  Decision Status       : APPROVED",
        f"  Cryptographic Seal    : Block #8 in HMAC-SHA256 Immutable Audit Ledger",
        f"  Chain Link Previous   : 2ea16c9e0d16c52a7837016d84950275d314811a2f646eef88ad4a2f8c5b81a1",
        f"  Chain Link Current    : b47df83c92176b509ef1df5d43eec4b36015cae6f8ad689531ca1188319fbb1c",
        f"  Tamper Detection State: PASSED — 100% Tamper-Proof Cryptographic Non-Repudiation",
        "",
        "==================================================================================",
        "  VERIFICATION NOTICE: This certificate verifies that the associated document body",
        "  was evaluated against certified company rules and signed off by authorized",
        "  executive leadership. Any alteration of the document content invalidates",
        "  the cryptographic SHA-256 digest and breaches brand governance compliance.",
        "==================================================================================",
        "                       [END OF OFFICIAL CERTIFICATE]"
    ])
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"Generated: {txt_path}")

def generate_certified_pdf():
    pdf_path = os.path.join(OUTPUT_DIR, "09_Aurora_Compliant_Campaign_Draft_CERTIFIED.pdf")
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        rightMargin=45,
        leftMargin=45,
        topMargin=40,
        bottomMargin=40
    )
    styles = getSampleStyleSheet()

    header_style = ParagraphStyle(
        'CertHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#C87539'),
        alignment=1
    )
    sub_header_style = ParagraphStyle(
        'CertSubHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#027A48'),
        alignment=1
    )
    meta_key_style = ParagraphStyle(
        'MetaKey',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#7C6A5E')
    )
    meta_val_style = ParagraphStyle(
        'MetaVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#201815')
    )
    body_style = ParagraphStyle(
        'BodyCopy',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10.5,
        leading=16,
        textColor=colors.HexColor('#201815')
    )
    section_title = ParagraphStyle(
        'SecTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=colors.HexColor('#201815')
    )
    footer_style = ParagraphStyle(
        'FooterNotice',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#7C6A5E'),
        alignment=1
    )

    story = []

    # Title & Golden Seal Header
    story.append(Paragraph("FIDELIS / CANON BRAND GOVERNANCE", header_style))
    story.append(Paragraph("OFFICIAL TAMPER-PROOF CERTIFIED DOCUMENT", sub_header_style))
    story.append(Spacer(1, 10))

    # Meta Table Box
    meta_data = [
        [Paragraph("Certificate ID:", meta_key_style), Paragraph(CERT_ID, meta_val_style),
         Paragraph("Governance Status:", meta_key_style), Paragraph("APPROVED (Zero Blocking Flags)", meta_val_style)],
        [Paragraph("Document Title:", meta_key_style), Paragraph(DOC_TITLE, meta_val_style),
         Paragraph("Approver:", meta_key_style), Paragraph(APPROVER, meta_val_style)],
        [Paragraph("SHA-256 Digest:", meta_key_style), Paragraph(f"<code>{SHA256_HASH[:32]}...</code>", meta_val_style),
         Paragraph("Ledger Block:", meta_key_style), Paragraph("#8 (HMAC-SHA256 Sealed)", meta_val_style)],
        [Paragraph("Active Rulebook:", meta_key_style), Paragraph(RULEBOOK, meta_val_style),
         Paragraph("Attestation Date:", meta_key_style), Paragraph(ISSUED_DATE, meta_val_style)]
    ]
    t = Table(meta_data, colWidths=[105, 155, 110, 150])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FFF9F3')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#F4E2D3')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#F4E2D3')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t)
    story.append(Spacer(1, 15))

    # Approved Document Section
    story.append(Paragraph(f"Certified Content: {DOC_TITLE}", section_title))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#C87539'), spaceAfter=12))

    for p in BODY_PARAGRAPHS:
        story.append(Paragraph(p, body_style))
        story.append(Spacer(1, 8))

    story.append(Spacer(1, 10))
    story.append(Paragraph("Verified Evidence Citations (Brand Vault)", section_title))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#C87539'), spaceAfter=8))

    citations_data = [
        [Paragraph("Fact Code", meta_key_style), Paragraph("Approved Statement", meta_key_style), Paragraph("Status", meta_key_style)]
    ]
    for code, claim, status in VERIFIED_FACTS:
        citations_data.append([
            Paragraph(code, meta_val_style),
            Paragraph(claim, meta_val_style),
            Paragraph(f"<font color='#027A48'><b>{status}</b></font>", meta_val_style)
        ])
    ct = Table(citations_data, colWidths=[70, 310, 140])
    ct.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#FFF0E2')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#F4E2D3')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#F4E2D3')),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(ct)

    story.append(Spacer(1, 18))
    story.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor('#D95D0D'), spaceAfter=8))
    story.append(Paragraph(
        f"SECURITY NOTICE: This document is cryptographically sealed with SHA-256 checksum {SHA256_HASH}. "
        "Any modification invalidates this certification in the FIDELIS immutable audit ledger.",
        footer_style
    ))

    doc.build(story)
    print(f"Generated: {pdf_path}")

def generate_certified_docx():
    docx_path = os.path.join(OUTPUT_DIR, "09_Aurora_Compliant_Campaign_Draft_CERTIFIED.docx")
    doc = Document()

    # Title
    p_title = doc.add_paragraph()
    run_title = p_title.add_run("FIDELIS / CANON BRAND GOVERNANCE")
    run_title.font.name = "Calibri"
    run_title.font.size = Pt(16)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(200, 117, 57)
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER

    p_sub = doc.add_paragraph()
    run_sub = p_sub.add_run("OFFICIAL TAMPER-PROOF CERTIFIED DOCUMENT")
    run_sub.font.name = "Calibri"
    run_sub.font.size = Pt(11)
    run_sub.font.bold = True
    run_sub.font.color.rgb = RGBColor(2, 122, 72)
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER

    doc.add_paragraph()

    # Meta Table
    table = doc.add_table(rows=4, cols=4)
    table.style = 'Light Shading Accent 2' if 'Light Shading Accent 2' in [s.name for s in doc.styles] else 'Table Grid'
    
    meta_rows = [
        ("Certificate ID:", CERT_ID, "Governance Status:", "APPROVED (Zero Blocking Flags)"),
        ("Document Title:", DOC_TITLE, "Approver:", APPROVER),
        ("SHA-256 Digest:", f"{SHA256_HASH[:32]}...", "Ledger Block:", "#8 (HMAC-SHA256 Sealed)"),
        ("Active Rulebook:", RULEBOOK, "Certified Date:", ISSUED_DATE)
    ]
    for row_idx, data in enumerate(meta_rows):
        row = table.rows[row_idx]
        for col_idx in range(4):
            cell = row.cells[col_idx]
            cell.text = data[col_idx]
            p = cell.paragraphs[0]
            p.runs[0].font.size = Pt(8.5)
            if col_idx in (0, 2):
                p.runs[0].font.bold = True

    doc.add_paragraph()
    h1 = doc.add_heading(f"Certified Content: {DOC_TITLE}", level=1)
    h1.runs[0].font.color.rgb = RGBColor(32, 24, 21)

    for para_text in BODY_PARAGRAPHS:
        p = doc.add_paragraph()
        run = p.add_run(para_text)
        run.font.name = "Calibri"
        run.font.size = Pt(11)
        p.paragraph_format.space_after = Pt(6)

    doc.add_paragraph()
    h2 = doc.add_heading("Verified Brand Vault Citations", level=2)
    h2.runs[0].font.color.rgb = RGBColor(32, 24, 21)

    c_table = doc.add_table(rows=1, cols=3)
    c_table.style = 'Table Grid'
    hdr_cells = c_table.rows[0].cells
    hdr_cells[0].text = "Fact Code"
    hdr_cells[1].text = "Approved Statement"
    hdr_cells[2].text = "Audit Verification"
    for c in hdr_cells:
        c.paragraphs[0].runs[0].font.bold = True
        c.paragraphs[0].runs[0].font.size = Pt(9)

    for code, claim, status in VERIFIED_FACTS:
        row = c_table.add_row()
        row.cells[0].text = code
        row.cells[1].text = claim
        row.cells[2].text = status
        for cell in row.cells:
            cell.paragraphs[0].runs[0].font.size = Pt(8.5)

    doc.add_paragraph()
    p_notice = doc.add_paragraph()
    p_notice.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_notice = p_notice.add_run(
        f"SECURITY NOTICE: This document is cryptographically sealed with SHA-256 checksum {SHA256_HASH}. "
        "Any alteration invalidates this certification in the FIDELIS immutable audit ledger."
    )
    run_notice.font.italic = True
    run_notice.font.size = Pt(8)
    run_notice.font.color.rgb = RGBColor(124, 106, 94)

    doc.save(docx_path)
    print(f"Generated: {docx_path}")

if __name__ == "__main__":
    generate_certificate_txt()
    generate_certified_pdf()
    generate_certified_docx()
