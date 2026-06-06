<#
.SYNOPSIS
  Brz pregled stanja — bez smoke testova (sekunde, ne minute).

.PARAMETER Quick
  Preskace health checkove (samo git, disk, env).

.EXAMPLE
  .\scripts\owner-status.ps1
.EXAMPLE
  .\scripts\owner-status.ps1 -Quick
#>
#Requires -Version 5.1
param([switch]$Quick)
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
  if ($Quick) {
    Write-Host "$($svc.Name): (preskoceno -Quick)" -ForegroundColor DarkGray
    continue
  }
  try {
    $r = Invoke-QuickWebGet -Uri $svc.Url -TimeoutSec 4
    Write-Host "$($svc.Name): $($r.StatusCode)" -ForegroundColor Green
  } catch {
    if ($svc.Name -eq 'Atina') {
      Write-Host "$($svc.Name): down (Docker/Postgres: .\scripts\docker-disk-help.ps1)" -ForegroundColor Red
    } else {
      Write-Host "$($svc.Name): down (restart: .\scripts\restart-web-dev.ps1)" -ForegroundColor Red
    }
  }
}

if (-not $Quick) {
  $dockerOk = $false
  try {
    docker info *> $null
    if ($LASTEXITCODE -eq 0) { $dockerOk = $true }
  } catch { }
  if ($dockerOk) {
    Write-Host 'Docker engine: OK' -ForegroundColor Green
  } else {
    Write-Host 'Docker engine: down (.\scripts\docker-repair.ps1 | docker-disk-help.ps1)' -ForegroundColor Red
  }
}

$envLocal = Join-Path $repoRoot 'apps\omnigroup-web\.env.local'
$resend = Read-DotEnvValue -Path $envLocal -Key 'RESEND_API_KEY'
if ([string]::IsNullOrWhiteSpace($resend)) {
  Write-Host 'Resend D.2: stub (dodaj RESEND_* u .env.local)' -ForegroundColor Yellow
} else {
  Write-Host 'Resend D.2: kljuc set (pokreni test-contact-resend.ps1)' -ForegroundColor Green
}

$webEnvScript = Join-Path $scriptsDir 'check-web-env.ps1'
if (Test-Path $webEnvScript) {
  & $webEnvScript -Quiet *> $null
  $webEnvOk = ($LASTEXITCODE -eq 0)
  if ($webEnvOk) {
    Write-Host 'Web env: prod-spreman (check-web-env.ps1)' -ForegroundColor Green
  } else {
    Write-Host 'Web env: vidi check-web-env.ps1 (SESSION_SECRET / NEXT_PUBLIC_ATINA_API_BASE)' -ForegroundColor Yellow
  }
}

$atinaEnv = Join-Path $repoRoot 'atina-platform\atina\.env'
if (Test-Path $atinaEnv) {
  if ($Quick) {
    Write-Host 'Atina env: vidi check-atina-aggregators.ps1 / check-stripe-env.ps1' -ForegroundColor DarkGray
  } else {
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
  $autonomyScript = Join-Path $scriptsDir 'check-autonomy-env.ps1'
  if (Test-Path $autonomyScript) {
    & $autonomyScript *> $null
    if ($LASTEXITCODE -eq 0) {
      Write-Host 'Autonomy env: PASS (check-autonomy-env.ps1)' -ForegroundColor Green
    } else {
      Write-Host 'Autonomy env: WARN (check-autonomy-env.ps1)' -ForegroundColor Yellow
    }
  }
  $financeKey = Read-DotEnvValue -Path $atinaEnv -Key 'FINANCE_KEY'
  if ([string]::IsNullOrWhiteSpace($financeKey)) {
    Write-Host 'Stripe: nije konfigurisan (check-stripe-env.ps1)' -ForegroundColor Yellow
  } else {
    Write-Host 'Stripe: delimično/kompletno (check-stripe-env.ps1)' -ForegroundColor Green
  }
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
Write-Host '  Pun gate: verify-agent-handoff.ps1 | run-local-gates.ps1 | owner-smoke-all.ps1' -ForegroundColor DarkGray
Write-Host '  Pre staging deploya: staging-preflight.ps1 -SkipAtinaTestCi -SkipDiskCheck -SkipAtinaSmoke' -ForegroundColor DarkGray
Write-Host '  Posle deploya: staging-smoke-remote.ps1' -ForegroundColor DarkGray
Write-Host '  Brzi dnevni gate: scripts\owner.cmd ili owner-daily.ps1 -ShowNext' -ForegroundColor DarkGray
Write-Host '  Branch protection UI: scripts\owner-protection.cmd (checklist u terminalu)' -ForegroundColor DarkGray
Write-Host '  GitHub CLI login: scripts\owner-gh-login.cmd' -ForegroundColor DarkGray
Write-Host '  Staging deploy koraci: scripts\owner-staging.cmd' -ForegroundColor DarkGray
