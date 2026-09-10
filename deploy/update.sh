#!/usr/bin/env bash
set -e

# ==============================================================================
# MyBot Zero-Downtime Panel Updater (Linux)
# ==============================================================================
# Pulls latest updates, rebuilds and restarts only the panel containers
# (mybot-panel-backend and mybot-frontend) while keeping the bot engine
# (mybot-bot-engine) running 24/7 without a single millisecond of downtime!
# ==============================================================================

echo "======================================================"
echo "🚀 Starting Zero-Downtime MyBot Update..."
echo "======================================================"

cd "$(dirname "$0")/.."

# 1. Pull newest code
if [ -d ".git" ]; then
    echo "📦 Pulling latest changes from repository..."
    git pull origin main || git pull
fi

# 2. Rebuild and restart ONLY panel containers
echo "🔄 Rebuilding and restarting Panel containers..."
docker compose -f deploy/docker-compose.yml build mybot-panel-backend mybot-frontend
docker compose -f deploy/docker-compose.yml up -d --no-deps mybot-panel-backend mybot-frontend

echo "======================================================"
echo "✅ Update completed successfully!"
echo "🤖 Bot runner remained online 100% uninterrupted."
echo "======================================================"
