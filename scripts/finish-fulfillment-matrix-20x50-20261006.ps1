#Requires -Version 5.1
<#
  Wait for in-flight 20x50 prod matrix, retry FAIL cells, write FINAL evidence, commit+push.
  Does NOT start a second full matrix while the watched process is still running.
#>
param(
  [int]$WatchPid = 10168,
  [string]$ReportCsv = '',
  [int]$PollMin = 12,
  [int]$SleepBetweenSec = 25,
  [int]$MaxFailRetryRounds = 2
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not $ReportCsv) {
  $ReportCsv = Join-Path $repoRoot 'docs\evidence\fulfillment-matrix-prod-20x50-20261006.csv'
}
$ReportCsv = [System.IO.Path]::GetFullPath($ReportCsv)
$statusLog = Join-Path $repoRoot 'docs\evidence\_matrix-20x50-finish-status.log'
$matrixScript = Join-Path $repoRoot 'scripts\e2e-fulfillment-matrix-prod.ps1'
$finalMd = Join-Path $repoRoot 'docs\evidence\fulfillment-matrix-prod-20x50-FINAL-20261006.md'
$branch = 'feat/phase10-outreach-send-enabled'

function Write-Status([string]$msg) {
  $line = "{0}  {1}" -f (Get-Date -Format 'o'), $msg
  Add-Content -Path $statusLog -Value $line -Encoding UTF8
  Write-Host $line
}

function Get-LatestRows {
  param([string]$Path)
  $byKey = @{}
  Import-Csv -Path $Path | ForEach-Object {
    $k = "{0}|{1}" -f $_.deliverableId, $_.industryCategory
    $byKey[$k] = $_
  }
  return @($byKey.Values)
}

function Get-Summary {
  param($Rows)
  $g = $Rows | Group-Object status
  $h = @{}
  foreach ($x in $g) { $h[$x.Name] = $x.Count }
  foreach ($n in @('PASS', 'FAIL', 'SKIP')) {
    if (-not $h.ContainsKey($n)) { $h[$n] = 0 }
  }
  return $h
}

Set-Location $repoRoot
Write-Status "finish script started; watching PID $WatchPid; CSV=$ReportCsv"

while ($true) {
  $rows = @()
  if (Test-Path $ReportCsv) { $rows = Get-LatestRows -Path $ReportCsv }
  $dataCount = $rows.Count
  $sum = Get-Summary -Rows $rows
  $proc = Get-Process -Id $WatchPid -ErrorAction SilentlyContinue
  $running = [bool]$proc
  Write-Status ("poll rows={0}/1000 PASS={1} FAIL={2} SKIP={3} matrixPid={4}" -f `
    $dataCount, $sum.PASS, $sum.FAIL, $sum.SKIP, $(if ($running) { 'RUNNING' } else { 'STOPPED' }))

  if ($dataCount -ge 1000 -or -not $running) { break }
  Start-Sleep -Seconds ($PollMin * 60)
}

Write-Status 'matrix complete or process exited; summarizing before retries'
$rows = Get-LatestRows -Path $ReportCsv
$sum = Get-Summary -Rows $rows
Write-Status ("pre-retry unique cells={0} PASS={1} FAIL={2} SKIP={3}" -f $rows.Count, $sum.PASS, $sum.FAIL, $sum.SKIP)

$round = 0
while ($round -lt $MaxFailRetryRounds) {
  $rows = Get-LatestRows -Path $ReportCsv
  $fails = @($rows | Where-Object { $_.status -eq 'FAIL' })
  if ($fails.Count -eq 0) { break }
  $round++
  Write-Status ("FAIL retry round {0}/{1}: {2} cell(s)" -f $round, $MaxFailRetryRounds, $fails.Count)
  foreach ($f in $fails) {
    Write-Status ("  retry {0} @ {1}" -f $f.deliverableId, $f.industryCategory)
    & $matrixScript `
      -DeliverableIds $f.deliverableId `
      -IndustryCategories $f.industryCategory `
      -SleepBetweenSec $SleepBetweenSec `
      -PollSec 210 `
      -ReportCsv $ReportCsv
    if ($LASTEXITCODE -ne 0) {
      Write-Status ("  script exit {0} for {1}@{2}" -f $LASTEXITCODE, $f.deliverableId, $f.industryCategory)
    }
    Start-Sleep -Seconds $SleepBetweenSec
  }
}

$rows = Get-LatestRows -Path $ReportCsv
$sum = Get-Summary -Rows $rows
$failsLeft = @($rows | Where-Object { $_.status -eq 'FAIL' } | Sort-Object deliverableId, industryCategory)

$failTable = if ($failsLeft.Count -eq 0) {
  '_None._'
} else {
  ($failsLeft | ForEach-Object {
    "- ``$($_.deliverableId)`` @ ``$($_.industryCategory)``: $($_.error)"
  }) -join "`n"
}

$md = @"
# Prod fulfillment matrix 20×50 — FINAL (2026-10-06)

- **CSV:** ``docs/evidence/fulfillment-matrix-prod-20x50-20261006.csv``
- **Target:** https://omnigrouptech.com
- **Unique cells (latest row per deliverable×industry):** $($rows.Count)
- **Completed at:** $(Get-Date -Format 'o')

## Counts

| Status | Count |
|--------|------:|
| PASS   | $($sum.PASS) |
| FAIL   | $($sum.FAIL) |
| SKIP   | $($sum.SKIP) |

## Remaining failures

$failTable

## Notes

- Initial run used ``e2e-fulfillment-matrix-prod.ps1 -Resume`` (PID $WatchPid).
- FAIL cells retried up to $MaxFailRetryRounds round(s) via targeted ``-DeliverableIds`` / ``-IndustryCategories`` (``SleepBetweenSec=$SleepBetweenSec``).
- Summary dedupes CSV by latest ``checkedAt`` per cell (append-only log).
- Status log: ``docs/evidence/_matrix-20x50-finish-status.log``

"@
Set-Content -Path $finalMd -Value $md -Encoding UTF8
Write-Status "wrote $finalMd"

Write-Status 'git commit evidence'
$gitEmail = 'matrix-bot@omnigroup.local'
$gitName = 'Matrix Finish Bot'
git -c "user.email=$gitEmail" -c "user.name=$gitName" add $ReportCsv $finalMd $statusLog
$diff = git diff --cached --name-only
if ($diff) {
  git -c "user.email=$gitEmail" -c "user.name=$gitName" commit `
    -m "docs: fulfillment matrix 20x50 prod FINAL evidence (2026-10-06)" `
    -m "PASS=$($sum.PASS) FAIL=$($sum.FAIL) SKIP=$($sum.SKIP) after wait+FAIL retries."
  Write-Status 'commit OK'
} else {
  Write-Status 'nothing to commit'
}

$curBranch = git rev-parse --abbrev-ref HEAD
if ($curBranch -eq $branch) {
  Write-Status "pushing to origin $branch"
  git push origin HEAD
  Write-Status 'push OK'
} else {
  Write-Status "on branch $curBranch (expected $branch); skip push"
}

Write-Status "DONE PASS=$($sum.PASS) FAIL=$($sum.FAIL) SKIP=$($sum.SKIP)"
exit $(if ($sum.FAIL -gt 0) { 1 } else { 0 })
