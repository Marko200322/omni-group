@echo off
REM Staging deploy cheat sheet (staging-owner-next.ps1)
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0staging-owner-next.ps1" %*
exit /b %ERRORLEVEL%
