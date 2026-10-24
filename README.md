---
title: FIDELIS Brand Governance Platform
emoji: 🛡️
colorFrom: yellow
colorTo: red
sdk: gradio
sdk_version: 4.44.0
app_file: gradio_app.py
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
- **Open-Source Model Flexibility (Cloud & Local)**: Powered by pre-trained open-weight **Qwen 2.5** (`Qwen/Qwen2.5-7B-Instruct` / `Qwen/Qwen2.5-1.5B-Instruct`). Deployable anywhere via **Hugging Face Serverless or Dedicated Regional APIs** (Render, Vercel) or air-gapped locally via **Ollama**.

---

## Pre-Trained Open-Source LLM Configuration

CANON supports both cloud deployments and local PC inference with automatic failover:

| Mode | Provider | Model | Typical Target | Environment Variables |
| :--- | :--- | :--- | :--- | :--- |
| **Cloud Serverless (Recommended)** | Hugging Face Inference API | `Qwen/Qwen2.5-7B-Instruct` | Render & Vercel | `LLM_PROVIDER=huggingface`, `HF_TOKEN=hf_...`, `HF_MODEL=Qwen/Qwen2.5-7B-Instruct`, `HF_REGION=auto` |
| **Regional Pinned** | Hugging Face Dedicated Endpoint | `Qwen/Qwen2.5-7B-Instruct` | Render (e.g. `us-east-1`, `eu-west-1`) | `HF_ENDPOINT_URL=https://...endpoints.huggingface.cloud/v1`, `HF_REGION=us-east-1` |
| **Air-Gapped Local** | Ollama Daemon | `qwen2.5:1.5b` | Local PC / Dev | `LLM_PROVIDER=ollama`, `OLLAMA_BASE_URL=http://localhost:11434` |
| **Automated Auto-Detect** | Hybrid | Qwen 2.5 | Any | `LLM_PROVIDER=auto` (Uses HF if token provided, falls back to Ollama or Heuristic) |

---

## Deployment Guide (Render + Vercel)

### 1. Deploy Backend to Render
1. Push this repository to GitHub.
2. Log in to [Render](https://render.com) and click **New + > Blueprint** (or Web Service).
3. Connect your repository. Render will automatically detect `render.yaml`.
4. In the Render Dashboard environment settings for `canon-backend`:
   - Set `HF_TOKEN` = `hf_...` (your Hugging Face user access token with read permissions).
   - (Optional) Set `HF_REGION` = `us-east-1` or `eu-west-1` if pinning to a specific region.
   - (Optional) Set `HF_MODEL` = `Qwen/Qwen2.5-7B-Instruct` (default) or `Qwen/Qwen2.5-72B-Instruct`.
5. Deploy! Your backend URL will be: `https://<your-service>.onrender.com`.

### 2. Deploy Frontend to Vercel
1. Log in to [Vercel](https://vercel.com) and click **Add New Project**.
2. Select your repository.
3. In Project Settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Next.js
4. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL` = `https://<your-service>.onrender.com/api/v1`
5. Click **Deploy**. Your Vercel frontend is live!

---

## Commands to Run Locally

### Prerequisites
- **Node.js**: v20+ and npm
- **Python**: v3.12+ (tested on Python 3.14)
- **Hugging Face Token**: (Optional for cloud Qwen 2.5: `export HF_TOKEN="hf_..."`)
- **Ollama**: (Optional for local PC inference: `ollama run qwen2.5:1.5b`)

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
The Server Connection History feature maintains a detailed log of previous SSH sessions, including server IP addresses, connection timestamps, executed commands, execution status, and error messages. It allows users to review past activities, troubleshoot connection issues, track command execution, and export logs for auditing. This feature improves transparency, simplifies debugging, and makes managing multiple servers more efficient and secure.
