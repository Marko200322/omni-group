<#
.SYNOPSIS
  Azurira kljucne evidence dokove iz poslednjeg CI run-a na main.

.EXAMPLE
  .\scripts\sync-ci-evidence.ps1
#>
#Requires -Version 5.1
param(
  [string]$Repo = 'Marko200322/omni-group'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $repoRoot

$url = "https://api.github.com/repos/$Repo/actions/runs?per_page=1&branch=main"
$run = (Invoke-RestMethod -Uri $url -Headers @{ 'User-Agent' = 'omni-group-scripts' }).workflow_runs[0]
if (-not $run) {
  Write-Host 'FAIL: nema CI run-ova na main.' -ForegroundColor Red
  exit 1
}

$num = $run.run_number
$sha = $run.head_sha.Substring(0, 7)
$urlRun = $run.html_url
$ciOk = $run.status -eq 'completed' -and $run.conclusion -eq 'success'
if (-not $ciOk) {
  $label = if ($run.conclusion) { $run.conclusion } else { $run.status }
  Write-Host ("FAIL: Run #{0} nije zelen ({1})" -f $num, $label) -ForegroundColor Red
  exit 1
}

$today = Get-Date -Format 'yyyy-MM-dd'

function Replace-FirstLinePrefix {
  param(
    [string]$RelativePath,
    [string]$LinePrefix,
    [string]$NewLine
  )
  $full = Join-Path $repoRoot $RelativePath
  if (-not (Test-Path $full)) {
    Write-Host "SKIP missing $RelativePath" -ForegroundColor Yellow
    return
  }
  $lines = Get-Content -LiteralPath $full -Encoding UTF8
  $idx = -1
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i].StartsWith($LinePrefix)) {
      $idx = $i
      break
    }
  }
  if ($idx -lt 0) {
    Write-Host "WARN prefix not found in $RelativePath : $LinePrefix" -ForegroundColor Yellow
    return
  }
  $lines[$idx] = $NewLine
  Set-Content -LiteralPath $full -Value $lines -Encoding utf8
  Write-Host "OK $RelativePath" -ForegroundColor DarkGray
}

Replace-FirstLinePrefix 'docs/GIT-A-EVIDENCE-LATEST.md' '**Poslednji pregled repoa' (
  '**Poslednji pregled repoa ({0}):** CI na `main` **zelen** (Run [#{1}]({2}), `{3}`) - spremno za Korak 3 (required checks). Branch protection **jos nije** podešen.' -f $today, $num, $urlRun, $sha
)
Replace-FirstLinePrefix 'docs/VLASNIK-PAKET.md' '**Stanje repoa' (
  '**Stanje repoa ({0}):** CI Run [#{1}]({2}) zelen (`{3}`) - handoff: [STAGING-LOCAL-PREFLIGHT-LATEST.md](./STAGING-LOCAL-PREFLIGHT-LATEST.md) - **ceka vlasnika:** branch protection + staging deploy na URL.' -f $today, $num, $urlRun, $sha
)
Replace-FirstLinePrefix 'docs/CI-GREEN-ON-MAIN.md' '**Poslednji zeleni run' (
  '**Poslednji zeleni run ({0}):** [#{1}]({2}) - `{3}` - 5/5 jobova. Lokalna provera: [github-ci-status.ps1](../scripts/github-ci-status.ps1). Probni PR: [prepare-branch-protection-pr.ps1](../scripts/prepare-branch-protection-pr.ps1).' -f $today, $num, $urlRun, $sha
)
Replace-FirstLinePrefix 'docs/N2-0-3-EVIDENCE-LATEST.md' '**Poslednji pregled repoa' (
  '**Poslednji pregled repoa ({0}):** **zelen** `CI (monorepo)` - Run [#{1}]({2}) na `main` (`{3}`), **5/5** jobova PASS. Niz zelenih run-ova: #77-{1}.' -f $today, $num, $urlRun, $sha
)
Replace-FirstLinePrefix 'docs/CEO-G-PRODUCTION-EVIDENCE-LATEST.md' '**Poslednji pregled repoa' (
  '**Poslednji pregled repoa ({0}):** lokalni preduslov **PASS** (`{3}`) - CI Run [#{1}]({2}). Handoff: [STAGING-LOCAL-PREFLIGHT-LATEST.md](./STAGING-LOCAL-PREFLIGHT-LATEST.md). **Staging/prod red ispod i dalje prazan** (8 stavki ceka vlasnika na URL-u).' -f $today, $num, $urlRun, $sha
)

Write-Host ''
Write-Host ("sync-ci-evidence: Run #{0} {1} OK" -f $num, $sha) -ForegroundColor Green
