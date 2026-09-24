#Requires -Version 5.1
<#
  Prod gates + checklist smoke (no deploy, no full matrix).
.EXAMPLE
  .\scripts\run-launch-checklist-tests.ps1
#>
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo
$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
$report = Join-Path $repo 'docs\evidence\LAUNCH-CHECKLIST-TEST-LATEST.md'
$script:lines = @("# Launch checklist tests", "", "**At:** $stamp", "")

function Step {
  param([string]$Name, [scriptblock]$Block)
  Write-Host ">> $Name" -ForegroundColor Cyan
  try {
    & $Block
    if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) { throw "exit=$LASTEXITCODE" }
    $script:lines += "- **PASS** $Name"
    Write-Host "PASS $Name" -ForegroundColor Green
  } catch {
    $msg = $_.Exception.Message
    $script:lines += "- **FAIL** $Name - $msg"
    Write-Host "FAIL $Name - $msg" -ForegroundColor Red
    $script:failed = $true
  }
}

$failed = $false

Step 'verify-billing-catalog-mirror' { & (Join-Path $repo 'scripts\verify-billing-catalog-mirror.ps1') }
Step 'verify-industry-package-matrix-prod' { & (Join-Path $repo 'scripts\verify-industry-package-matrix-prod.ps1') }
Step 'audit-prod-autonomous' { & (Join-Path $repo 'scripts\audit-prod-autonomous.ps1') }

Step 'web health + OG metadata' {
  $landing = Invoke-WebRequest -Uri 'https://omnigrouptech.com/' -UseBasicParsing -TimeoutSec 60
  if ($landing.StatusCode -ne 200) { throw "home HTTP $($landing.StatusCode)" }
  if ($landing.Content -notmatch 'og:title') { throw 'missing og:title' }
  if ($landing.Content -notmatch 'icon\.svg|/icon') { throw 'missing favicon reference' }
  if ($landing.Content -match 'og:image') {
    $script:lines += '  - note: og:image present'
  } else {
    $script:lines += '  - **TI** og:image not in HTML (WhatsApp preview weak)'
  }
}

Step 'dashboard redirect unauthenticated' {
  $head = curl.exe -sI -m 45 'https://omnigrouptech.com/dashboard' 2>&1 | Out-String
  if ($head -notmatch 'HTTP/\S+\s+(307|302|308)') { throw "expected redirect headers; got: $($head.Split("`n")[0])" }
  if ($head -notmatch 'Location:.*/login') { throw 'missing Location /login' }
}

Step 'canonical matrix 20260922 dedupe' {
  $csv = Join-Path $repo 'docs\evidence\fulfillment-matrix-prod-20260922_082458.csv'
  if (-not (Test-Path $csv)) { throw 'missing canonical csv' }
  $r = Import-Csv $csv
  $u = ($r | Group-Object deliverableId, industryCategory).Count
  $latest = $r | Group-Object deliverableId, industryCategory | ForEach-Object { $_.Group[-1] }
  $fail = ($latest | Where-Object status -eq 'FAIL').Count
  if ($u -lt 1000 -or $fail -gt 0) { throw "unique=$u fail=$fail" }
  $script:lines += "  - canonical: $u/1000 PASS"
}

$script:lines += ''
$script:lines += $(if ($script:failed) { '**Verdict: FAIL** - fix items above.' } else { '**Verdict: PASS** (see TI notes in audit / og:image).' })
Set-Content -Path $report -Value ($script:lines -join "`n") -Encoding UTF8
Write-Host "Report: $report" -ForegroundColor DarkGray
if ($script:failed) { exit 1 }
exit 0
