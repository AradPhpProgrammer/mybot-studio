@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
title MyBot Studio - Local Runner

echo ================================================================================
echo   MyBot Studio - Local Runner
echo ================================================================================
cd /d "%~dp0"

REM ====================================================================
REM STEP 0: Prerequisite checks
REM ====================================================================
echo.
echo [!] Checking prerequisites...
set "FAILED=0"

REM --- Python ---
set "HAS_PY=0"
where python >nul 2>&1
if %errorlevel% equ 0 set "HAS_PY=1"
if not "%HAS_PY%"=="1" (
    where py >nul 2>&1
    if %errorlevel% equ 0 set "HAS_PY=1"
)
if not "%HAS_PY%"=="1" (
    echo [X] Python 3 is NOT installed or not in PATH.
    echo     Please install Python 3.10+ from https://www.python.org/downloads/
    echo     IMPORTANT: Tick "Add python.exe to PATH" during installation.
    echo     Then close and reopen this terminal and run start-local.bat again.
    set "FAILED=1"
)

REM --- pip ---
python -m pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] pip is not available.
    echo     Please install Python from https://www.python.org/downloads/
    set "FAILED=1"
)

REM --- Node.js ---
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Node.js is NOT installed or not in PATH.
    echo     Please install Node.js 18+ from https://nodejs.org/en/download
    set "FAILED=1"
)

REM --- npm ---
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] npm is NOT installed or not in PATH.
    echo     Please install Node.js 18+ from https://nodejs.org/en/download
    set "FAILED=1"
)

REM --- uv (optional) ---
set "HAS_UV=0"
where uv >nul 2>&1
if %errorlevel% equ 0 set "HAS_UV=1"

if not "%HAS_UV%"=="1" (
    echo [!] uv not found - will use pip instead. (Tip: pip install uv for faster installs)
)

REM --- abort if critical missing ---
if not "%FAILED%"=="0" (
    echo.
    echo One or more prerequisites are missing. Please install them and try again.
    pause
    exit /b 1
)
echo [OK] All core prerequisites detected.

REM ====================================================================
REM STEP 1: Create .env if it doesn't exist
REM ====================================================================
set "ADMIN_SECRET_PATH=panel_adm_x9a2k"
set "ADMIN_USER=admin"
set "ADMIN_PASS=admin1234"

if not exist ".env" (
    echo.
    echo [!] Creating .env configuration...
    > .env echo PANEL_PORT=5173
    >> .env echo ADMIN_SECRET_PATH=%ADMIN_SECRET_PATH%
    >> .env echo DEFAULT_ADMIN_USER=%ADMIN_USER%
    >> .env echo DEFAULT_ADMIN_PASS=%ADMIN_PASS%
    >> .env echo JWT_SECRET=super-secret-mybot-token-local-runner-782910
    >> .env echo CF_PROXY_URL=
    >> .env echo HTTP_PROXY=
    echo [OK] .env created.
)

REM ====================================================================
REM STEP 2: Create Python virtual environment
REM ====================================================================
if not exist "backend\.venv\Scripts\python.exe" (
    echo.
    echo [!] Creating Python virtual environment...
    if "%HAS_UV%"=="1" (
        uv venv backend\.venv
    ) else (
        python -m venv backend\.venv
    )
)

REM ====================================================================
REM STEP 3: Install Python dependencies
REM ====================================================================
echo.
echo [!] Installing Python dependencies... (this may take a few minutes)
if "%HAS_UV%"=="1" (
    uv pip install -r backend\requirements.txt --python backend\.venv\Scripts\python.exe
    if %errorlevel% neq 0 (
        echo [X] uv install failed, falling back to pip...
        call backend\.venv\Scripts\activate.bat
        python -m pip install --upgrade pip
        python -m pip install -r backend\requirements.txt
        if %errorlevel% neq 0 (
            echo [X] Python dependencies installation FAILED.
            pause
            exit /b 1
        )
    )
) else (
    call backend\.venv\Scripts\activate.bat
    python -m pip install --upgrade pip
    python -m pip install -r backend\requirements.txt
    if %errorlevel% neq 0 (
        echo [X] Python dependencies installation FAILED.
        pause
        exit /b 1
    )
)
echo [OK] Python dependencies installed.

REM ====================================================================
REM STEP 4: Verify backend imports (smoke test)
REM ====================================================================
echo.
echo [!] Verifying backend imports...
cd backend
.venv\Scripts\python -c "from app.main import app; print('BACKEND_OK')" >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Backend import check FAILED.
    echo     Check the pip install log above.
    cd ..
    pause
    exit /b 1
)
echo [OK] Backend imports verified.
cd ..

REM ====================================================================
REM STEP 5: Install frontend dependencies
REM ====================================================================
if not exist "frontend\node_modules" (
    echo.
    echo [!] Installing frontend dependencies (npm install)...
    cd frontend
    call npm install
    if %errorlevel% neq 0 (
        echo [X] npm install FAILED.
        cd ..
        pause
        exit /b 1
    )
    cd ..
)
echo [OK] Frontend dependencies ready.

REM ====================================================================
REM STEP 6: Start Bot Worker and Backend API
REM ====================================================================

REM Kill any existing instances on the ports to avoid stale/no-auth backends
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    echo [~] Stopping stale process on port 8000 (PID %%p)...
    taskkill /PID %%p /F >nul 2>&1
)

echo.
echo [!] Starting Bot Worker...
start "MyBot Engine - Bot Worker" cmd /k "cd /d %~dp0backend && call .venv\Scripts\activate.bat && python -m app.bot_worker"

echo [!] Starting Backend API...
start "MyBot Engine - Backend API" cmd /k "cd /d %~dp0backend && call .venv\Scripts\activate.bat && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

REM ====================================================================
REM STEP 7: Wait for backend to respond BEFORE starting frontend
REM ====================================================================
echo [!] Waiting for backend to respond on http://127.0.0.1:8000 ...
set /a TRY=0
:WAIT_BACKEND
set /a TRY+=1
if %TRY% gtr 10 (
    echo [X] Backend did not respond after 30 seconds.
    echo     Check the "MyBot Engine - Backend API" window for errors.
    pause
    exit /b 1
)

set "HEALTH=0"
for /f %%c in ('curl -s -o nul -w "%%{http_code}" http://127.0.0.1:8000/ 2^>nul') do set "HEALTH=%%c"
if not "%HEALTH%"=="200" (
    powershell -NoProfile -Command "try{(Invoke-WebRequest -Uri 'http://127.0.0.1:8000/' -UseBasicParsing -TimeoutSec 2).StatusCode}catch{0}" > "%TEMP%\mybot_health.txt" 2>nul
    if exist "%TEMP%\mybot_health.txt" set /p HEALTH=<"%TEMP%\mybot_health.txt"
)

if not "%HEALTH%"=="200" (
    echo     Attempt %TRY%/10 - backend not ready yet...
    timeout /t 3 /nobreak >nul
    goto WAIT_BACKEND
)
echo [OK] Backend is up and responding.

REM ====================================================================
REM STEP 8: Summary + Start Frontend
REM ====================================================================
echo.
echo ================================================================================
echo  MyBot Studio is ready!
echo ================================================================================
echo  Admin Panel URL:   http://localhost:5173/%ADMIN_SECRET_PATH%
echo  Direct UI URL:     http://localhost:5173
echo  Default Username:  %ADMIN_USER%
echo  Default Password:  %ADMIN_PASS%
echo ================================================================================
echo.
echo [!] Starting Frontend (backend confirmed ready)...
cd frontend
timeout /t 2 /nobreak >nul
start "" "http://localhost:5173/%ADMIN_SECRET_PATH%"
call npm run dev
if %errorlevel% neq 0 (
    echo.
    echo [X] Frontend stopped with an error code: %errorlevel%
    pause
)

pause
endlocal