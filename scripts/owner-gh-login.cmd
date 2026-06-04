@echo off
REM Interaktivni GitHub CLI login (obavezno pre check-branch-protection / prepare -Push)
cd /d "%~dp0.."
echo === gh auth login ===
echo Posle login-a pokreni: scripts\check-branch-protection.ps1
echo.
gh auth login
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0check-branch-protection.ps1"
exit /b %ERRORLEVEL%
