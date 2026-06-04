@echo off
REM Interaktivni GitHub CLI login (obavezno pre prepare-branch-protection-pr.ps1 -Push)
cd /d "%~dp0.."
echo === gh auth login ===
echo.
echo Posle login-a:
echo   1. Branch protection UI: scripts\owner-protection.cmd
echo   2. Provera: scripts\check-branch-protection.ps1
echo   3. Test PR: scripts\prepare-branch-protection-pr.ps1 -Push
echo.
echo Alternativa (samo provera, bez gh): set GITHUB_TOKEN=ghp_... pa check-branch-protection.ps1
echo.
gh auth login
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0check-branch-protection.ps1"
exit /b %ERRORLEVEL%
