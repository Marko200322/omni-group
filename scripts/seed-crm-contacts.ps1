#Requires -Version 5.1
<#
.SYNOPSIS
  Seed demo CRM contacts via web BFF (admin session). Outbound untouched.
#>
param(
  [string]$WebBase = 'https://omnigrouptech.com',
  [string]$ConfigPath = '',
  [int]$Count = 50
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
if (-not $ConfigPath) { $ConfigPath = Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json' }
$cfg = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$email = [string]$cfg.adminEmail
$pass = [string]$cfg.adminPassword
if ([string]::IsNullOrWhiteSpace($email) -or [string]::IsNullOrWhiteSpace($pass)) {
  throw 'adminEmail/adminPassword required'
}

$web = $WebBase.TrimEnd('/')
. (Join-Path $scriptsDir 'bff-smoke-headers.ps1')

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = @{ email = $email; password = $pass } | ConvertTo-Json -Compress
$login = Invoke-WebRequest -Uri "$web/api/auth/login" -Method POST -ContentType 'application/json' `
  -Body $loginBody -WebSession $session -UseBasicParsing -TimeoutSec 60
$lj = $login.Content | ConvertFrom-Json
if (-not $lj.ok) { throw "login failed: $($login.Content)" }
$headers = Get-BffSmokePostHeaders -Session $session -WebBase $web

$imported = 0
$failed = 0
for ($i = 1; $i -le $Count; $i++) {
  $headers = Get-BffSmokePostHeaders -Session $session -WebBase $web
  $n = '{0:D3}' -f $i
  $body = @{
    firstName = 'Seed'
    lastName  = "Lead$n"
    email     = "seed.lead.$n@mailinator.com"
    company   = "Seed Co $n"
    status    = 'lead'
    source    = 'seed-script'
    notes     = 'Auto-seeded for M4/M5 machine closeout'
  } | ConvertTo-Json -Compress
  try {
    $res = Invoke-WebRequest -Uri "$web/api/atina/crm/contacts" -Method POST -ContentType 'application/json' `
      -Body $body -WebSession $session -Headers $headers -UseBasicParsing -TimeoutSec 60
    $parsed = $res.Content | ConvertFrom-Json
    if ($parsed.ok) { $imported++ } else { $failed++; Write-Host "  skip $n : $($res.Content)" -ForegroundColor Yellow }
  } catch {
    # duplicate email from prior runs counts as soft success if already present
    $msg = $_.Exception.Message
    $failed++
    Write-Host "  skip $n : $msg" -ForegroundColor Yellow
  }
  if (($i % 10) -eq 0) { Write-Host "  progress $i/$Count (ok=$imported fail=$failed)" -ForegroundColor DarkGray }
}

Write-Host "CRM seed done: ok=$imported fail=$failed via $web" -ForegroundColor Green
# Treat duplicates from re-runs: if list shows seed contacts, OK
$list = Invoke-WebRequest -Uri "$web/api/atina/crm/contacts?limit=50&search=seed.lead" -WebSession $session -UseBasicParsing -TimeoutSec 60
$lj2 = $list.Content | ConvertFrom-Json
$have = @($lj2.data).Count
Write-Host "  CRM list search seed.lead count=$have" -ForegroundColor DarkGray
if ($imported -lt 1 -and $have -lt 10) { throw 'CRM seed imported 0 contacts' }
if ($imported -lt 1 -and $have -ge 10) { Write-Host 'CRM seed OK via existing contacts' -ForegroundColor Green }
