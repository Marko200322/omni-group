<#
.SYNOPSIS
  Restartuje Omni Group web dev server na portu 3010.

.EXAMPLE
  .\scripts\restart-web-dev.ps1
.EXAMPLE
  .\scripts\restart-web-dev.ps1 -WaitSeconds 45
#>
#Requires -Version 5.1
param([int]$WaitSeconds = 45)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
$webDir = Join-Path $repoRoot 'apps\omnigroup-web'
$port = 3010

$conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) {
  Write-Host "Stopping PID $($conn.OwningProcess) on :$port ..." -ForegroundColor Yellow
  Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}

Write-Host "Starting npm run dev:clean on :$port ..." -ForegroundColor Cyan
$proc = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run', 'dev:clean' -WorkingDirectory $webDir -PassThru -WindowStyle Hidden

$deadline = (Get-Date).AddSeconds($WaitSeconds)
$ok = $false
while ((Get-Date) -lt $deadline) {
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$port/api/health" -UseBasicParsing -TimeoutSec 4
    if ($r.StatusCode -eq 200) {
      $ok = $true
      break
    }
  } catch {
    Start-Sleep -Seconds 2
  }
}

if ($ok) {
  Write-Host "Web dev OK (PID $($proc.Id)) -> http://localhost:$port" -ForegroundColor Green
} else {
  Write-Host "Web dev started (PID $($proc.Id)) ali /api/health jos nije 200 - proveri terminal ili pokusaj ponovo." -ForegroundColor Yellow
}
