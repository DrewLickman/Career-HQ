@echo off
setlocal
title Stop Career HQ
cd /d "%~dp0"

echo Stopping the Career HQ dashboard...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-career-hq-server.ps1"
set "CAREER_HQ_EXIT=%ERRORLEVEL%"

echo.
if "%CAREER_HQ_EXIT%"=="0" (
    echo This window will close in 3 seconds.
    timeout /t 3 /nobreak >nul
) else (
    echo Career HQ could not be stopped safely. Review the message above.
    pause
)

endlocal & exit /b %CAREER_HQ_EXIT%
