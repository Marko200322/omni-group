@echo off
REM Branch protection: owner-daily -ShowNext -OpenBranchProtection (preskace smoke)
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0owner-daily.ps1" -ShowNext -OpenBranchProtection -SkipSmoke %*
exit /b %ERRORLEVEL%
