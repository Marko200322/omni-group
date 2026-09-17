#Requires -Version 5.1
<#
.SYNOPSIS
  M0 lean produkcija — minimal API spend, bez autonomy/scraper/outbound dok nema prihoda.

  Koristi: prepare-vps-prod.ps1, deploy-from-local-secrets.ps1
#>

function Test-IsLeanProdMode([string]$Mode) {
  return ($Mode.Trim().ToLower() -ne 'full')
}

function Get-ProdLeanComposeEnvLines() {
  return @(
    'AUTONOMY_ENABLED=false',
    'AUTONOMY_AUTO_START_SCHEDULER=false',
    'AUTONOMY_EVOLUTION_CODE_EDIT=false'
  )
}

function Get-ProdLeanAtinaEnvLines() {
  return @(
    'ENABLE_SCRAPER=false',
    'ENABLE_AUTOMATION=false',
    'AUTONOMY_ENABLED=false',
    'AUTONOMY_AUTO_START_SCHEDULER=false',
    'AUTONOMY_REAL_ECOSYSTEM_RUNS=false',
    'AUTONOMY_AUTO_DEPLOY=false',
    'AUTONOMY_CATEGORY_ROLLOUT_ENABLED=false',
    'AUTONOMY_MARKETING_ENABLED=false',
    'AUTONOMY_INITIAL_BUDGET_USD=5',
    'AUTONOMY_MAX_SPEND_PER_DAY_USD=0.5',
    'AUTONOMY_MAX_SPEND_PER_TICK_USD=0.25',
    'AUTONOMY_MIN_RESERVE_USD=5',
    'PRODUCT_FACTORY_ENABLED=true',
    'PRODUCT_FACTORY_INTERNAL_LANE=false',
    'PRODUCT_FACTORY_MAX_INTERNAL_PER_TICK=0',
    'OUTREACH_DAILY_CAP=0',
    'OUTREACH_WARMUP_MODE=true',
    'OUTREACH_DOMAIN_WARMUP_COMPLETE=false',
    'OUTREACH_DEV_SEND_TO_FALLBACK=false',
    'LEAD_DATABASE_ENABLED=false',
    'LEAD_DATABASE_ROLLOUT_PHASE=F0',
    'LEAD_ENRICH_ON_HUNT=false',
    'CURSOR_EVOLUTION_ENABLED=false',
    'CURSOR_AGENT_ENABLED=false',
    'CRAFTOR_USE_REAL_SCRAPER=false',
    'SALES_MEETINGS_ENABLED=false',
    'SUPPORT_AVATAR_ENABLED=false',
    'SALES_AVATAR_ENABLED=false',
    'AVATAR_USE_AI_AGGREGATOR=false',
    'DELIVERABLE_FULFILLMENT_LEARNING_LOOP=false',
    'RETAINER_SCHEDULER_ENABLED=true',
    'ENABLE_CRM=true',
    'PAYMENTS_MODE=manual',
    'ALLOW_MANUAL_PAYMENTS_IN_PRODUCTION=true',
    'SMTP_ENABLED=false'
  )
}

function Get-ProdLeanWebEnvLines() {
  return @(
    'NEXT_PUBLIC_PROD_MODE=lean',
    'BFF_AI_MEMORY_RATE_LIMIT_MAX=30'
  )
}

function Set-EnvLineInFile([string]$FilePath, [string]$Key, [string]$Value) {
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
  $text = ($out -join "`n") + "`n"
  $tmp = "$FilePath.tmp.$PID"
  [System.IO.File]::WriteAllText($tmp, $text, [System.Text.UTF8Encoding]::new($false))
  $moved = $false
  for ($i = 1; $i -le 8; $i++) {
    try {
      Move-Item -LiteralPath $tmp -Destination $FilePath -Force
      $moved = $true
      break
    } catch {
      Start-Sleep -Milliseconds (150 * $i)
    }
  }
  if (-not $moved) {
    Copy-Item -LiteralPath $tmp -Destination $FilePath -Force
    Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
  }
}

function Apply-LeanProdEnvFiles([string]$RepoRoot) {
  $rootEnv = Join-Path $RepoRoot '.env.vps.prod'
  $atinaEnv = Join-Path $RepoRoot 'atina-platform\atina\.env.vps.prod'
  $webEnv = Join-Path $RepoRoot 'apps\omnigroup-web\.env.vps.production'

  foreach ($line in (Get-ProdLeanComposeEnvLines)) {
    if ($line -match '^([A-Z0-9_]+)=(.*)$') {
      Set-EnvLineInFile $rootEnv $Matches[1] $Matches[2]
    }
  }
  foreach ($line in (Get-ProdLeanAtinaEnvLines)) {
    if ($line -match '^([A-Z0-9_]+)=(.*)$') {
      Set-EnvLineInFile $atinaEnv $Matches[1] $Matches[2]
    }
  }
  foreach ($line in (Get-ProdLeanWebEnvLines)) {
    if ($line -match '^([A-Z0-9_]+)=(.*)$') {
      Set-EnvLineInFile $webEnv $Matches[1] $Matches[2]
    }
  }
}
