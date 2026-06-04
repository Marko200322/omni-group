<#
.SYNOPSIS
  Proverava da li je GitHub branch protection ukljucen na main (zahteva gh auth).

.EXAMPLE
  .\scripts\check-branch-protection.ps1
#>
#Requires -Version 5.1
param(
  [string]$Repo = 'Marko200322/omni-group',
  [string]$Branch = 'main'
)

$ErrorActionPreference = 'Stop'
$expected = @(
  'Python (Doslednost dok + pytest)'
  'Atina SaaS (test:ci)'
  'Omnigroup web (Next.js build)'
  'Atina System (verify:ci)'
  'Compose (docker compose config)'
)

Write-Host '=== check-branch-protection ===' -ForegroundColor Cyan
Write-Host ''

$ghOk = $false
try {
  gh auth status 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { $ghOk = $true }
} catch { }

if (-not $ghOk) {
  Write-Host 'SKIP: gh nije ulogovan - ne mogu citati GitHub Settings.' -ForegroundColor Yellow
  Write-Host '  gh auth login  |  owner-protection.cmd za checklist' -ForegroundColor DarkGray
  exit 0
}

$prev = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$raw = gh api "repos/$Repo/branches/$Branch/protection" 2>&1
$code = $LASTEXITCODE
$ErrorActionPreference = $prev
$text = ($raw | Out-String).Trim()

if ($code -ne 0) {
  if ($text -match '404|Branch not protected|Not Found') {
    Write-Host ("FAIL: {0} nema branch protection rule." -f $Branch) -ForegroundColor Red
    Write-Host '  Pokreni: scripts\owner-protection.cmd' -ForegroundColor Yellow
    exit 1
  }
  Write-Host "FAIL: GitHub API - $text" -ForegroundColor Red
  exit 1
}

$data = $text | ConvertFrom-Json
Write-Host ("OK: {0} ima branch protection." -f $Branch) -ForegroundColor Green

if ($data.required_pull_request_reviews) {
  Write-Host '  Require PR before merge: da' -ForegroundColor DarkGray
} else {
  Write-Host '  NAPOMENA: Require PR nije ukljucen' -ForegroundColor Yellow
}

$contexts = @()
if ($data.required_status_checks -and $data.required_status_checks.contexts) {
  $contexts = @($data.required_status_checks.contexts)
}
if ($contexts.Count -eq 0) {
  Write-Host '  NAPOMENA: nema required status checks - dodaj 5 check-ova' -ForegroundColor Yellow
  exit 1
}

Write-Host ("  Required checks ({0}):" -f $contexts.Count) -ForegroundColor DarkGray
foreach ($c in $contexts) {
  Write-Host ("    - {0}" -f $c) -ForegroundColor DarkGray
}

$missing = @()
foreach ($e in $expected) {
  $hit = @($contexts | Where-Object { $_ -eq $e -or $_ -like "*$e*" }).Count -gt 0
  if (-not $hit) { $missing += $e }
}
if ($missing.Count -gt 0) {
  Write-Host ''
  Write-Host 'NAPOMENA: nedostaju ocekivani check-ovi:' -ForegroundColor Yellow
  $missing | ForEach-Object { Write-Host ("  - {0}" -f $_) -ForegroundColor Yellow }
  Write-Host '  vidi print-branch-protection-checklist.ps1' -ForegroundColor DarkGray
  exit 1
}

Write-Host ''
Write-Host 'branch protection: spreman za prepare-branch-protection-pr.ps1 -Push' -ForegroundColor Green
exit 0
