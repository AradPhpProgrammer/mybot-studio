@echo off
setlocal enabledelayedexpansion
title MyBot Studio - Local Runner

echo ==============================================================================
echo       🚀 Starting MyBot Studio (Local Development Mode) 🚀
echo ==============================================================================

cd /d "%~dp0"

REM 1. Check Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    pause
    exit /b 1
)

REM 2. Check Node
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js / npm is not installed.
    pause
    exit /b 1
)

REM 3. Create .env if not exists
set ADMIN_SECRET_PATH=panel_adm_x9a2k
set ADMIN_USER=admin
set ADMIN_PASS=admin1234

if not exist ".env" (
    (
    echo PANEL_PORT=5173
    echo ADMIN_SECRET_PATH=%ADMIN_SECRET_PATH%
    echo DEFAULT_ADMIN_USER=%ADMIN_USER%
    echo DEFAULT_ADMIN_PASS=%ADMIN_PASS%
    echo JWT_SECRET=super-secret-mybot-token-local-runner-782910
    echo CF_PROXY_URL=
    echo HTTP_PROXY=
    ) > .env
)

REM 4. Setup Python VirtualEnv
if not exist "backend\.venv" (
    echo [1/4] Creating Python virtual environment...
    python -m venv backend\.venv
)

echo [2/4] Installing backend dependencies...
call backend\.venv\Scripts\activate.bat
pip install -q -r backend\requirements.txt

REM 5. Setup Frontend
if not exist "frontend\node_modules" (
    echo [3/4] Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

echo [4/4] Launching services...
echo.
echo ==============================================================================
echo 🔗 Admin Panel URL:   http://localhost:5173/%ADMIN_SECRET_PATH%
echo 🌐 Direct UI URL:    http://localhost:5173
echo 👤 Default Username:  %ADMIN_USER%
echo 🔑 Default Password:  %ADMIN_PASS%
echo ==============================================================================
echo.

REM Start Bot Worker in background window
start "MyBot Engine - Bot Worker" cmd /k "cd /d %~dp0\backend && call .venv\Scripts\activate.bat && python -m app.bot_worker"

REM Start Backend API in background window
start "MyBot Engine - Backend API" cmd /k "cd /d %~dp0\backend && call .venv\Scripts\activate.bat && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

REM Start Frontend Vite in current window
cd frontend
timeout /t 2 >nul
start http://localhost:5173/%ADMIN_SECRET_PATH%
npm run dev
