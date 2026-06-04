@echo off
REM Brzi vlasnicki gate: owner-daily -ShowNext (dodaj -OpenBranchProtection za GitHub UI)
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0owner-daily.ps1" -ShowNext %*
exit /b %ERRORLEVEL%
