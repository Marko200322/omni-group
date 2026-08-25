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

$contacts = @()
for ($i = 1; $i -le $Count; $i++) {
  $n = '{0:D3}' -f $i
  $contacts += @{
    firstName = 'Seed'
    lastName  = "Lead$n"
    email     = "seed.lead.$n@mailinator.com"
    company   = "Seed Co $n"
    status    = 'lead'
  }
}

$imported = 0
$failed = 0
$chunkSize = 25
for ($o = 0; $o -lt $contacts.Count; $o += $chunkSize) {
  $headers = Get-BffSmokePostHeaders -Session $session -WebBase $web
  $chunk = @($contacts[$o..([Math]::Min($o + $chunkSize - 1, $contacts.Count - 1))])
  $body = @{ contacts = $chunk } | ConvertTo-Json -Depth 5 -Compress
  try {
    $res = Invoke-WebRequest -Uri "$web/api/atina/crm/contacts/bulk" -Method POST -ContentType 'application/json' `
      -Body $body -WebSession $session -Headers $headers -UseBasicParsing -TimeoutSec 90
    $parsed = $res.Content | ConvertFrom-Json
    if ($parsed.ok) {
      $imported += $chunk.Count
      Write-Host "  bulk ok +$($chunk.Count)" -ForegroundColor DarkGray
    } else {
      $failed += $chunk.Count
      Write-Host "  bulk fail: $($res.Content)" -ForegroundColor Yellow
    }
  } catch {
    Write-Host "  bulk fallback to single POSTs: $($_.Exception.Message)" -ForegroundColor Yellow
    foreach ($c in $chunk) {
      $headers = Get-BffSmokePostHeaders -Session $session -WebBase $web
      $one = $c | ConvertTo-Json -Compress
      try {
        $res = Invoke-WebRequest -Uri "$web/api/atina/crm/contacts" -Method POST -ContentType 'application/json' `
          -Body $one -WebSession $session -Headers $headers -UseBasicParsing -TimeoutSec 60
        $parsed = $res.Content | ConvertFrom-Json
        if ($parsed.ok) { $imported++ } else { $failed++ }
      } catch { $failed++ }
    }
  }
}

Write-Host "CRM seed done: ok=$imported fail=$failed via $web" -ForegroundColor Green
$list = Invoke-WebRequest -Uri "$web/api/atina/crm/contacts?limit=50&search=seed.lead" -WebSession $session -UseBasicParsing -TimeoutSec 60
$lj2 = $list.Content | ConvertFrom-Json
$have = @($lj2.data).Count
Write-Host "  CRM list search seed.lead count=$have" -ForegroundColor DarkGray
if ($imported -lt 1 -and $have -lt 10) { throw 'CRM seed imported 0 contacts' }
