#!/usr/bin/env bash
set -e

# ==============================================================================
# MyBot Local Runner (Linux / macOS without Docker)
# ==============================================================================

echo "======================================================"
echo "🚀 Starting MyBot Studio (Local Mode)..."
echo "======================================================"

cd "$(dirname "$0")"

# 1. Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not found."
    exit 1
fi

# 2. Check Node
if ! command -v npm &> /dev/null; then
    echo "❌ Node.js / npm is required but not found."
    exit 1
fi

# 3. Setup venv
if [ ! -d "backend/.venv" ]; then
    echo "📦 [1/3] Creating Python virtual environment..."
    python3 -m venv backend/.venv
fi

source backend/.venv/bin/activate
echo "📦 [2/3] Installing Python requirements..."
pip install -q -r backend/requirements.txt

# 4. Setup Frontend
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 [3/3] Installing frontend dependencies..."
    (cd frontend && npm install)
fi

echo "======================================================"
echo "✅ All dependencies ready! Starting services..."
echo "👉 Backend API:  http://127.0.0.1:8000"
echo "👉 Studio UI:    http://localhost:5173"
echo "======================================================"

# Trap to kill background processes on Ctrl+C
cleanup() {
    echo "Shutting down local services..."
    kill $(jobs -p) 2>/dev/null || true
}
trap cleanup EXIT

# Run Bot Worker in background
(cd backend && python3 -m app.bot_worker) &

# Run FastAPI Backend in background
(cd backend && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload) &

# Run Frontend Vite
(cd frontend && npm run dev)
