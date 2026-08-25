#Requires -Version 5.1
<#
.SYNOPSIS
  Mesečni burn tracker za M4 ops budžet (€550 default) — plan + ledger + runway.

.DESCRIPTION
  Čita monthlyBudgetEur iz deploy.config.json.
  Ledger: deploy-secrets.local/budget-burn-ledger.json (lokalno, nije secret ključ).

.EXAMPLE
  .\scripts\m4-budget-burn-tracker.ps1
  .\scripts\m4-budget-burn-tracker.ps1 -AddSpend -Provider OpenRouter -AmountEur 12.5 -Note "3 isporuke"
  .\scripts\m4-budget-burn-tracker.ps1 -AddSpend -Provider Resend -AmountEur 20 -Note "Pro plan"
  .\scripts\m4-budget-burn-tracker.ps1 -AddTopup -AmountEur 550 -Note "avgust ops"
  .\scripts\m4-budget-burn-tracker.ps1 -SeedMonthPlan
#>
param(
  [switch]$AddSpend,
  [switch]$AddTopup,
  [switch]$SeedMonthPlan,
  [ValidateSet(
    'OpenRouter', 'Resend', 'Apify', 'Hunter', 'NeverBounce', 'ZeroBounce',
    'Domain', 'Other', ''
  )]
  [string]$Provider = '',
  [double]$AmountEur = 0,
  [string]$Note = '',
  [string]$Month = '',
  [string]$RepoRoot = ''
)

$ErrorActionPreference = 'Stop'

if (-not $RepoRoot) {
  $RepoRoot = Split-Path -Parent $PSScriptRoot
}

$cfgPath = Join-Path $RepoRoot 'deploy-secrets.local\deploy.config.json'
$ledgerPath = Join-Path $RepoRoot 'deploy-secrets.local\budget-burn-ledger.json'
$templatePath = Join-Path $RepoRoot 'deploy-secrets.local\budget-burn-ledger.template.json'

function Get-MonthKey([datetime]$d) {
  return $d.ToString('yyyy-MM')
}

function Get-MonthlyBudget([string]$ConfigPath) {
  $default = 550
  if (-not (Test-Path $ConfigPath)) { return $default }
  $cfg = Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $n = 0
  try { $n = [int]$cfg.monthlyBudgetEur } catch { $n = 0 }
  if ($n -lt 50) { return $default }
  return $n
}

function Get-DefaultPlan([int]$Budget) {
  # Quality start: Resend Pro included. VPS/domain excluded.
  $resend = 20
  $openRouter = [math]::Min(120, [math]::Floor($Budget * 0.22))
  $apify = 25
  $hunter = 45
  $never = 20
  $used = $resend + $openRouter + $apify + $hunter + $never
  $buffer = [math]::Max(0, $Budget - $used)
  return @(
    @{ provider = 'Resend'; eur = $resend; note = 'Pro - kontakt + marketing domen' },
    @{ provider = 'OpenRouter'; eur = $openRouter; note = 'AI isporuke + draftovi' },
    @{ provider = 'Apify'; eur = $apify; note = 'Dnevni hunt / scrape' },
    @{ provider = 'Hunter'; eur = $hunter; note = 'Starter kad free nestane (inace 0)' },
    @{ provider = 'NeverBounce'; eur = $never; note = 'Tek kad outbound send ON' },
    @{ provider = 'Buffer'; eur = $buffer; note = 'Isporuke / hitno / rezerva' }
  )
}

function New-EmptyLedger([string]$MonthKey, [int]$Budget) {
  $plan = Get-DefaultPlan $Budget
  return [ordered]@{
    schemaVersion = 1
    currency = 'EUR'
    monthlyBudgetEur = $Budget
    note = 'Owner ops burn ledger. VPS + root domain excluded.'
    months = @{
      $MonthKey = @{
        plan = @($plan | ForEach-Object {
          [ordered]@{ provider = $_.provider; plannedEur = $_.eur; note = $_.note }
        })
        entries = @()
      }
    }
  }
}

function Ensure-Ledger([string]$Path, [string]$MonthKey, [int]$Budget) {
  if (-not (Test-Path $Path)) {
    $dir = Split-Path $Path -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    if (Test-Path $templatePath) {
      $raw = Get-Content $templatePath -Raw -Encoding UTF8 | ConvertFrom-Json
      $ledger = $raw
      $ledger.monthlyBudgetEur = $Budget
    } else {
      $ledger = New-EmptyLedger $MonthKey $Budget
    }
    if (-not $ledger.months.$MonthKey) {
      $empty = New-EmptyLedger $MonthKey $Budget
      $ledger | Add-Member -NotePropertyName months -NotePropertyValue @{} -Force -ErrorAction SilentlyContinue
      if (-not $ledger.months) { $ledger.months = @{} }
      $ledger.months | Add-Member -NotePropertyName $MonthKey -NotePropertyValue $empty.months.$MonthKey -Force
    }
    Save-Ledger $Path $ledger
    return $ledger
  }
  $ledger = Get-Content $Path -Raw -Encoding UTF8 | ConvertFrom-Json
  if (-not $ledger.months.PSObject.Properties.Name -contains $MonthKey) {
    $fresh = New-EmptyLedger $MonthKey $Budget
    $monthObj = $fresh.months.$MonthKey
    # ConvertFrom-Json months is PSCustomObject - add property
    $ledger.months | Add-Member -MemberType NoteProperty -Name $MonthKey -Value $monthObj -Force
    Save-Ledger $Path $ledger
  }
  return $ledger
}

function Save-Ledger([string]$Path, $Ledger) {
  # Normalize to plain objects so ConvertTo-Json stays stable across runs
  $json = $Ledger | ConvertTo-Json -Depth 10
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($Path, $json + "`n", $utf8)
}

function Add-LedgerEntry([string]$Path, [string]$MonthKey, [int]$Budget, [hashtable]$Entry) {
  $ledger = Ensure-Ledger $Path $MonthKey $Budget
  $ledger.monthlyBudgetEur = $Budget
  $block = $ledger.months.$MonthKey
  $list = @()
  foreach ($e in @($block.entries)) {
    if ($null -ne $e) { $list += $e }
  }
  $list += [pscustomobject]$Entry
  $block.entries = $list
  Save-Ledger $Path $ledger
}

function Get-MonthBlock($Ledger, [string]$MonthKey) {
  return $Ledger.months.$MonthKey
}

function Sum-ByType($Entries, [string]$Type) {
  $sum = 0.0
  foreach ($e in @($Entries)) {
    if ($null -eq $e) { continue }
    if ([string]$e.type -eq $Type) {
      $sum += [double]$e.amountEur
    }
  }
  return [math]::Round($sum, 2)
}

function Sum-Spend-ByProvider($Entries) {
  $map = @{}
  foreach ($e in @($Entries)) {
    if ($null -eq $e) { continue }
    if ([string]$e.type -ne 'spend') { continue }
    $p = [string]$e.provider
    if (-not $p) { $p = 'Other' }
    if (-not $map.ContainsKey($p)) { $map[$p] = 0.0 }
    $map[$p] += [double]$e.amountEur
  }
  return $map
}

function Show-Report($Ledger, [string]$MonthKey, [int]$Budget) {
  $block = Get-MonthBlock $Ledger $MonthKey
  $entries = @($block.entries)
  $spent = Sum-ByType $entries 'spend'
  $topup = Sum-ByType $entries 'topup'
  $pool = if ($topup -gt 0) { $topup } else { $Budget }
  $remaining = [math]::Round($pool - $spent, 2)

  $now = Get-Date
  $monthStart = [datetime]::ParseExact(($MonthKey + '-01'), 'yyyy-MM-dd', $null)
  $daysInMonth = [datetime]::DaysInMonth($monthStart.Year, $monthStart.Month)
  $dayOfMonth = if ($now.ToString('yyyy-MM') -eq $MonthKey) { $now.Day } else { $daysInMonth }
  $daysLeft = [math]::Max(0, $daysInMonth - $dayOfMonth + 1)
  $daysElapsed = [math]::Max(1, $dayOfMonth)

  $dailyBurn = if ($daysElapsed -gt 0) { [math]::Round($spent / $daysElapsed, 2) } else { 0 }
  $runwayDays = if ($dailyBurn -gt 0) { [math]::Floor($remaining / $dailyBurn) } else { $daysLeft }
  $paceOk = ($spent -le (($pool / $daysInMonth) * $dayOfMonth * 1.05))

  Write-Host ''
  Write-Host "=== M4 budget burn - $MonthKey ===" -ForegroundColor Cyan
  $poolLine = 'Budget pool:     EUR {0}  | topups EUR {1} | default month EUR {2}' -f $pool, $topup, $Budget
  Write-Host $poolLine
  Write-Host ('Spent:           EUR {0}' -f $spent) -ForegroundColor Yellow
  $remColor = if ($remaining -lt ($pool * 0.2)) { 'Red' } else { 'Green' }
  Write-Host ('Remaining:       EUR {0}' -f $remaining) -ForegroundColor $remColor
  $dayLine = 'Day of month:    {0}/{1}  | {2} days left incl. today' -f $dayOfMonth, $daysInMonth, $daysLeft
  Write-Host $dayLine
  Write-Host ('Daily burn so far: EUR {0}/day' -f $dailyBurn)
  if ($dailyBurn -le 0) {
    Write-Host 'Runway:           n/a (nema spend unosa - upisi topup/spend)' -ForegroundColor DarkGray
  } else {
    $color = if ($runwayDays -ge $daysLeft) { 'Green' } elseif ($runwayDays -ge [math]::Ceiling($daysLeft / 2)) { 'Yellow' } else { 'Red' }
    $runLine = 'Runway @ current burn: ~{0} days (need {1} to month end)' -f $runwayDays, $daysLeft
    Write-Host $runLine -ForegroundColor $color
  }
  $paceText = if ($paceOk) { 'OK' } else { 'OVER pace - uspori OpenRouter/Apify' }
  Write-Host ('Pace vs linear:  {0}' -f $paceText) -ForegroundColor $(if ($paceOk) { 'Green' } else { 'Yellow' })

  Write-Host ''
  Write-Host '--- Plan (preporuka) ---' -ForegroundColor Cyan
  $byProv = Sum-Spend-ByProvider $entries
  foreach ($row in @($block.plan)) {
    $p = [string]$row.provider
    $planned = [double]$row.plannedEur
    $actual = if ($byProv.ContainsKey($p)) { [math]::Round($byProv[$p], 2) } else { 0 }
    $mark = if ($actual -gt $planned -and $p -ne 'Buffer') { '!' } else { ' ' }
    $planLine = '{0} {1,-14} plan EUR {2,6}  spent EUR {3,6}  {4}' -f $mark, $p, $planned, $actual, $row.note
    Write-Host $planLine
  }

  $otherSpend = 0.0
  foreach ($k in $byProv.Keys) {
    $known = $false
    foreach ($row in @($block.plan)) {
      if ($row.provider -eq $k) { $known = $true; break }
    }
    if (-not $known) { $otherSpend += $byProv[$k] }
  }
  if ($otherSpend -gt 0) {
    Write-Host ('  {0,-14}                spent EUR {1,6}' -f 'Other*', ([math]::Round($otherSpend, 2)))
  }

  Write-Host ''
  Write-Host '--- Recent entries (max 12) ---' -ForegroundColor Cyan
  $recent = @($entries) | Select-Object -Last 12
  if ($recent.Count -eq 0) {
    Write-Host '  (prazno - AddTopup 550 pa AddSpend kad uplatis API)' -ForegroundColor DarkGray
  } else {
    foreach ($e in $recent) {
      Write-Host ('  {0}  {1,-6}  {2,-12}  EUR {3,7}  {4}' -f $e.date, $e.type, $e.provider, $e.amountEur, $e.note)
    }
  }

  Write-Host ''
  Write-Host "Ledger: $ledgerPath" -ForegroundColor DarkGray
  Write-Host 'Add spend:  .\scripts\m4-budget-burn-tracker.ps1 -AddSpend -Provider OpenRouter -AmountEur 15 -Note "..."' -ForegroundColor DarkGray
  Write-Host 'Add topup:  .\scripts\m4-budget-burn-tracker.ps1 -AddTopup -AmountEur 550 -Note "mesec"' -ForegroundColor DarkGray
  Write-Host ''
}

# --- main ---
$budget = Get-MonthlyBudget $cfgPath
$monthKey = if ($Month) { $Month } else { Get-MonthKey (Get-Date) }
$ledger = Ensure-Ledger $ledgerPath $monthKey $budget
$ledger.monthlyBudgetEur = $budget

if ($SeedMonthPlan) {
  $fresh = New-EmptyLedger $monthKey $budget
  $existing = Get-MonthBlock $ledger $monthKey
  $keptEntries = @($existing.entries)
  $fresh.months.$monthKey.entries = $keptEntries
  $ledger.months | Add-Member -MemberType NoteProperty -Name $monthKey -Value $fresh.months.$monthKey -Force
  Save-Ledger $ledgerPath $ledger
  Write-Host "Plan seeded for $monthKey (entries kept)." -ForegroundColor Green
}

if ($AddTopup) {
  if ($AmountEur -le 0) { throw '-AmountEur must be > 0 for topup' }
  Add-LedgerEntry $ledgerPath $monthKey $budget @{
    date = (Get-Date).ToString('yyyy-MM-dd')
    type = 'topup'
    provider = 'Pool'
    amountEur = [math]::Round($AmountEur, 2)
    note = $(if ($Note) { $Note } else { 'monthly ops topup' })
  }
  Write-Host ('Topup recorded: EUR {0}' -f ([math]::Round($AmountEur, 2))) -ForegroundColor Green
}

if ($AddSpend) {
  if ($AmountEur -le 0) { throw '-AmountEur must be > 0 for spend' }
  if (-not $Provider) { throw '-Provider required for spend (OpenRouter|Resend|Apify|Hunter|...)' }
  Add-LedgerEntry $ledgerPath $monthKey $budget @{
    date = (Get-Date).ToString('yyyy-MM-dd')
    type = 'spend'
    provider = $Provider
    amountEur = [math]::Round($AmountEur, 2)
    note = $(if ($Note) { $Note } else { '' })
  }
  Write-Host ('Spend recorded: {0} EUR {1}' -f $Provider, ([math]::Round($AmountEur, 2))) -ForegroundColor Yellow
}

$ledger = Get-Content $ledgerPath -Raw -Encoding UTF8 | ConvertFrom-Json
Show-Report $ledger $monthKey $budget
