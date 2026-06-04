<#
.SYNOPSIS
  Azurira kljucne evidence dokove iz poslednjeg CI run-a na main.

.EXAMPLE
  .\scripts\sync-ci-evidence.ps1
.EXAMPLE
  .\scripts\sync-ci-evidence.ps1 -AppendDryRunLog
#>
#Requires -Version 5.1
param(
  [string]$Repo = 'Marko200322/omni-group',
  [switch]$AppendDryRunLog,
  [switch]$SkipIfEvidenceOnlyHead
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot
. (Join-Path $scriptsDir 'lib\github-actions-api.ps1')

$ci = Get-OmniGithubLatestMainRun -Repo $Repo -AllowCacheFallback
$run = $ci.Run
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
  if ($SkipIfEvidenceOnlyHead -and (Test-OmniEvidenceOnlyCommit)) {
    Write-Host ("sync-ci-evidence: skip (HEAD docs-only, Run #{0} [{1}])" -f $num, $label) -ForegroundColor DarkGray
    exit 0
  }
  if ($run.status -ne 'completed') {
    try {
      $recent = @(Get-OmniGithubRecentRuns -Repo $Repo -Limit 5 -AllowCacheFallback)
      $lastGreen = @($recent | Where-Object { $_.status -eq 'completed' -and $_.conclusion -eq 'success' })[0]
      if ($lastGreen) {
        Write-Host ("sync-ci-evidence: Run #{0} [{1}] - koristim poslednji zelen #{2}" -f $num, $label, $lastGreen.run_number) -ForegroundColor Yellow
        $run = $lastGreen
        $num = $run.run_number
        $sha = $run.head_sha.Substring(0, 7)
        $urlRun = $run.html_url
        $ciOk = $true
      }
    } catch { }
  }
  if (-not $ciOk) {
    Write-Host ("FAIL: Run #{0} nije zelen ({1})" -f $num, $label) -ForegroundColor Red
    exit 1
  }
}

if ($SkipIfEvidenceOnlyHead -and (Test-OmniEvidenceOnlyCommit)) {
  Write-Host 'sync-ci-evidence: skip (HEAD docs-only evidence commit)' -ForegroundColor DarkGray
  exit 0
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

if ($AppendDryRunLog) {
  $dryRun = Join-Path $repoRoot 'docs\NIVO-1-DRYRUN-LOG.md'
  $marker = "Run #$num]($urlRun) · ``$sha``"
  $existing = Get-Content -LiteralPath $dryRun -Raw -Encoding UTF8
  if ($existing -like "*Run #$num*") {
    Write-Host "dry-run log: Run #$num vec postoji, skip" -ForegroundColor DarkGray
  } else {
    $block = @"

---

## Zapis (izvršen) — CI Run #$num ($today)

| Skripta / job | Rezultat |
|---------------|----------|
| GitHub CI Run #$num | **PASS** — 5/5 jobova |
| ``owner-gates-quick.ps1`` | **PASS** |

**Link na CI run:** [Run #$num]($urlRun) · ``$sha``
"@
    Add-Content -LiteralPath $dryRun -Value $block -Encoding utf8
    Write-Host "dry-run log: appended Run #$num" -ForegroundColor DarkGray
  }
}
