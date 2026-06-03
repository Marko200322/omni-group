<#
.SYNOPSIS
  Provera da li je CI zelen i ispis koraka za GitHub branch protection (bez gh auth).

.EXAMPLE
  .\scripts\branch-protection-ready.ps1
#>
#Requires -Version 5.1
param(
  [string]$Repo = 'Marko200322/omni-group',
  [string]$Branch = 'main'
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir

Write-Host '=== branch-protection-ready ===' -ForegroundColor Cyan
Write-Host ''

$url = "https://api.github.com/repos/$Repo/actions/runs?per_page=1&branch=$Branch"
$run = (Invoke-RestMethod -Uri $url -Headers @{ 'User-Agent' = 'omni-group-scripts' }).workflow_runs[0]

if (-not $run) {
  Write-Host 'FAIL: nema workflow run-ova na main.' -ForegroundColor Red
  exit 1
}

$sha = $run.head_sha.Substring(0, 7)
$label = if ($run.conclusion) { $run.conclusion } else { $run.status }
Write-Host ("Poslednji CI run #{0}  {1}  [{2}]" -f $run.run_number, $sha, $label) -ForegroundColor $(if ($label -eq 'success') { 'Green' } else { 'Red' })
Write-Host $run.html_url -ForegroundColor DarkGray

if ($run.status -ne 'completed' -or $run.conclusion -ne 'success') {
  Write-Host ''
  Write-Host 'FAIL: poslednji run na main nije zelen - popravi CI pre branch protection.' -ForegroundColor Red
  exit 1
}

$jobs = (Invoke-RestMethod -Uri $run.jobs_url -Headers @{ 'User-Agent' = 'omni-group-scripts' }).jobs
$failed = @($jobs | Where-Object { $_.conclusion -and $_.conclusion -ne 'success' })
if ($failed.Count -gt 0) {
  Write-Host ''
  Write-Host 'FAIL: neki job-ovi nisu success:' -ForegroundColor Red
  $failed | ForEach-Object { Write-Host ("  {0}: {1}" -f $_.name, $_.conclusion) -ForegroundColor Red }
  exit 1
}

Write-Host ''
Write-Host 'Job-ovi (svi PASS):' -ForegroundColor Green
foreach ($j in $jobs | Sort-Object name) {
  Write-Host ("  {0}" -f $j.name) -ForegroundColor DarkGray
}

Write-Host ''
Write-Host 'CI spreman za branch protection.' -ForegroundColor Green
Write-Host ''
Write-Host 'GitHub koraci (vlasnik, ~5 min):' -ForegroundColor Cyan
Write-Host ("  1. https://github.com/{0}/settings/branches" -f $Repo) -ForegroundColor DarkGray
Write-Host '  2. Add rule - pattern: main' -ForegroundColor DarkGray
Write-Host '  3. Require a pull request before merging' -ForegroundColor DarkGray
Write-Host '  4. Require status checks - izaberi svih 5:' -ForegroundColor DarkGray
Write-Host '       Python (Doslednost dok + pytest)' -ForegroundColor DarkGray
Write-Host '       Atina SaaS (test:ci)' -ForegroundColor DarkGray
Write-Host '       Omnigroup web (Next.js build)' -ForegroundColor DarkGray
Write-Host '       Atina System (verify:ci)' -ForegroundColor DarkGray
Write-Host '       Compose (docker compose config)' -ForegroundColor DarkGray
Write-Host ''
Write-Host 'Runbook: docs/GIT-BRANCH-PROTECTION.md | evidencija: docs/GIT-A-EVIDENCE-LATEST.md' -ForegroundColor DarkGray
exit 0
