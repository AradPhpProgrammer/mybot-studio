#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# --check validates tooling/config only: no pull, build or restart.
if docker compose version >/dev/null 2>&1; then
    COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE=(docker-compose)
else
    printf '%s\n' 'Docker Compose is required.' >&2
    exit 1
fi
"${COMPOSE[@]}" -f deploy/docker-compose.yml config --quiet
if [[ "${1:-}" == '--check' ]]; then
    printf '%s\n' 'Compose configuration validated; no services changed.'
    exit 0
fi
printf '%s\n' 'Back up configuration, databases and uploads before upgrading.' 'This update rebuilds the worker too; a brief interruption is expected.'
if [[ -d .git ]]; then
    if [[ -n "$(git status --porcelain)" ]]; then
        printf '%s\n' 'Working tree has local changes. Review them before updating.' >&2
        exit 1
    fi
    # Follow the current upstream; never silently switch release branches.
    git pull --ff-only
fi
"${COMPOSE[@]}" -f deploy/docker-compose.yml build mybot-panel-backend mybot-frontend mybot-bot-engine
"${COMPOSE[@]}" -f deploy/docker-compose.yml up -d --no-deps mybot-panel-backend mybot-frontend mybot-bot-engine
"${COMPOSE[@]}" -f deploy/docker-compose.yml ps
printf '%s\n' 'Update commands completed. Check service health and bot behavior.'
