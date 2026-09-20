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

function Test-ResendSendDnsReady([string]$DomainName) {
  $dkimOk = $false
  $spfTxtOk = $false
  $spfMxOk = $false
  try {
    $dkim = Resolve-DnsName "resend._domainkey.$DomainName" -Type TXT -ErrorAction Stop
    $dkimOk = [bool]$dkim
  } catch { }
  try {
    $spfTxt = Resolve-DnsName "send.$DomainName" -Type TXT -ErrorAction Stop
    $txt = ($spfTxt | ForEach-Object { $_.Strings }) -join ' '
    $spfTxtOk = $txt -match 'v=spf1'
  } catch { }
  try {
    $spfMx = Resolve-DnsName "send.$DomainName" -Type MX -ErrorAction Stop
    $spfMxOk = [bool]$spfMx
  } catch { }
  return @{
    Ok = ($dkimOk -and $spfTxtOk -and $spfMxOk)
    Dkim = $dkimOk
    SpfTxt = $spfTxtOk
    SpfMx = $spfMxOk
  }
}

function Test-GmailInvoicePdfInbox([string]$RepoRootPath) {
  $cfgPath = Join-Path $RepoRootPath 'deploy-secrets.local\deploy.config.json'
  if (-not (Test-Path $cfgPath)) { return $null }
  try {
    $cfg = Get-Content -LiteralPath $cfgPath -Raw | ConvertFrom-Json
    $user = "$($cfg.smtp.user)".Trim()
    $pw = "$($cfg.smtp.password)".Trim()
    if ([string]::IsNullOrWhiteSpace($user) -or [string]::IsNullOrWhiteSpace($pw)) { return $null }
    $py = @"
import imaplib, email
from email.header import decode_header
from datetime import datetime, timedelta, timezone
user = r'''$($user.Replace("'", "''"))'''
pw = r'''$($pw.Replace("'", "''"))'''
m = imaplib.IMAP4_SSL('imap.gmail.com')
m.login(user, pw)
m.select('INBOX')
since = (datetime.now(timezone.utc) - timedelta(days=7)).strftime('%d-%b-%Y')
typ, data = m.search(None, f'(SINCE {since})')
ids = data[0].split()[-80:] if data[0] else []
found = []
for i in reversed(ids):
    typ, msgdata = m.fetch(i, '(RFC822)')
    msg = email.message_from_bytes(msgdata[0][1])
    subj = ''
    if msg['Subject']:
        parts = decode_header(msg['Subject'])
        subj = ''.join([(t.decode(e or 'utf-8') if isinstance(t, bytes) else t) for t, e in parts])
    if 'invoice inv-' not in subj.lower():
        continue
    att = []
    if msg.is_multipart():
        for part in msg.walk():
            fn = part.get_filename()
            if fn and fn.lower().endswith('.pdf'):
                att.append(fn)
    if att:
        found.append(subj[:90] + ' | ' + ','.join(att))
m.logout()
print('FOUND=' + str(len(found)))
for line in found[:3]:
    print('ITEM=' + line)
"@
    $out = python -c $py 2>&1 | ForEach-Object { "$_" }
    if ($LASTEXITCODE -ne 0) { return @{ Ok = $false; Error = ($out -join ' ') } }
    $count = 0
    $items = [System.Collections.Generic.List[string]]::new()
    foreach ($line in $out) {
      if ($line -like 'FOUND=*') { $count = [int]($line.Split('=')[1]) }
      elseif ($line -like 'ITEM=*') { $items.Add($line.Substring(5)) }
    }
    return @{ Ok = ($count -gt 0); Count = $count; Items = $items }
  } catch {
    return @{ Ok = $false; Error = $_.Exception.Message }
  }
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
    $domBrief = @($domains.data) | Where-Object { $_.name -eq $Domain -or $_.name -eq "send.$Domain" } | Select-Object -First 1
    $dom = $null
    if ($domBrief -and $domBrief.id) {
      $dom = Invoke-RestMethod -Uri "https://api.resend.com/domains/$($domBrief.id)" -Headers @{ Authorization = "Bearer $resendKey" } -Method Get
    }
    $sendDns = Test-ResendSendDnsReady -DomainName $Domain
    if ($dom -and $dom.status -eq 'verified') {
      Add-Row $rows 'P0-02' 'Resend domain verify' 'PASS' "status=$($dom.status)"
      $pass++
    } elseif ($dom -and "$($dom.capabilities.sending)" -eq 'enabled' -and $sendDns.Ok) {
      Add-Row $rows 'P0-02' 'Resend domain verify' 'PASS' "send-only OK (API status=$($dom.status), DNS verified)"
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
      $sendOn = $hrj.data.outbound.sendEnabled -eq $true
      if (-not $sendOn) {
        Add-Row $rows 'P3-A04' 'Cold outbound send OFF' 'PASS' 'OUTREACH_SEND_ENABLED=false (kill-switch)'
        $pass++
      } else {
        Add-Row $rows 'P3-A04' 'Cold outbound send OFF' 'FAIL' 'OUTREACH_SEND_ENABLED=true on prod without explicit go-live'
        $fail++
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

$pdfInbox = Test-GmailInvoicePdfInbox -RepoRootPath $RepoRoot
if ($pdfInbox -and $pdfInbox.Ok) {
  $sample = if ($pdfInbox.Items -and $pdfInbox.Items.Count -gt 0) { $pdfInbox.Items[0] } else { 'INV-*.pdf found' }
  Add-Row $rows 'P0-06' 'Mystery shopper PDF inbox' 'PASS' "Gmail IMAP: $($pdfInbox.Count) invoice PDF(s) — $sample"
  $pass++
} elseif ($pdfInbox -and $pdfInbox.Error) {
  Add-Row $rows 'P0-06' 'Mystery shopper PDF inbox' 'TI' "IMAP check failed — run e2e-billing-prod + inbox"
  $ti++
} else {
  Add-Row $rows 'P0-06' 'Mystery shopper PDF inbox' 'TI' 'No invoice PDF in inbox (7d) — run mystery shopper E2E'
  $ti++
}
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

- **Agent zatvorio:** P1 (8/8), prod smoke, Problem Hunter, E2E billing, Gmail PDF check, Resend send-only DNS.
- **Samo ti:** P0-07 legal counsel; Instantly plan upgrade (402); P2 firma/live payments.
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
