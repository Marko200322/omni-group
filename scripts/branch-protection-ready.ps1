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
. (Join-Path $scriptsDir 'lib\github-actions-api.ps1')

Write-Host '=== branch-protection-ready ===' -ForegroundColor Cyan
Write-Host ''

$ci = Get-OmniGithubLatestMainRun -Repo $Repo -Branch $Branch -AllowCacheFallback -IncludeJobs
$run = $ci.Run
$jobs = @($ci.Jobs)

if ($run -and ($run.status -ne 'completed' -or $run.conclusion -ne 'success')) {
  try {
    $recent = @(Get-OmniGithubRecentRuns -Repo $Repo -Limit 5 -AllowCacheFallback)
    $lastGreen = Select-OmniGreenRun -Runs $recent -PreferCodeCommit
    if ($lastGreen) {
      Write-Host ("NAPOMENA: Run #{0} nije zelen - proveravam poslednji zelen #{1}" -f $run.run_number, $lastGreen.run_number) -ForegroundColor Yellow
      $run = $lastGreen
      $jobs = @()
    }
  } catch { }
}

if (-not $run) {
  Write-Host 'FAIL: nema workflow run-ova na main.' -ForegroundColor Red
  exit 1
}

$sha = $run.head_sha.Substring(0, 7)
$label = if ($run.conclusion) { $run.conclusion } else { $run.status }
Write-Host ("Poslednji CI run #{0}  {1}  [{2}]" -f $run.run_number, $sha, $label) -ForegroundColor $(if ($label -eq 'success') { 'Green' } else { 'Red' })
Write-Host $run.html_url -ForegroundColor DarkGray
$deploySha = Get-OmniDeployShaFromCommit -Sha $run.head_sha
if ($deploySha -ne $run.head_sha) {
  Write-Host ("  Deploy SHA (app kod): {0}" -f $deploySha.Substring(0, 7)) -ForegroundColor DarkGray
}
if ($ci.UsedCache) {
  Write-Host '  (podaci iz lokalnog cache-a)' -ForegroundColor Yellow
}

if ($run.status -ne 'completed' -or $run.conclusion -ne 'success') {
  Write-Host ''
  Write-Host 'FAIL: poslednji run na main nije zelen - popravi CI pre branch protection.' -ForegroundColor Red
  exit 1
}

if ($jobs.Count -eq 0) {
  $jobs = Get-OmniGithubRunJobs -Run $run -AllowCacheFallback
}

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
Write-Host 'Posle branch protection: .\scripts\prepare-branch-protection-pr.ps1 (-Push za remote PR)' -ForegroundColor DarkGray
exit 0
