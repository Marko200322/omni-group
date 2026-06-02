<#
.SYNOPSIS
  Restart Atina API sa host dev serverom (brži reload koda nego Docker rebuild).

.EXAMPLE
  .\scripts\restart-atina-dev.ps1
#>
#Requires -Version 5.1
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$atina = Join-Path $root 'atina-platform\atina'

Write-Host 'Stopping Docker atina_app (if running)...' -ForegroundColor Cyan
docker stop atina_app 2>$null | Out-Null

$port = if ($env:ATINA_DEV_PORT) { $env:ATINA_DEV_PORT } else { '3000' }
Write-Host "Starting Atina npm run dev on :$port (PHASE from .env)..." -ForegroundColor Cyan
Push-Location $atina
$devCmd = @"
`$env:PORT='$port'; `$env:NODE_OPTIONS='--max-old-space-size=4096'; npm run dev
"@
Start-Process powershell -ArgumentList '-NoProfile','-Command', $devCmd -WindowStyle Minimized
Pop-Location

Start-Sleep -Seconds 15
try {
  $h = Invoke-WebRequest -Uri "http://127.0.0.1:$port/health" -TimeoutSec 20 -UseBasicParsing
  Write-Host "Atina OK HTTP $($h.StatusCode) on :$port" -ForegroundColor Green
} catch {
  Write-Host "Atina not ready yet: $($_.Exception.Message)" -ForegroundColor Yellow
}
