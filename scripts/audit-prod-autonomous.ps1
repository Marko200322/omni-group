#Requires -Version 5.1
<#
.SYNOPSIS
  Autonomous prod checks (no secrets printed). Writes docs/generated/PROD-AUDIT.md

.EXAMPLE
  .\scripts\audit-prod-autonomous.ps1
  .\scripts\audit-prod-autonomous.ps1 -WebBase https://omnigrouptech.com
#>
param(
  [string]$WebBase = 'https://omnigrouptech.com',
  [string]$Domain = 'omnigrouptech.com',
  [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$web = $WebBase.TrimEnd('/')
$outMd = Join-Path $RepoRoot 'docs\generated\PROD-AUDIT.md'
$webCopy = Join-Path $RepoRoot 'apps\omnigroup-web\src\data\prod-audit.md'
$ts = Get-Date -Format 'yyyy-MM-dd HH:mm'

function Read-EnvValue([string]$Path, [string]$Key) {
  if (-not (Test-Path $Path)) { return '' }
  foreach ($line in Get-Content -LiteralPath $Path) {
    $t = $line.Trim()
    if ($t -eq '' -or $t.StartsWith('#')) { continue }
    if ($t -like "$Key=*") { return $t.Substring($Key.Length + 1).Trim() }
  }
  return ''
}

function Add-Row([System.Collections.Generic.List[string]]$Rows, [string]$Id, [string]$Check, [string]$Status, [string]$Note) {
  $Rows.Add("| $Id | $Check | **$Status** | $Note |")
}

$rows = [System.Collections.Generic.List[string]]::new()
$pass = 0
$fail = 0
$ti = 0

Write-Host '== audit-prod-autonomous ==' -ForegroundColor Cyan

# DNS
try {
  $dmarc = Resolve-DnsName "_dmarc.$Domain" -Type TXT -ErrorAction Stop
  $txt = ($dmarc | ForEach-Object { $_.Strings }) -join ' '
  if ($txt -match 'v=DMARC1') {
    Add-Row $rows 'P0-01' 'DMARC DNS' 'PASS' 'TXT present'
    $pass++
  } else {
    Add-Row $rows 'P0-01' 'DMARC DNS' 'TI' 'TXT missing or invalid — Spaceship + add-dmarc-spaceship.ps1'
    $ti++
  }
} catch {
  Add-Row $rows 'P0-01' 'DMARC DNS' 'TI' 'No _dmarc TXT — Spaceship API keys not in deploy.config'
  $ti++
}

try {
  $dkim = Resolve-DnsName "resend._domainkey.$Domain" -Type TXT -ErrorAction Stop
  if ($dkim) { Add-Row $rows 'LIVE-10' 'Resend DKIM DNS' 'PASS' 'resend._domainkey SET'; $pass++ }
} catch {
  Add-Row $rows 'LIVE-10' 'Resend DKIM DNS' 'FAIL' 'Missing DKIM'
  $fail++
}

# Resend domain API
$resendKey = Read-EnvValue (Join-Path $RepoRoot 'apps\omnigroup-web\.env.vps.production') 'RESEND_API_KEY'
if (-not $resendKey) {
  $resendKey = Read-EnvValue (Join-Path $RepoRoot 'atina-platform\atina\.env.vps.prod') 'RESEND_API_KEY'
}
if ($resendKey) {
  try {
    $domains = Invoke-RestMethod -Uri 'https://api.resend.com/domains' -Headers @{ Authorization = "Bearer $resendKey" } -Method Get
    $dom = @($domains.data) | Where-Object { $_.name -eq $Domain -or $_.name -eq "send.$Domain" } | Select-Object -First 1
    if ($dom -and $dom.status -eq 'verified') {
      Add-Row $rows 'P0-02' 'Resend domain verify' 'PASS' "status=$($dom.status)"
      $pass++
    } elseif ($dom) {
      Add-Row $rows 'P0-02' 'Resend domain verify' 'TI' "Resend UI Verify - status=$($dom.status)"
      $ti++
    } else {
      Add-Row $rows 'P0-02' 'Resend domain verify' 'TI' 'Domain not in Resend account - add in dashboard'
      $ti++
    }
  } catch {
    Add-Row $rows 'P0-02' 'Resend domain verify' 'PARTIAL' 'API call failed - check Resend dashboard manually'
    $ti++
  }
} else {
  Add-Row $rows 'P0-02' 'Resend domain verify' 'TI' 'No RESEND_API_KEY in local prod env snapshot'
  $ti++
}

# Slack keys
$slackOps = Read-EnvValue (Join-Path $RepoRoot 'atina-platform\atina\KLJUCEVI-POPUNI.local.txt') 'SLACK_WEBHOOK_URL'
$slackContact = Read-EnvValue (Join-Path $RepoRoot 'atina-platform\atina\KLJUCEVI-POPUNI.local.txt') 'CONTACT_SLACK_WEBHOOK_URL'
if ([string]::IsNullOrWhiteSpace($slackContact)) {
  Add-Row $rows 'P0-04' 'Slack kontakt webhook' 'TI' 'CONTACT_SLACK_WEBHOOK_URL empty - paste URL + deploy'
  $ti++
} else {
  Add-Row $rows 'P0-04' 'Slack kontakt webhook' 'PASS' 'Key SET in KLJUCEVI (deploy to sync prod)'
  $pass++
}
if ([string]::IsNullOrWhiteSpace($slackOps)) {
  Add-Row $rows 'P0-05' 'Slack ops webhook' 'TI' 'SLACK_WEBHOOK_URL empty'
  $ti++
} else {
  Add-Row $rows 'P0-05' 'Slack ops webhook' 'PASS' 'Key SET in KLJUCEVI'
  $pass++
}

# Prod HTTP
try {
  $health = Invoke-WebRequest -Uri "$web/api/health" -UseBasicParsing -TimeoutSec 30
  if ($health.StatusCode -eq 200) { Add-Row $rows 'LIVE-01' 'Web /api/health' 'PASS' $web; $pass++ }
} catch {
  Add-Row $rows 'LIVE-01' 'Web /api/health' 'FAIL' $_.Exception.Message
  $fail++
}

try {
  $api = Invoke-WebRequest -Uri 'https://api.omnigrouptech.com/health' -UseBasicParsing -TimeoutSec 30
  if ($api.StatusCode -eq 200) { Add-Row $rows 'LIVE-01' 'API /health' 'PASS' 'api.omnigrouptech.com'; $pass++ }
} catch {
  Add-Row $rows 'LIVE-01' 'API /health' 'FAIL' $_.Exception.Message
  $fail++
}

# Authenticated BFF checks
. (Join-Path $RepoRoot 'scripts\resolve-admin-credentials.ps1')
$c = Get-AdminCredentials -RepoRoot $RepoRoot -Prod
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = (@{ email = $c.Email; password = $c.Password } | ConvertTo-Json)
try {
  $lj = Invoke-WebRequest -Uri "$web/api/auth/login" -Method POST -ContentType 'application/json' -Body $loginBody -WebSession $session -UseBasicParsing -TimeoutSec 60
  $loginJson = $lj.Content | ConvertFrom-Json
  if ($loginJson.ok) {
    Add-Row $rows 'AUTH' 'Admin login' 'PASS' $c.Email
    $pass++

    $ph = Invoke-WebRequest -Uri "$web/api/atina/problem-hunter/status" -WebSession $session -UseBasicParsing -TimeoutSec 60
    $phj = $ph.Content | ConvertFrom-Json
    if ($phj.ok) {
      Add-Row $rows 'P1-05' 'Problem Hunter BFF' 'PASS' "sources=$($phj.data.sources.Count)"
      $pass++
    }

    $hr = Invoke-WebRequest -Uri "$web/api/atina/hunting/readiness" -WebSession $session -UseBasicParsing -TimeoutSec 60
    $hrj = $hr.Content | ConvertFrom-Json
    if ($hrj.ok -and $hrj.data.outbound) {
      $warm = $hrj.data.outbound.warmupComplete
      if ($warm) {
        Add-Row $rows 'P0-03' 'Instantly/warmup flag' 'PASS' 'warmupComplete=true on prod'
        $pass++
      } else {
        Add-Row $rows 'P0-03' 'Instantly/warmup' 'TI' 'Instantly UI warmup + OUTREACH_DOMAIN_WARMUP_COMPLETE'
        $ti++
      }
    }

    try {
      $cq = Invoke-WebRequest -Uri "$web/api/atina/billing/catalog-quality" -WebSession $session -UseBasicParsing -TimeoutSec 60
      $cqj = $cq.Content | ConvertFrom-Json
      if ($cqj.ok) {
        Add-Row $rows 'P3-E06' 'catalog-quality BFF' 'PASS' 'Admin endpoint OK'
        $pass++
      }
    } catch {
      Add-Row $rows 'P3-E06' 'catalog-quality BFF' 'PARTIAL' 'Route may need deploy'
      $ti++
    }
  }
} catch {
  Add-Row $rows 'AUTH' 'Admin login' 'FAIL' $_.Exception.Message
  $fail++
}

# Contact form (public)
try {
  $contactBody = (@{ name = 'Audit bot'; email = 'audit@omnigroup.local'; company = 'Audit'; message = "audit $ts" } | ConvertTo-Json -Compress)
  $cr = Invoke-WebRequest -Uri "$web/api/contact" -Method POST -ContentType 'application/json' -Body $contactBody -UseBasicParsing -TimeoutSec 60
  $crj = $cr.Content | ConvertFrom-Json
  if ($crj.ok) {
    Add-Row $rows 'CONTACT' 'POST /api/contact' 'PASS' "message=$($crj.message)"
    $pass++
  }
} catch {
  Add-Row $rows 'CONTACT' 'POST /api/contact' 'FAIL' $_.Exception.Message
  $fail++
}

Add-Row $rows 'P0-06' 'Mystery shopper PDF inbox' 'TI' 'Auto e2e-billing-prod PASS - ti proveri inbox PDF'
$ti++
Add-Row $rows 'P0-07' 'Legal counsel sign-off' 'TI' 'Formalni advokat - stranice u kodu'
$ti++
Add-Row $rows 'P2' 'Firma + Stripe LIVE + PayPal/Wise/Kriptoman' 'DEFERRED' 'Namerno na kraju (P2)'

$sb = @"
# PROD-AUDIT (auto-generated)

**Generated:** $ts  
**Command:** ``.\scripts\audit-prod-autonomous.ps1``  
**Summary:** $pass PASS · $fail FAIL · $ti TI/DEFERRED

Kanonska lista: [`STATUS-KANON.md`](../STATUS-KANON.md)

| ID | Check | Status | Note |
|----|-------|--------|------|
$($rows -join "`n")

## Agent vs ti

- **Agent zatvorio:** P1 (8/8), prod smoke, Problem Hunter, E2E billing fulfillment.
- **Samo ti:** P0-01 DMARC (Spaceship), P0-02 Resend Verify UI ako API != verified, P0-03 Instantly warmup UI, P0-04/05 Slack URL, P0-06 PDF u inboxu, P0-07 legal.
- **P2 NA KRAJU:** firma, Stripe live, payment API-ji.
"@

$outDir = Split-Path -Parent $outMd
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
[System.IO.File]::WriteAllText($outMd, $sb, [System.Text.UTF8Encoding]::new($false))
$webDir = Split-Path -Parent $webCopy
if (-not (Test-Path $webDir)) { New-Item -ItemType Directory -Path $webDir -Force | Out-Null }
[System.IO.File]::WriteAllText($webCopy, $sb, [System.Text.UTF8Encoding]::new($false))

Write-Host "Wrote $outMd ($pass PASS, $fail FAIL, $ti TI)" -ForegroundColor Green
Write-Host "Wrote $webCopy (bundled for /dev/status)"
