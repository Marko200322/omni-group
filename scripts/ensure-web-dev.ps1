<#
.SYNOPSIS
  Proveri web :3010; ako ne radi, pokrene restart-web-dev.ps1.

.EXAMPLE
  .\scripts\ensure-web-dev.ps1
#>
#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptsDir 'rate-limit-retry.ps1')

$url = 'http://127.0.0.1:3010/api/health'
$ok = $false
try {
  $r = Invoke-QuickWebGet -Uri $url -TimeoutSec 4
  $ok = ($r.StatusCode -eq 200)
} catch {
  $ok = $false
}

if ($ok) {
  Write-Host 'Web dev: OK (http://localhost:3010)' -ForegroundColor Green
  exit 0
}

Write-Host 'Web dev: nije dostupan - pokrecem restart...' -ForegroundColor Yellow
& (Join-Path $scriptsDir 'restart-web-dev.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

try {
  $r = Invoke-QuickWebGet -Uri $url -TimeoutSec 8
  if ($r.StatusCode -ne 200) { throw "Web health HTTP $($r.StatusCode)" }
} catch {
  Write-Host 'Web dev i dalje ne odgovara. Pokreni Atina API (:3000) i ponovi.' -ForegroundColor Red
  exit 1
}

Write-Host 'Web dev: OK posle restarta' -ForegroundColor Green
