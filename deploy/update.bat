@echo off
setlocal
cd /d "%~dp0\.."
set "COMPOSE=docker compose"
docker compose version >nul 2>&1
if not errorlevel 1 goto compose_ready
set "COMPOSE=docker-compose"
docker-compose version >nul 2>&1
if errorlevel 1 goto failed
:compose_ready
%COMPOSE% -f deploy/docker-compose.yml config --quiet
if errorlevel 1 goto failed
if "%~1"=="--check" goto checked
echo Back up configuration, databases and uploads before upgrading.
echo The worker will restart; a brief interruption is expected.
if not exist ".git" goto rebuild
for /f "delims=" %%L in ('git status --porcelain') do goto dirty
git pull --ff-only
if errorlevel 1 goto failed
:rebuild
%COMPOSE% -f deploy/docker-compose.yml build mybot-panel-backend mybot-frontend mybot-bot-engine
if errorlevel 1 goto failed
%COMPOSE% -f deploy/docker-compose.yml up -d --no-deps mybot-panel-backend mybot-frontend mybot-bot-engine
if errorlevel 1 goto failed
%COMPOSE% -f deploy/docker-compose.yml ps
if errorlevel 1 goto failed
echo Update commands completed. Check service health and bot behavior.
exit /b 0
:checked
echo Compose configuration validated; no services changed.
exit /b 0
:dirty
echo Working tree has local changes. Review them before updating.
exit /b 1
:failed
echo Update failed. Review the error above; no success is assumed.
exit /b 1
