<#
.SYNOPSIS
  Proverava da li je GitHub branch protection ukljucen na main (gh auth ili GITHUB_TOKEN/GH_TOKEN).

.EXAMPLE
  .\scripts\check-branch-protection.ps1
#>
#Requires -Version 5.1
param(
  [string]$Repo = 'Marko200322/omni-group',
  [string]$Branch = 'main'
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptsDir 'lib\github-actions-api.ps1')

$expected = @(
  'Python (Doslednost dok + pytest)'
  'Atina SaaS (test:ci)'
  'Omnigroup web (Next.js build)'
  'Atina System (verify:ci)'
  'Compose (docker compose config)'
)

Write-Host '=== check-branch-protection ===' -ForegroundColor Cyan
Write-Host ''

function Test-GhAuthOk {
  try {
    gh auth status 2>$null | Out-Null
    return ($LASTEXITCODE -eq 0)
  } catch {
    return $false
  }
}

function Get-BranchProtectionPayload {
  param(
    [string]$Repo,
    [string]$Branch
  )

  if (Test-GhAuthOk) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $raw = gh api "repos/$Repo/branches/$Branch/protection" 2>&1
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    $text = ($raw | Out-String).Trim()
    return [PSCustomObject]@{
      Ok          = ($code -eq 0)
      NotFound    = ($code -ne 0 -and $text -match '404|Branch not protected|Not Found')
      ErrorText   = $text
      Data        = if ($code -eq 0) { $text | ConvertFrom-Json } else { $null }
      AuthSource  = 'gh'
    }
  }

  $token = $env:GITHUB_TOKEN
  if (-not $token) { $token = $env:GH_TOKEN }
  if (-not $token) { return $null }

  $uri = "https://api.github.com/repos/$Repo/branches/$Branch/protection"
  try {
    $data = Invoke-OmniGithubRest -Uri $uri
    return [PSCustomObject]@{
      Ok         = $true
      NotFound   = $false
      ErrorText  = ''
      Data       = $data
      AuthSource = 'token'
    }
  } catch {
    $detail = [string]$_.ErrorDetails.Message
    if (-not $detail) { $detail = $_.Exception.Message }
    $notFound = ($detail -match '404|Branch not protected|Not Found')
    return [PSCustomObject]@{
      Ok         = $false
      NotFound   = $notFound
      ErrorText  = $detail
      Data       = $null
      AuthSource = 'token'
    }
  }
}

$result = Get-BranchProtectionPayload -Repo $Repo -Branch $Branch
if (-not $result) {
  Write-Host 'SKIP: nema GitHub auth (gh auth login ili GITHUB_TOKEN/GH_TOKEN u env).' -ForegroundColor Yellow
  Write-Host '  gh auth login  |  owner-protection.cmd za checklist' -ForegroundColor DarkGray
  exit 0
}

if ($result.NotFound) {
  Write-Host ("FAIL: {0} nema branch protection rule." -f $Branch) -ForegroundColor Red
  Write-Host '  Pokreni: scripts\owner-protection.cmd' -ForegroundColor Yellow
  exit 1
}

if (-not $result.Ok) {
  Write-Host "FAIL: GitHub API ($($result.AuthSource)) - $($result.ErrorText)" -ForegroundColor Red
  exit 1
}

$data = $result.Data
Write-Host ("OK: {0} ima branch protection ({1})." -f $Branch, $result.AuthSource) -ForegroundColor Green

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
