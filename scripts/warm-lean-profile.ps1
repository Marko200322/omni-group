#Requires -Version 5.1
<#
.SYNOPSIS
  Warm prodaja + lean inbound — kontakt/CRM/Telegram ON, Apify/Hunter/outbound OFF.

  Koristi: set-warm-lean-mode.ps1
#>

. (Join-Path $PSScriptRoot 'prod-lean-profile.ps1')

function Get-WarmLeanInboundAtinaEnvLines([int]$MonthlyBudgetEur = 150) {
  $lines = [System.Collections.Generic.List[string]]::new()
  foreach ($line in (Get-ProdLeanAtinaEnvLines)) { [void]$lines.Add($line) }
  foreach ($line in @(
    "FACTORY_PHASE=M3",
    "OWNER_MONTHLY_BUDGET_EUR=$MonthlyBudgetEur",
    'RETAINER_SCHEDULER_ENABLED=true',
    'ENABLE_CRM=true',
    'ENABLE_ANALYTICS=false',
    'SALES_MEETINGS_ENABLED=false',
    'DELIVERABLE_FULFILLMENT_MAX_RETRY_ATTEMPTS=3',
    'DELIVERABLE_FULFILLMENT_MAX_CHECKLIST_RETRIES=3',
    'LIVE_CALL_AVATAR_ENABLED=false',
    'LIVE_CALL_AVATAR_ALLOW_STUB=true'
  )) {
    if (-not $lines.Contains($line)) { [void]$lines.Add($line) }
  }
  return $lines.ToArray()
}

function Get-WarmLeanInboundWebEnvLines([int]$MonthlyBudgetEur = 150) {
  return @(
    'NEXT_PUBLIC_PROD_MODE=lean',
    "NEXT_PUBLIC_MONTHLY_BUDGET_EUR=$MonthlyBudgetEur",
    'NEXT_PUBLIC_FACTORY_PHASE=M3',
    'NEXT_PUBLIC_FACTORY_PHASE_AUTO=false',
    'NEXT_PUBLIC_FOUNDING_CLIENT_PROMO=false',
    'BFF_AI_MEMORY_RATE_LIMIT_MAX=20',
    'BFF_AUTH_RATE_LIMIT_MAX=90',
    'ADMIN_TELEGRAM_NOTIFY=true'
  )
}

function Apply-WarmLeanInboundEnvFiles([string]$RepoRoot, [int]$MonthlyBudgetEur = 150) {
  $rootEnv = Join-Path $RepoRoot '.env.vps.prod'
  $atinaEnv = Join-Path $RepoRoot 'atina-platform\atina\.env.vps.prod'
  $webEnv = Join-Path $RepoRoot 'apps\omnigroup-web\.env.vps.production'

  foreach ($line in (Get-ProdLeanComposeEnvLines)) {
    if ($line -match '^([A-Z0-9_]+)=(.*)$') {
      Set-EnvLineInFile $rootEnv $Matches[1] $Matches[2]
    }
  }
  foreach ($line in (Get-WarmLeanInboundAtinaEnvLines $MonthlyBudgetEur)) {
    if ($line -match '^([A-Z0-9_]+)=(.*)$') {
      Set-EnvLineInFile $atinaEnv $Matches[1] $Matches[2]
    }
  }
  foreach ($line in (Get-WarmLeanInboundWebEnvLines $MonthlyBudgetEur)) {
    if ($line -match '^([A-Z0-9_]+)=(.*)$') {
      Set-EnvLineInFile $webEnv $Matches[1] $Matches[2]
    }
  }
}

function Write-WarmLeanPlanSummary([int]$MonthlyBudgetEur = 150) {
  Write-Host '  Warm lean: contact + CRM + Telegram + IBAN fulfillment' -ForegroundColor Cyan
  Write-Host '  OFF: daily hunt cron, Apify, Hunter enrich, outbound send, autonomy' -ForegroundColor DarkGray
  Write-Host "  Budget cap: EUR $MonthlyBudgetEur/mo (AI ~0.8 USD/day)" -ForegroundColor DarkGray
}
