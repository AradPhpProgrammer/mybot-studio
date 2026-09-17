@echo off
chcp 65001 >nul 2>&1
title MyBot Studio - Local Runner
cd /d "%~dp0"

set "PY_CMD="

where python >nul 2>&1
if not errorlevel 1 (
    set "PY_CMD=python"
    goto RUN_LAUNCHER
)

where py >nul 2>&1
if not errorlevel 1 (
    set "PY_CMD=py -3"
    goto RUN_LAUNCHER
)

where python3 >nul 2>&1
if not errorlevel 1 (
    set "PY_CMD=python3"
    goto RUN_LAUNCHER
)

echo.
echo ====================================================================
echo [X] Python 3 is NOT installed or not found in PATH!
echo     Please download and install Python 3.10+ from:
echo     https://www.python.org/downloads/
echo.
echo     CRITICAL: During installation, be sure to check the box:
echo     "Add python.exe to PATH"
echo ====================================================================
echo.
pause
exit /b 1

:RUN_LAUNCHER
%PY_CMD% start-local.py %*
set "LAUNCHER_EXIT=%ERRORLEVEL%"
if not "%LAUNCHER_EXIT%"=="0" (
    echo.
    echo ====================================================================
    echo Launcher encountered an error. Press any key to exit...
    echo ====================================================================
    pause
)
exit /b %LAUNCHER_EXIT%
