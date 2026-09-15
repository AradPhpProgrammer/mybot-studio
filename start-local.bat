@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
title MyBot Studio - Local Runner

set "GREEN="
set "RED="
set "YELLOW="
set "CYAN="
set "NC="
for /f "delims=" %%i in ('powershell -NoProfile -Command "[char]27"') do set "ESC=%%i"
set "GREEN=%ESC%[32m"
set "RED=%ESC%[31m"
set "YELLOW=%ESC%[33m"
set "CYAN=%ESC%[36m"
set "NC=%ESC%[0m"

echo ================================================================================
echo   MyBot Studio - Local Runner (v1.0)
echo ================================================================================
cd /d "%~dp0"

REM ====================================================================
REM STEP 0: Prerequisite checks — each one FAILS loudly and exits
REM ====================================================================
echo.
echo [!] Checking prerequisites...

set "FAILED=0"

REM --- Python ---
where python >nul 2>&1
if %errorlevel% neq 0 (
    where py >nul 2>&1
    if %errorlevel% neq 0 (
        echo %RED%[X] Python 3 is NOT installed or not in PATH.%NC%
        echo %YELLOW%    Please install Python 3.10+ from https://www.python.org/downloads/%NC%
        echo %YELLOW%    IMPORTANT: Tick "Add python.exe to PATH" during installation.%NC%
        echo %YELLOW%    Then close and reopen this terminal and run start-local.bat again.%NC%
        set "FAILED=1"
    )
)

REM --- pip ---
python -m pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%[X] pip is not available.%NC%
    echo %YELLOW%    Please install Python from https://www.python.org/downloads/%NC%
    set "FAILED=1"
)

REM --- Node.js ---
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%[X] Node.js is NOT installed or not in PATH.%NC%
    echo %YELLOW%    Please install Node.js 18+ from https://nodejs.org/en/download%NC%
    set "FAILED=1"
)

REM --- npm ---
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%[X] npm is NOT installed or not in PATH.%NC%
    echo %YELLOW%    Please install Node.js 18+ from https://nodejs.org/en/download%NC%
    set "FAILED=1"
)

REM --- uv (optional, but preferred) ---
set "HAS_UV=0"
where uv >nul 2>&1
if %errorlevel% equ 0 (
    set "HAS_UV=1"
    echo %GREEN%[OK] uv detected — fast dependency installer available.%NC%
) else (
    echo %YELLOW%[!] uv not found — will use built-in pip instead (slower but fine).%NC%
    echo %YELLOW%    Tip: install uv with "pip install uv" for much faster installs.%NC%
)

REM --- abort if anything critical is missing ---
if %FAILED% equ 1 (
    echo.
    echo %RED%One or more prerequisites are missing. Please install them and try again.%NC%
    pause
    exit /b 1
)
echo %GREEN%[OK] All core prerequisites detected.%NC%

REM ====================================================================
REM STEP 1: Create .env if it doesn't exist
REM ====================================================================
set ADMIN_SECRET_PATH=panel_adm_x9a2k
set ADMIN_USER=admin
set ADMIN_PASS=admin1234

if not exist ".env" (
    echo.
    echo [!] Creating .env configuration...
    (
    echo PANEL_PORT=5173
    echo ADMIN_SECRET_PATH=%ADMIN_SECRET_PATH%
    echo DEFAULT_ADMIN_USER=%ADMIN_USER%
    echo DEFAULT_ADMIN_PASS=%ADMIN_PASS%
    echo JWT_SECRET=super-secret-mybot-token-local-runner-782910
    echo CF_PROXY_URL=
    echo HTTP_PROXY=
    ) > .env
    echo %GREEN%[OK] .env created.%NC%
)

REM ====================================================================
REM STEP 2: Create & prepare Python virtual environment
REM ====================================================================
if not exist "backend\.venv\Scripts\python.exe" (
    echo.
    echo [!] Creating Python virtual environment...
    where uv >nul 2>&1
    if %errorlevel% equ 0 (
        uv venv backend\.venv
    ) else (
        python -m venv backend\.venv
    )
)

REM ====================================================================
REM STEP 3: Install ALL Python dependencies (fail-fast, shown line-by-line)
REM ====================================================================
echo.
echo [!] Installing Python dependencies...
echo     This may take a few minutes. Please wait...

where uv >nul 2>&1
if %errorlevel% equ 0 (
    echo %CYAN%    Using uv (fast).%NC%
    uv pip install -r backend\requirements.txt --python backend\.venv\Scripts\python.exe --no-progress
    if %errorlevel% neq 0 (
        echo %RED%[X] Failed to install Python dependencies with uv.%NC%
        echo %YELLOW%    Falling back to pip...%NC%
        call backend\.venv\Scripts\activate.bat
        python -m pip install --upgrade pip
        python -m pip install -r backend\requirements.txt
        if %errorlevel% neq 0 (
            echo %RED%[X] Python dependencies installation FAILED.%NC%
            pause
            exit /b 1
        )
    )
) else (
    call backend\.venv\Scripts\activate.bat
    python -m pip install --upgrade pip
    python -m pip install -r backend\requirements.txt
    if %errorlevel% neq 0 (
        echo %RED%[X] Python dependencies installation FAILED.%NC%
        pause
        exit /b 1
    )
)
echo %GREEN%[OK] All Python dependencies installed.%NC%

REM ====================================================================
REM STEP 4: Verify backend imports are OK (silent smoke test)
REM ====================================================================
echo.
echo [!] Verifying backend can import all modules...
cd backend
.venv\Scripts\python -c "from app.main import app; print('BACKEND_OK')" >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%[X] Backend import check FAILED.%NC%
    echo %YELLOW%    Try re-running, or check the Python version and pip install log above.%NC%
    cd ..
    pause
    exit /b 1
)
echo %GREEN%[OK] Backend imports verified.%NC%
cd ..

REM ====================================================================
REM STEP 5: Install frontend dependencies (if missing)
REM ====================================================================
if not exist "frontend\node_modules" (
    echo.
    echo [!] Installing frontend dependencies (npm install)...
    cd frontend
    call npm install
    if %errorlevel% neq 0 (
        echo %RED%[X] npm install FAILED.%NC%
        cd ..
        pause
        exit /b 1
    )
    cd ..
)
echo %GREEN%[OK] Frontend dependencies ready.%NC%

REM ====================================================================
REM STEP 6: Start Bot Worker (background window)
REM ====================================================================
echo.
echo [!] Starting Bot Worker...
start "MyBot Engine - Bot Worker" cmd /k "cd /d %~dp0\backend && call .venv\Scripts\activate.bat && python -m app.bot_worker"

REM ====================================================================
REM STEP 7: Start Backend API, wait for it to actually respond BEFORE frontend
REM ====================================================================
echo [!] Starting Backend API...
start "MyBot Engine - Backend API" cmd /k "cd /d %~dp0\backend && call .venv\Scripts\activate.bat && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo %YELLOW%    Waiting for backend to respond on http://127.0.0.1:8000 ...%NC%

REM Poll health endpoint up to 30 seconds (10 attempts x 3s)
set /a TRY=0
:WAIT_BACKEND
set /a TRY+=1
if %TRY% gtr 10 (
    echo %RED%[X] Backend did not respond after 30 seconds.%NC%
    echo %YELLOW%    Check the "MyBot Engine - Backend API" window for errors.%NC%
    pause
    exit /b 1
)
powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri 'http://127.0.0.1:8000/' -UseBasicParsing -TimeoutSec 2).StatusCode } catch { 0 }" > "$TEMP\mybot_health.txt" 2>nul
set /p HEALTH=<"$TEMP\mybot_health.txt"
if not "%HEALTH%"=="200" (
    echo %YELLOW%    Attempt %TRY%/10 — backend not ready yet...%NC%
    timeout /t 3 /nobreak >nul
    goto WAIT_BACKEND
)
echo %GREEN%[OK] Backend is UP and responding.%NC%

REM ====================================================================
REM STEP 8: Final summary banner
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

REM ====================================================================
REM STEP 9: Start Frontend (only now, backend is confirmed up)
REM ====================================================================
echo [!] Starting Frontend (backend confirmed ready)...
cd frontend
timeout /t 2 /nobreak >nul
start "" "http://localhost:5173/%ADMIN_SECRET_PATH%"
npm run dev

endlocal