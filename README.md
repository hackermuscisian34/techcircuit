---
title: FIDELIS Brand Governance Platform
emoji: 🛡️
colorFrom: yellow
colorTo: red
sdk: gradio
sdk_version: 4.44.0
app_file: app.py
pinned: false
license: mit
---

# FIDELIS: Brand Governance Compiler & Verification Platform

FIDELIS is an open-source, deterministic brand governance compiler and content verification platform. It compiles static brand guidelines, product taxonomy specs, and trademark rules into an executable, testable rulebook—evaluating marketing copy, packaging, and digital assets against verified evidence.

---

## Overview

### Key Features
- **Deterministic Rule Enforcement**: Enforces approved product naming, clearspace padding, prohibited terminology, and trademark symbols (`®`/`™`) with exact citations.
- **No Citation, No Blocking Flag**: Guarantees zero AI hallucinations. A rule violation cannot block content unless traced directly to verified brand documentation.
- **Creative Intent Lock**: Surgically replaces only violating words, trademarks, or outdated stats without rewriting creative tone or call-to-actions.
- **Claim & Fact Ledger with Evidence Expiry**: Validates marketing claims and lab benchmarks against certified facts with automated expiration tracking.
- **Cryptographic Audit Ledger & Digital Receipts**: Generates append-only SHA-256 hash-chained audit trails and verifiable approval receipts for publications.
- **Local Data Sovereignty**: All AI inference runs locally via open-weight models (Ollama), ensuring confidential drafts and unannounced products never leave your infrastructure.

---

## Commands to Run

### Prerequisites
- **Node.js**: v20+ and npm
- **Python**: v3.12+ (tested on Python 3.14)
- **Ollama**: (Optional for local AI verification, e.g. `ollama run qwen2.5:1.5b`)

### 1. Run Backend Server
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Gateway: `http://127.0.0.1:8000`
- Interactive OpenAPI Docs: `http://127.0.0.1:8000/api/v1/docs`

### 2. Run Frontend Web App
```bash
cd frontend
npm install
npm run dev
```
- Web Application: `http://localhost:3000`

---

## Testing & Build Commands

### Run Backend Tests (56 Tests)
```bash
cd backend
.venv/bin/pytest tests/ -v
```

### Build Frontend Production Bundle
```bash
cd frontend
npm run build
```

---

## Default Testing Accounts

| Role | Name | Email | Password |
| :--- | :--- | :--- | :--- |
| **System Administrator** | Alfred Biju | `admin@fidelis.example` | `Password123!` |
| **Brand Manager** | Sebin Sabu | `manager@fidelis.example` | `Password123!` |
| **Compliance Reviewer** | Albert Biju | `reviewer@fidelis.example` | `Password123!` |
| **Content Creator** | Adhithya Biju | `creator@fidelis.example` | `Password123!` |
| **Executive Approver** | Biju | `approver@fidelis.example` | `Password123!` |

*(Full role descriptions and RBAC permissions are documented in `USER_ROLES_AND_CREDENTIALS.md`).*
