@echo off
setlocal
title Career HQ Local Dashboard
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
    echo Career HQ needs Node.js before the dashboard can start.
    echo Install Node.js 20.9 or newer, then double-click this file again.
    pause
    exit /b 1
)

if not exist "node_modules\next\dist\bin\next" (
    echo Installing the Career HQ dashboard packages...
    call npm install
    if errorlevel 1 (
        echo.
        echo The required packages could not be installed.
        pause
        exit /b 1
    )
)

if /I "%~1"=="--check" (
    call npm run dev:check
    set "CAREER_HQ_EXIT=%ERRORLEVEL%"
    endlocal & exit /b %CAREER_HQ_EXIT%
)

echo Starting your private Career HQ dashboard...
echo This window keeps it running for up to 10 minutes.
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run-bounded-dev-server.ps1" -OpenBrowser
set "CAREER_HQ_EXIT=%ERRORLEVEL%"

if not "%CAREER_HQ_EXIT%"=="0" (
    echo.
    echo Career HQ could not start. Review the message above, then try again.
    pause
)

endlocal & exit /b %CAREER_HQ_EXIT%
