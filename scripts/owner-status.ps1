<#
.SYNOPSIS
  Brz pregled stanja — bez smoke testova (sekunde, ne minute).

.EXAMPLE
  .\scripts\owner-status.ps1
#>
#Requires -Version 5.1
$ErrorActionPreference = 'Continue'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot
. (Join-Path $scriptsDir 'rate-limit-retry.ps1')

function Read-DotEnvValue {
  param([string]$Path, [string]$Key)
  if (-not (Test-Path $Path)) { return '' }
  foreach ($line in Get-Content -LiteralPath $Path) {
    $t = $line.Trim()
    if ($t -eq '' -or $t.StartsWith('#')) { continue }
    if ($t -like "$Key=*") {
      return $t.Substring($Key.Length + 1).Trim()
    }
  }
  return ''
}

Write-Host '=== owner-status ===' -ForegroundColor Cyan

$head = git log -1 --oneline 2>$null
Write-Host "Git: $head" -ForegroundColor DarkGray
$origin = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host "Origin: $origin" -ForegroundColor Green
} else {
  Write-Host 'Origin: (nije postavljen)' -ForegroundColor Yellow
}
$dirty = git status --short
if ($dirty) {
  Write-Host "Working tree: izmene ($((@($dirty).Count)) fajlova)" -ForegroundColor Yellow
} else {
  Write-Host 'Working tree: cist' -ForegroundColor Green
}

$d = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$freeGb = [math]::Round($d.FreeSpace / 1GB, 2)
Write-Host "Disk C: ${freeGb} GB" -ForegroundColor $(if ($freeGb -lt 1) { 'Red' } elseif ($freeGb -lt 5) { 'Yellow' } else { 'DarkGray' })
if ($freeGb -lt 1) {
  Write-Host '  KRITICNO: odmah pokreni free-disk-space.ps1 (zaustavi dev servere pre punog ciscenja)' -ForegroundColor Red
}

foreach ($svc in @(
  @{ Name = 'Atina'; Url = 'http://127.0.0.1:3000/health' },
  @{ Name = 'Web'; Url = 'http://127.0.0.1:3010/api/health' }
)) {
  try {
    $r = Invoke-QuickWebGet -Uri $svc.Url -TimeoutSec 4
    Write-Host "$($svc.Name): $($r.StatusCode)" -ForegroundColor Green
  } catch {
    Write-Host "$($svc.Name): down (restart: .\scripts\restart-web-dev.ps1)" -ForegroundColor Red
  }
}

$envLocal = Join-Path $repoRoot 'apps\omnigroup-web\.env.local'
$resend = Read-DotEnvValue -Path $envLocal -Key 'RESEND_API_KEY'
if ([string]::IsNullOrWhiteSpace($resend)) {
  Write-Host 'Resend D.2: stub (dodaj RESEND_* u .env.local)' -ForegroundColor Yellow
} else {
  Write-Host 'Resend D.2: kljuc set (pokreni test-contact-resend.ps1)' -ForegroundColor Green
}

$atinaEnv = Join-Path $repoRoot 'atina-platform\atina\.env'
if (Test-Path $atinaEnv) {
  $filled = 0
  $total = 0
  foreach ($line in Get-Content -LiteralPath $atinaEnv) {
    $t = $line.Trim()
    if ($t -eq '' -or $t.StartsWith('#')) { continue }
    if ($t -match '^[A-Z_]+=') {
      $total++
      $val = $t.Substring($t.IndexOf('=') + 1).Trim()
      if ($val) { $filled++ }
    }
  }
  Write-Host "Atina agregatori: $filled/$total popunjeno (detalji: check-atina-aggregators.ps1)" -ForegroundColor DarkGray
  $financeKey = Read-DotEnvValue -Path $atinaEnv -Key 'FINANCE_KEY'
  if ([string]::IsNullOrWhiteSpace($financeKey)) {
    Write-Host 'Stripe: nije konfigurisan (check-stripe-env.ps1)' -ForegroundColor Yellow
  } else {
    Write-Host 'Stripe: delimično/kompletno (check-stripe-env.ps1)' -ForegroundColor Green
  }
}

Write-Host ''
Write-Host 'Sledece (vlasnik):' -ForegroundColor Cyan
if (-not $origin) {
  Write-Host '  1. git-push-first-time.ps1 -RepoUrl https://github.com/USER/REPO.git' -ForegroundColor DarkGray
}
if ([string]::IsNullOrWhiteSpace($resend)) {
  Write-Host '  2. Resend u .env.local + test-contact-resend.ps1' -ForegroundColor DarkGray
}
if ($freeGb -lt 5) {
  Write-Host '  3. disk-report.ps1 / free-disk-space.ps1 -CleanTemp -SkipNext' -ForegroundColor DarkGray
}
Write-Host '  Pun gate: verify-agent-handoff.ps1 | owner-smoke-all.ps1' -ForegroundColor DarkGray
