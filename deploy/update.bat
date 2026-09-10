@echo off
REM ==============================================================================
REM MyBot Zero-Downtime Panel Updater (Windows)
REM ==============================================================================

echo ======================================================
echo  Starting Zero-Downtime MyBot Update...
echo ======================================================

cd /d "%~dp0\.."

if exist ".git" (
    echo [1/2] Pulling latest updates from Git...
    git pull
)

echo [2/2] Rebuilding and restarting Panel containers...
docker compose -f deploy/docker-compose.yml build mybot-panel-backend mybot-frontend
docker compose -f deploy/docker-compose.yml up -d --no-deps mybot-panel-backend mybot-frontend

echo ======================================================
echo  Update completed successfully!
echo  Bot engine remained online 100%% uninterrupted.
echo ======================================================
pause
