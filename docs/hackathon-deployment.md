# 🚀 5-Day Online Hackathon 24/7 Cloud Deployment Guide
**Zero VPS | Zero Cost | 100% Cloud Uptime (Laptop Off) | No Hugging Face**

---

## 1. The Perfect Zero-VPS Hosting Solution: Vercel + Render

Because your **laptop will be turned off** and you **do not have a VPS**, the industry-standard, 100% free production combination is:
- **Frontend**: **Vercel** (`https://vercel.com`) — Runs Next.js globally on Edge CDN, 24/7 uptime, 0ms cold starts, free SSL, zero server management.
- **Backend**: **Render** (`https://render.com`) — Runs FastAPI and SQLite in the cloud 24/7, auto-deploys from GitHub with zero VPS setup.
- **Open-Source AI Model**: **Groq Cloud API** (free tier Llama 3.3 70B / Qwen 2.5) + our built-in **Deterministic Rule Logic Engine** fallback (`ALLOW_MOCK_LLM_FALLBACK=true`) so the judges never experience a crash or timeout.

---

### Step-by-Step 3-Minute Cloud Deployment

#### Part A: Deploy the Backend on Render.com (Takes 90 seconds)
1. Go to [https://dashboard.render.com](https://dashboard.render.com) and sign in with GitHub (Free, no credit card required).
2. Click **New +** &rarr; **Blueprint** (or **Web Service**).
3. Connect your repository: `https://github.com/hackermuscisian34/techcircuit`.
4. Render automatically detects `render.yaml` in the root:
   - **Service Name**: `canon-backend`
   - **Runtime**: Python 3
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Database**: SQLite `canon.db` initialized automatically with seed rulebooks and demo accounts.
5. (Optional): In Environment Variables, set `GROQ_API_KEY` to your free Groq key from [https://console.groq.com/keys](https://console.groq.com/keys) if you want 24/7 cloud Llama 3.3. If not set, the built-in deterministic heuristic rule engine takes over automatically.
6. Click **Apply Blueprint** / **Create Web Service**.
7. Once deployed (~60s), Render gives you a live public HTTPS URL:
   `https://canon-backend-xxxx.onrender.com`

---

#### Part B: Deploy the Frontend on Vercel.com (Takes 60 seconds)
1. Go to [https://vercel.com](https://vercel.com) and sign in with GitHub (Free Hobby tier).
2. Click **Add New...** &rarr; **Project**.
3. Import `hackermuscisian34/techcircuit`.
4. In the configuration screen:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: Click "Edit" and choose `frontend`
5. Under **Environment Variables**, add:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://canon-backend-xxxx.onrender.com/api/v1` *(your Render backend URL from Part A)*
6. Click **Deploy**.
7. In ~45 seconds, your site is live globally on a free SSL domain:
   `https://techcircuit-hackathon.vercel.app`

---

#### Part C: Keep-Alive for 5 Days (Prevent Sleep)
Render free services spin down after 15 minutes of inactivity (taking 30s to wake up on the first visit). To ensure the hackathon judges get **instant sub-second responses 24/7**:
1. Go to [https://cron-job.org](https://cron-job.org) or [https://uptimerobot.com](https://uptimerobot.com) (both 100% free).
2. Create a ping check every 10 minutes to:
   `https://canon-backend-xxxx.onrender.com/health`
3. Your backend stays awake 24/7 for all 5 days of the hackathon while your laptop is completely powered off!

---

## 3. Option 2: Docker Compose Multi-Container Stack

To run the entire platform as an isolated, containerized open-source stack:

```bash
# Build and start all services in background
docker compose up --build -d
```

### Services Launched:
1. **Frontend**: Next.js on `http://localhost:3000`
2. **Backend**: FastAPI on `http://localhost:8000`
3. **AI Engine**: Ollama daemon on `http://localhost:11434`
4. **Volumes**: Persistent database `backend/canon.db` and asset `backend/storage/`

### Health Verification:
```bash
docker compose ps
curl http://localhost:8000/health
```

### Stopping Services:
```bash
docker compose down
```

---

## 4. Option 3: Open-Source Self-Hosted Cloud PaaS (Coolify / Dokku)

If you have a Linux VPS (Ubuntu/Debian) for the 5-day hackathon:

### A. Deploy with Coolify (Open-Source Heroku/Vercel Alternative)
1. Install Coolify on your VPS: `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash`
2. Add a new service from GitHub: `https://github.com/hackermuscisian34/techcircuit`
3. Select **Docker Compose** or the included `Dockerfile`s.
4. Configure environment variables (`LLM_PROVIDER=ollama`, `ALLOW_MOCK_LLM_FALLBACK=true`).
5. Coolify will provision automatic HTTPS certificates via Let's Encrypt.

### B. Deploy with Dokku (Open-Source PaaS)
```bash
# On your Dokku VPS
dokku apps:create fidelis
dokku config:set fidelis LLM_PROVIDER=ollama ALLOW_MOCK_LLM_FALLBACK=true

# Deploy from your laptop
git remote add dokku dokku@your-vps.com:fidelis
git push dokku main
```

---

## 5. Hackathon Judge Quick-Access Credentials

Give judges these pre-configured accounts:

| Role | Username | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **Content Creator** | `adhithya` | `Password123!` | Submit marketing text or PDF drafts (`/review`) |
| **Compliance Reviewer** | `albert` | `Password123!` | Inspect citations and visual logo assets (`/findings`, `/assets`) |
| **Executive Approver** | `biju` | `Password123!` | Sign off drafts and issue tamper-evident certificates (`/approvals`) |
| **System Administrator** | `alfred` | `Password123!` | Audit ledger integrity & tamper detection (`/audit`) |
