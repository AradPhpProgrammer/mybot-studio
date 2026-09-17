#!/usr/bin/env bash
set -e

# MyBot Studio - Local Runner (Linux / macOS wrapper)
cd "$(dirname "$0")"

PY_CMD=""
if command -v python3 &>/dev/null; then
    PY_CMD="python3"
elif command -v python &>/dev/null; then
    PY_CMD="python"
else
    echo ""
    echo "===================================================================="
    echo "[X] Python 3 is not installed or not in PATH!"
    echo "    On Ubuntu/Debian, install with:"
    echo "    sudo apt update && sudo apt install -y python3 python3-pip python3-venv"
    echo "===================================================================="
    echo ""
    exit 1
fi

exec "$PY_CMD" start-local.py "$@"
