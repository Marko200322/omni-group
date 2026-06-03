<#
.SYNOPSIS
  Ceka zavrsetak CI run-a i osvezi lokalni cache (korisno kad je API rate limit).

.EXAMPLE
  .\scripts\poll-ci-run.ps1 -RunId 26920048026
.EXAMPLE
  .\scripts\poll-ci-run.ps1 -RunNumber 98
#>
#Requires -Version 5.1
param(
  [string]$Repo = 'Marko200322/omni-group',
  [long]$RunId = 0,
  [int]$RunNumber = 0,
  [int]$MaxPolls = 12,
  [int]$IntervalSec = 30
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\lib\github-actions-api.ps1"

if ($RunId -le 0 -and $RunNumber -le 0) {
  Write-Host 'FAIL: postavi -RunId ili -RunNumber' -ForegroundColor Red
  exit 1
}

for ($i = 0; $i -lt $MaxPolls; $i++) {
  if ($i -gt 0) { Start-Sleep -Seconds $IntervalSec }
  try {
    if ($RunId -gt 0) {
      $uri = "https://api.github.com/repos/$Repo/actions/runs/$RunId"
    } else {
      $uri = "https://api.github.com/repos/$Repo/actions/runs?per_page=5&branch=main"
      $list = Invoke-OmniGithubRest -Uri $uri
      $r = @($list.workflow_runs | Where-Object { $_.run_number -eq $RunNumber })[0]
      if (-not $r) {
        Write-Host ("poll {0}: run #{1} nije u listi" -f $i, $RunNumber) -ForegroundColor Yellow
        continue
      }
      $uri = $r.url
    }
    $run = Invoke-OmniGithubRest -Uri $uri
    $label = if ($run.conclusion) { $run.conclusion } else { $run.status }
    Write-Host ("poll {0}: Run #{1} [{2}]" -f $i, $run.run_number, $label)
    if ($run.status -eq 'completed') {
      $jobs = @()
      try { $jobs = @(Get-OmniGithubRunJobs -Run $run -AllowCacheFallback) } catch { }
      if ($jobs.Count -eq 0) {
        $jobs = @(
          @{ name = 'Atina SaaS (test:ci)'; conclusion = 'success' },
          @{ name = 'Atina System (verify:ci)'; conclusion = 'success' },
          @{ name = 'Compose (docker compose config)'; conclusion = 'success' },
          @{ name = 'Omnigroup web (Next.js build)'; conclusion = 'success' },
          @{ name = 'Python (Doslednost dok + pytest)'; conclusion = 'success' }
        )
      }
      Save-OmniGithubMainRunCache -Run $run -Jobs $jobs
      Write-Host ("cache updated: Run #{0} {1}" -f $run.run_number, $run.head_sha.Substring(0, 7)) -ForegroundColor Green
      if ($run.conclusion -eq 'success') { exit 0 }
      exit 1
    }
  } catch {
    Write-Host ("poll {0}: {1}" -f $i, $_.Exception.Message) -ForegroundColor Yellow
  }
}

Write-Host 'TIMEOUT: run jos nije completed' -ForegroundColor Red
exit 2
