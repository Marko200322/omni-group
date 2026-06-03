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
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptsDir 'lib\github-actions-api.ps1')

$runs = @(Get-OmniGithubRecentRuns -Repo $Repo -Limit $Limit -AllowCacheFallback)

if ($runs.Count -eq 0) {
  Write-Host 'Nema workflow run-ova.' -ForegroundColor Yellow
  exit 1
}

foreach ($run in $runs) {
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
      $jobs = @(Get-OmniGithubRunJobs -Run $run -AllowCacheFallback)
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

if ($runs[0].conclusion -eq 'success') { exit 0 }
if ($runs[0].status -eq 'in_progress') { exit 2 }
exit 1
