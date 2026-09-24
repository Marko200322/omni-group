#Requires -Version 5.1
<#
.SYNOPSIS
  Report which P3 items are live vs waiting on owner keys/accounts.
#>
$ErrorActionPreference = 'Continue'
$repoRoot = Split-Path -Parent $PSScriptRoot
$site = 'https://omnigrouptech.com'
$api = 'https://api.omnigrouptech.com'

Write-Host '=== P3 ready ===' -ForegroundColor Cyan

function Probe([string]$Url, [string]$Label) {
  try {
    $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 25
    Write-Host ("PASS {0} {1} {2}" -f $Label, $r.StatusCode, $Url) -ForegroundColor Green
    return $true
  } catch {
    Write-Host ("FAIL {0} {1}" -f $Label, $_.Exception.Message) -ForegroundColor Red
    return $false
  }
}

$ok = $true
$ok = (Probe "$site/status" 'status') -and $ok
$ok = (Probe "$site/api/health/live" 'web-live') -and $ok
$ok = (Probe "$api/health" 'atina') -and $ok

Write-Host ''
& (Join-Path $repoRoot 'scripts\import-n8n-workflow.ps1')
if ($LASTEXITCODE -ne 0) { $ok = $false }

Write-Host ''
Write-Host 'Still on you (not code):' -ForegroundColor Yellow
Write-Host '  P2     firma + Stripe LIVE'
Write-Host '  P3-A04 Instantly plan upgrade before cold send'
Write-Host '  P3-A06 ads budget'
Write-Host '  P3-D01 staging VPS'
Write-Host '  P3-D03 Plausible site + plausibleDomain'
Write-Host '  P3-D04 gh auth login, then required CI checks'
Write-Host '  P3-D05 DMARC p=quarantine after monitor data'
Write-Host '  P3-B/C paste vendor keys only if you will use that vendor'

if ($ok) { Write-Host ''; Write-Host 'P3 code path: READY' -ForegroundColor Green; exit 0 }
Write-Host ''; Write-Host 'P3 code path: PARTIAL' -ForegroundColor Yellow
exit 1
