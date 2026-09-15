#!/usr/bin/env bash
set -e

# ==============================================================================
# MyBot Studio — Local Runner (Linux / macOS without Docker)
# ==============================================================================

GREEN='\033[032m'
RED='\033[031m'
YELLOW='\033[1;33m'
CYAN='\033[036m'
NC='\033[0m' # No Color

echo "=============================================================================="
echo "      🚀 Starting MyBot Studio (Local Development Mode) 🚀"
echo "=============================================================================="

cd "$(dirname "$0")"

# ------------------------------------------------------------------------------
# STEP 0: Check Prerequisites
# ------------------------------------------------------------------------------
echo ""
echo "[!] Checking prerequisites..."
FAILED=0

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[X] Python 3 is NOT installed or not in PATH.${NC}"
    echo -e "${YELLOW}    Please install Python 3.10+ using your package manager:${NC}"
    echo -e "${YELLOW}    Ubuntu/Debian: sudo apt install python3 python3-pip python3-venv${NC}"
    echo -e "${YELLOW}    macOS: brew install python3${NC}"
    FAILED=1
fi

if ! python3 -m pip --version &> /dev/null; then
    echo -e "${RED}[X] pip is NOT available.${NC}"
    echo -e "${YELLOW}    Ubuntu/Debian: sudo apt install python3-pip${NC}"
    FAILED=1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}[X] Node.js is NOT installed or not in PATH.${NC}"
    echo -e "${YELLOW}    Please install Node.js 18+ from https://nodejs.org/${NC}"
    echo -e "${YELLOW}    Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs${NC}"
    FAILED=1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}[X] npm is NOT installed.${NC}"
    FAILED=1
fi

if [ $FAILED -eq 1 ]; then
    echo ""
    echo -e "${RED}One or more prerequisites are missing. Please install them and try again.${NC}"
    exit 1
fi
echo -e "${GREEN}[OK] All core prerequisites detected.${NC}"

# Check for uv (optional, super fast)
HAS_UV=0
if command -v uv &> /dev/null; then
    HAS_UV=1
    echo -e "${GREEN}[OK] uv detected — fast package installer available.${NC}"
else
    echo -e "${YELLOW}[!] uv not found — using standard pip (tip: run 'pip install uv' for 10x faster installs).${NC}"
fi

# ------------------------------------------------------------------------------
# STEP 1: Create .env if not exists
# ------------------------------------------------------------------------------
ADMIN_SECRET_PATH="panel_adm_x9a2k"
ADMIN_USER="admin"
ADMIN_PASS="admin1234"

if [ ! -f ".env" ]; then
    echo ""
    echo "[!] Creating .env configuration..."
    cat <<EOF > .env
PANEL_PORT=5173
ADMIN_SECRET_PATH=${ADMIN_SECRET_PATH}
DEFAULT_ADMIN_USER=${ADMIN_USER}
DEFAULT_ADMIN_PASS=${ADMIN_PASS}
JWT_SECRET=super-secret-mybot-token-local-runner-782910
CF_PROXY_URL=
HTTP_PROXY=
EOF
    echo -e "${GREEN}[OK] .env created.${NC}"
fi

# ------------------------------------------------------------------------------
# STEP 2: Setup Python VirtualEnv
# ------------------------------------------------------------------------------
if [ ! -f "backend/.venv/bin/python" ]; then
    echo ""
    echo "[!] Creating Python virtual environment..."
    if [ $HAS_UV -eq 1 ]; then
        uv venv backend/.venv
    else
        python3 -m venv backend/.venv
    fi
fi

# ------------------------------------------------------------------------------
# STEP 3: Install Python Dependencies
# ------------------------------------------------------------------------------
echo ""
echo "[!] Installing Python dependencies..."
if [ $HAS_UV -eq 1 ]; then
    uv pip install -r backend/requirements.txt --python backend/.venv/bin/python || {
        echo -e "${YELLOW}[!] uv failed, falling back to pip...${NC}"
        backend/.venv/bin/python -m pip install --upgrade pip
        backend/.venv/bin/python -m pip install -r backend/requirements.txt
    }
else
    backend/.venv/bin/python -m pip install --upgrade pip
    backend/.venv/bin/python -m pip install -r backend/requirements.txt
fi
echo -e "${GREEN}[OK] Python dependencies installed.${NC}"

# ------------------------------------------------------------------------------
# STEP 4: Verify Backend Imports (Smoke Test)
# ------------------------------------------------------------------------------
echo ""
echo "[!] Verifying backend imports..."
if ! backend/.venv/bin/python -c "from app.main import app; print('BACKEND_OK')" &> /dev/null; then
    echo -e "${RED}[X] Backend import verification FAILED.${NC}"
    echo -e "${YELLOW}    Please review the pip output above for missing packages.${NC}"
    exit 1
fi
echo -e "${GREEN}[OK] Backend imports verified.${NC}"

# ------------------------------------------------------------------------------
# STEP 5: Setup Frontend Dependencies
# ------------------------------------------------------------------------------
if [ ! -d "frontend/node_modules" ]; then
    echo ""
    echo "[!] Installing frontend dependencies (npm install)..."
    (cd frontend && npm install)
fi
echo -e "${GREEN}[OK] Frontend dependencies ready.${NC}"

# ------------------------------------------------------------------------------
# STEP 6: Launch Services with Process Cleanup Trap
# ------------------------------------------------------------------------------
PIDS=()
cleanup() {
    echo ""
    echo "Shutting down local services..."
    for pid in "${PIDS[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Start Bot Worker
echo ""
echo "[!] Starting Bot Worker..."
(cd backend && .venv/bin/python -m app.bot_worker) &
PIDS+=($!)

# Start Backend API
echo "[!] Starting Backend API..."
(cd backend && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload) &
PIDS+=($!)

# ------------------------------------------------------------------------------
# STEP 7: Poll Backend until it actually responds
# ------------------------------------------------------------------------------
echo -e "${YELLOW}    Waiting for backend to respond on http://127.0.0.1:8000 ...${NC}"
TRY=0
while [ $TRY -lt 15 ]; do
    TRY=$((TRY + 1))
    if curl -s -f -m 2 http://127.0.0.1:8000/ > /dev/null 2>&1; then
        echo -e "${GREEN}[OK] Backend is UP and responding.${NC}"
        break
    fi
    echo -e "${YELLOW}    Attempt $TRY/15 — waiting 2s...${NC}"
    sleep 2
done

if [ $TRY -eq 15 ]; then
    echo -e "${RED}[X] Backend failed to respond after 30 seconds.${NC}"
    exit 1
fi

# ------------------------------------------------------------------------------
# STEP 8: Success Banner & Start Frontend
# ------------------------------------------------------------------------------
echo ""
echo "=============================================================================="
echo -e "🎉 ${GREEN}MyBot Studio is ready!${NC}"
echo "=============================================================================="
echo -e "🔗 ${CYAN}Admin Panel URL:${NC}   http://localhost:5173/${ADMIN_SECRET_PATH}"
echo -e "🌐 ${CYAN}Direct UI URL:${NC}      http://localhost:5173"
echo -e "👤 ${CYAN}Default Username:${NC}   ${ADMIN_USER}"
echo -e "🔑 ${CYAN}Default Password:${NC}   ${ADMIN_PASS}"
echo "=============================================================================="
echo ""

# Try opening in browser
if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:5173/${ADMIN_SECRET_PATH}" 2>/dev/null || true
elif command -v open &> /dev/null; then
    open "http://localhost:5173/${ADMIN_SECRET_PATH}" 2>/dev/null || true
fi

echo "[!] Starting Frontend (npm run dev)..."
(cd frontend && npm run dev)
