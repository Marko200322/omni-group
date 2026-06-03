<#
.SYNOPSIS
  Poslednji GitHub Actions CI (monorepo) status bez gh auth.

.EXAMPLE
  .\scripts\github-ci-status.ps1
#>
#Requires -Version 5.1
param(
  [string]$Repo = 'Marko200322/omni-group',
  [int]$Limit = 1
)

$ErrorActionPreference = 'Stop'
$url = "https://api.github.com/repos/$Repo/actions/runs?per_page=$Limit"
$r = Invoke-RestMethod -Uri $url -Headers @{ 'User-Agent' = 'omni-group-scripts' }

if (-not $r.workflow_runs -or $r.workflow_runs.Count -eq 0) {
  Write-Host 'Nema workflow run-ova.' -ForegroundColor Yellow
  exit 1
}

foreach ($run in $r.workflow_runs) {
  $label = if ($run.conclusion) { $run.conclusion } else { $run.status }
  $color = switch ($label) {
    'success' { 'Green' }
    'failure' { 'Red' }
    'cancelled' { 'Yellow' }
    'in_progress' { 'Cyan' }
    default { 'DarkGray' }
  }
  $sha = $run.head_sha.Substring(0, 7)
  Write-Host ("Run #{0}  {1}  {2}  [{3}]" -f $run.run_number, $sha, $run.display_title, $label) -ForegroundColor $color
  Write-Host "  $($run.html_url)" -ForegroundColor DarkGray

  if ($run.status -eq 'completed') {
    try {
      $jobs = (Invoke-RestMethod -Uri $run.jobs_url -Headers @{ 'User-Agent' = 'omni-group-scripts' }).jobs
      foreach ($j in $jobs | Sort-Object name) {
        $jlabel = if ($j.conclusion) { $j.conclusion } else { $j.status }
        $jc = switch ($jlabel) {
          'success' { 'Green' }
          'failure' { 'Red' }
          'cancelled' { 'Yellow' }
          default { 'DarkGray' }
        }
        Write-Host ("    {0,-40} {1}" -f $j.name, $jlabel) -ForegroundColor $jc
      }
    } catch {
      Write-Host '  (jobs: nije ucitano)' -ForegroundColor DarkGray
    }
  }
}

if ($r.workflow_runs[0].conclusion -eq 'success') { exit 0 }
if ($r.workflow_runs[0].status -eq 'in_progress') { exit 2 }
exit 1
