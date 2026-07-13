#Requires -Version 5.1
<#
.SYNOPSIS
  Mesečni operativni budžet (bez VPS/domena). Default: €200 — M0 launch.

  Koristi: deploy-from-local-secrets.ps1, prepare-vps-prod.ps1
#>

function Get-DefaultMonthlyBudgetEur() {
  return 200
}

function Resolve-MonthlyBudgetEur([object]$ConfigValue) {
  if ($null -eq $ConfigValue) { return Get-DefaultMonthlyBudgetEur }
  $n = 0
  if ($ConfigValue -is [int] -or $ConfigValue -is [long]) {
    $n = [int]$ConfigValue
  } elseif ($ConfigValue -is [string] -and $ConfigValue.Trim() -match '^\d+$') {
    $n = [int]$ConfigValue.Trim()
  } else {
    return Get-DefaultMonthlyBudgetEur
  }
  if ($n -lt 50) { return 50 }
  if ($n -gt 5000) { return 5000 }
  return $n
}

function Get-BudgetAiDailyCapUsd([int]$MonthlyBudgetEur) {
  if ($MonthlyBudgetEur -le 200) { return '0.8' }
  if ($MonthlyBudgetEur -le 400) { return '1.5' }
  if ($MonthlyBudgetEur -le 600) { return '2.5' }
  return '5'
}

function Get-BudgetAtinaEnvLines([int]$MonthlyBudgetEur) {
  $aiDaily = Get-BudgetAiDailyCapUsd $MonthlyBudgetEur
  return @(
    "OWNER_MONTHLY_BUDGET_EUR=$MonthlyBudgetEur",
    "AUTONOMY_MAX_SPEND_PER_DAY_USD=$aiDaily",
    'AUTONOMY_MAX_SPEND_PER_TICK_USD=0.25',
    'DELIVERABLE_FULFILLMENT_MAX_RETRY_ATTEMPTS=2',
    'DELIVERABLE_FULFILLMENT_MAX_CHECKLIST_RETRIES=2'
  )
}

function Get-BudgetWebEnvLines([int]$MonthlyBudgetEur) {
  return @(
    "NEXT_PUBLIC_MONTHLY_BUDGET_EUR=$MonthlyBudgetEur",
    'BFF_AI_MEMORY_RATE_LIMIT_MAX=20',
    'BFF_AUTH_RATE_LIMIT_MAX=90'
  )
}

function Set-EnvLineInBudgetFile([string]$FilePath, [string]$Key, [string]$Value) {
  if (-not (Test-Path $FilePath)) { return }
  $escaped = [regex]::Escape($Key)
  $lines = Get-Content $FilePath
  $found = $false
  $out = foreach ($line in $lines) {
    if ($line -match "^\s*$escaped\s*=") {
      $found = $true
      "$Key=$Value"
    } else {
      $line
    }
  }
  if (-not $found) { $out += "$Key=$Value" }
  Set-Content -Path $FilePath -Value $out -Encoding UTF8
}

function Apply-BudgetProdEnvFiles([string]$RepoRoot, [int]$MonthlyBudgetEur) {
  $rootEnv = Join-Path $RepoRoot '.env.vps.prod'
  $atinaEnv = Join-Path $RepoRoot 'atina-platform\atina\.env.vps.prod'
  $webEnv = Join-Path $RepoRoot 'apps\omnigroup-web\.env.vps.production'

  foreach ($line in (Get-BudgetAtinaEnvLines $MonthlyBudgetEur)) {
    if ($line -match '^([A-Z0-9_]+)=(.*)$') {
      Set-EnvLineInBudgetFile $atinaEnv $Matches[1] $Matches[2]
    }
  }
  foreach ($line in (Get-BudgetWebEnvLines $MonthlyBudgetEur)) {
    if ($line -match '^([A-Z0-9_]+)=(.*)$') {
      Set-EnvLineInBudgetFile $webEnv $Matches[1] $Matches[2]
    }
  }
  Set-EnvLineInBudgetFile $rootEnv 'OWNER_MONTHLY_BUDGET_EUR' "$MonthlyBudgetEur"
}

function Write-BudgetPlanSummary([int]$MonthlyBudgetEur) {
  $aiDaily = Get-BudgetAiDailyCapUsd $MonthlyBudgetEur
  $aiMo = [math]::Round([double]$aiDaily * 30 * 0.92, 0)
  Write-Host "  Budget:  EUR $MonthlyBudgetEur/mo operational (VPS + domain extra)" -ForegroundColor Cyan
  Write-Host "  AI cap:  ~`$$aiDaily/day (~EUR $aiMo/mo max)" -ForegroundColor DarkGray
  Write-Host '  Sell:    Setup Quick, Landing, Audit, Support - warm outreach only' -ForegroundColor DarkGray
}
