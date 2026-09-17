#Requires -Version 5.1
<#
.SYNOPSIS
  Sprint: keep-warm + purge failed outbound + prod E2E billing + evidence doc.

.EXAMPLE
  .\scripts\sprint-prod-ready.ps1
#>
param(
  [string]$WebBase = 'https://omnigrouptech.com'
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss K'
$evidenceDir = Join-Path $repoRoot 'docs\evidence'
$evidencePath = Join-Path $evidenceDir 'SPRINT-PROD-READY-LATEST.md'
New-Item -ItemType Directory -Force -Path $evidenceDir | Out-Null

$results = [ordered]@{}

Write-Host '=== SPRINT prod-ready ===' -ForegroundColor Cyan

Write-Host '-- 1/4 keep-warm cron --' -ForegroundColor Yellow
& (Join-Path $scriptsDir 'install-keep-warm-cron.ps1') -RunOnceNow
$results['keepWarm'] = 'PASS (cron installed)'

Write-Host '-- 2/4 purge failed outbound --' -ForegroundColor Yellow
& (Join-Path $scriptsDir 'purge-failed-outbound.ps1')
$results['purgeFailedOutbound'] = 'PASS'

Write-Host '-- 3/4 contact smoke --' -ForegroundColor Yellow
& (Join-Path $scriptsDir 'test-contact-resend.ps1') -WebBase $WebBase -Prod
$results['contact'] = 'PASS'

Write-Host '-- 4/4 E2E billing prod --' -ForegroundColor Yellow
$e2eJson = & (Join-Path $scriptsDir 'e2e-billing-prod.ps1') -WebBase $WebBase -DeliverableId audit 2>&1 | Out-String
if ($e2eJson -notmatch 'e2e-billing-prod: PASS') { throw "E2E prod failed:`n$e2eJson" }
$results['e2eBillingProd'] = 'PASS'

Write-Host '-- cold vs warm probe --' -ForegroundColor Yellow
$probe = @()
foreach ($u in @("$WebBase/api/health", 'https://api.omnigrouptech.com/health')) {
  $sw = [Diagnostics.Stopwatch]::StartNew()
  $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 90
  $sw.Stop()
  $probe += "| $u | $($r.StatusCode) | $($sw.ElapsedMilliseconds) ms |"
}

$md = @"
# Sprint prod-ready — evidence

**Date:** $stamp  
**Web:** $WebBase

## Results

| Step | Status |
|------|--------|
| Keep-warm cron + RunOnceNow | $($results.keepWarm) |
| Purge failed outbound | $($results.purgeFailedOutbound) |
| Contact smoke (Resend + CRM) | $($results.contact) |
| E2E billing prod (audit) | $($results['e2eBillingProd']) |

## Latency probe (post warm)

| URL | Status | ms |
|-----|--------|-----|
$($probe -join "`n")

## Notes

- Keep-warm: crontab ``*/5 * * * *`` → ``/var/log/keep-warm-prod.log``
- Outbound ``failed`` rows purged from ``outbound_messages``
- E2E: deliverable ``audit`` → mark-sent → confirm → fulfillment ``completed``
- Warm lean mode unchanged (M3, hunt cron off)

## Re-run

``````powershell
.\scripts\sprint-prod-ready.ps1
.\scripts\e2e-billing-prod.ps1
``````
"@

Set-Content -Path $evidencePath -Value $md -Encoding UTF8
Write-Host "Evidence: $evidencePath" -ForegroundColor Green
Write-Host '=== SPRINT COMPLETE ===' -ForegroundColor Green
