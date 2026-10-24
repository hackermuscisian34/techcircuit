#!/usr/bin/env bash
set -e

# ============================================================
# FIDELIS 2.0 Hackathon Live Public Tunnel Deployment Script
# ============================================================
# Exposes local frontend (Port 3000) and backend API (Port 8000)
# to public HTTPS URLs for remote judges and reviewers.
# ============================================================

echo "=========================================================="
echo "🚀 FIDELIS 2.0: Deploying Open-Source Hackathon Public URL"
echo "=========================================================="

SUBDOMAIN="${1:-fidelis-gov-$RANDOM}"

# Check if ports are listening
if ! curl -s http://127.0.0.1:3000 > /dev/null 2>&1; then
    echo "⚠️ Warning: Frontend does not appear to be running on port 3000."
    echo "Starting frontend in background..."
    (cd frontend && npm run dev) &
    sleep 3
fi

if ! curl -s http://127.0.0.1:8000/health > /dev/null 2>&1; then
    echo "⚠️ Warning: Backend does not appear to be running on port 8000."
    echo "Starting backend in background..."
    (cd backend && source .venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000) &
    sleep 3
fi

echo ""
echo "🔗 Generating Public HTTPS Tunnel for Frontend (Port 3000)..."
echo "Public URL will appear below:"
echo "----------------------------------------------------------"
npx -y localtunnel --port 3000 --subdomain "$SUBDOMAIN"
