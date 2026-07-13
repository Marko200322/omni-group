#Requires -Version 5.1
<#
.SYNOPSIS
  Revenue factory phases M0-M6 - module env profile (sync with MARKETING-REVENUE-PHASED-CHECKLIST.md).

  Koristi: prepare-vps-prod.ps1, deploy-from-local-secrets.ps1
  Posle lean/budget profila - ovo POBEDI module toggle vrednosti.
#>

. (Join-Path $PSScriptRoot 'prod-budget-profile.ps1')

$script:FactoryPhaseOrder = @('M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6')

function Resolve-FactoryPhase([object]$Value) {
  if ($null -eq $Value -or [string]::IsNullOrWhiteSpace("$Value")) { return 'M0' }
  $v = "$Value".Trim().ToUpper()
  if ($script:FactoryPhaseOrder -contains $v) { return $v }
  Write-Warning "Unknown factoryPhase '$Value' - using M0"
  return 'M0'
}

function Get-FactoryPhaseAiDailyCapUsd([string]$FactoryPhase, [int]$MonthlyBudgetEur) {
  $base = Get-BudgetAiDailyCapUsd $MonthlyBudgetEur
  switch ($FactoryPhase) {
    'M5' { return [string]([math]::Max([double]$base, 2.5)) }
    'M6' { return [string]([math]::Max([double]$base, 5)) }
    default { return $base }
  }
}

function Get-FactoryPhaseAtinaEnvMap([string]$FactoryPhase, [int]$MonthlyBudgetEur) {
  $aiDaily = Get-FactoryPhaseAiDailyCapUsd $FactoryPhase $MonthlyBudgetEur
  $idx = [array]::IndexOf($script:FactoryPhaseOrder, $FactoryPhase)
  if ($idx -lt 0) { $idx = 0 }

  $env = [ordered]@{
    FACTORY_PHASE                              = $FactoryPhase
    OWNER_MONTHLY_BUDGET_EUR                   = "$MonthlyBudgetEur"
    PAYMENTS_MODE                              = 'manual'
    ALLOW_MANUAL_PAYMENTS_IN_PRODUCTION        = 'true'
    ENABLE_CRM                                 = 'true'
    ENABLE_ANALYTICS                           = 'false'
    ENABLE_AUTOMATION                          = 'false'
    ENABLE_SCRAPER                             = 'false'
    PRODUCT_FACTORY_ENABLED                    = 'true'
    PRODUCT_FACTORY_INTERNAL_LANE              = 'false'
    PRODUCT_FACTORY_MAX_INTERNAL_PER_TICK      = '0'
    RETAINER_SCHEDULER_ENABLED                 = 'true'
    AUTONOMY_ENABLED                           = 'false'
    AUTONOMY_AUTO_START_SCHEDULER              = 'false'
    AUTONOMY_REAL_ECOSYSTEM_RUNS               = 'false'
    AUTONOMY_AUTO_DEPLOY                       = 'false'
    AUTONOMY_CATEGORY_ROLLOUT_ENABLED          = 'false'
    AUTONOMY_MARKETING_ENABLED                 = 'false'
    AUTONOMY_EVOLUTION_CODE_EDIT               = 'false'
    AUTONOMY_REVENUE_REINVEST_RATE             = '0'
    AUTONOMY_MAX_SPEND_PER_DAY_USD             = $aiDaily
    AUTONOMY_MAX_SPEND_PER_TICK_USD            = '0.25'
    AUTONOMY_MIN_RESERVE_USD                   = '5'
    OUTREACH_WARMUP_MODE                       = 'true'
    OUTREACH_DOMAIN_WARMUP_COMPLETE            = 'false'
    OUTREACH_DAILY_CAP                         = '0'
    OUTREACH_DEV_SEND_TO_FALLBACK              = 'false'
    LEAD_DATABASE_ENABLED                      = 'false'
    LEAD_DATABASE_ROLLOUT_PHASE                = 'F0'
    LEAD_ENRICH_ON_HUNT                        = 'false'
    SUPPORT_AVATAR_ENABLED                     = 'false'
    SALES_AVATAR_ENABLED                       = 'false'
    AVATAR_USE_AI_AGGREGATOR                   = 'false'
    SALES_MEETINGS_ENABLED                     = 'false'
    CURSOR_EVOLUTION_ENABLED                   = 'false'
    CURSOR_AGENT_ENABLED                       = 'false'
    CRAFTOR_USE_REAL_SCRAPER                   = 'false'
    DELIVERABLE_FULFILLMENT_LEARNING_LOOP      = 'false'
    DELIVERABLE_FULFILLMENT_MAX_RETRY_ATTEMPTS   = '2'
    DELIVERABLE_FULFILLMENT_MAX_CHECKLIST_RETRIES = '2'
    SMTP_ENABLED                               = 'false'
    ADMIN_TELEGRAM_NOTIFY                      = 'true'
  }

  if ($idx -ge 1) {
    # M1 inbound - CRM + notifications; Resend/Slack keys from deploy.config
    $env.SMTP_ENABLED = 'false'
  }

  if ($idx -ge 2) {
    $env.ENABLE_SCRAPER = 'true'
    $env.ENABLE_AUTOMATION = 'true'
    $env.AUTONOMY_REAL_ECOSYSTEM_RUNS = 'true'
    $env.CRAFTOR_USE_REAL_SCRAPER = 'true'
    $env.LEAD_DATABASE_ROLLOUT_PHASE = 'F1'
    $env.OUTREACH_WARMUP_MODE = 'true'
    $env.OUTREACH_DOMAIN_WARMUP_COMPLETE = 'false'
    $env.OUTREACH_DAILY_CAP = '20'
    $env.OUTREACH_DEV_SEND_TO_FALLBACK = 'false'
  }

  if ($idx -ge 3) {
    $env.OUTREACH_DAILY_CAP = '30'
    $env.DELIVERABLE_FULFILLMENT_MAX_RETRY_ATTEMPTS = '3'
    $env.DELIVERABLE_FULFILLMENT_MAX_CHECKLIST_RETRIES = '3'
  }

  if ($idx -ge 4) {
    $env.LEAD_DATABASE_ENABLED = 'true'
    $env.LEAD_DATABASE_ROLLOUT_PHASE = 'F3'
    $env.LEAD_ENRICH_ON_HUNT = 'true'
    $env.ENABLE_ANALYTICS = 'true'
    $env.OUTREACH_WARMUP_MODE = 'false'
    $env.OUTREACH_DOMAIN_WARMUP_COMPLETE = 'true'
    $env.OUTREACH_DAILY_CAP = '50'
    $env.SALES_MEETINGS_ENABLED = 'true'
  }

  if ($idx -ge 5) {
    $env.AUTONOMY_ENABLED = 'true'
    $env.AUTONOMY_AUTO_START_SCHEDULER = 'true'
    $env.AUTONOMY_MARKETING_ENABLED = 'true'
    $env.AUTONOMY_REVENUE_REINVEST_RATE = '0.2'
    $env.AUTONOMY_MAX_SPEND_PER_TICK_USD = '1'
    $env.AUTONOMY_MIN_RESERVE_USD = '15'
    $env.PRODUCT_FACTORY_INTERNAL_LANE = 'true'
    $env.PRODUCT_FACTORY_MAX_INTERNAL_PER_TICK = '1'
    $env.DELIVERABLE_FULFILLMENT_LEARNING_LOOP = 'true'
  }

  if ($idx -ge 6) {
    $env.LEAD_DATABASE_ROLLOUT_PHASE = 'F5'
    $env.LEAD_ENRICH_ON_HUNT = 'true'
    $env.OUTREACH_DAILY_CAP = '100'
    $env.SUPPORT_AVATAR_ENABLED = 'true'
    $env.SALES_AVATAR_ENABLED = 'true'
    $env.AVATAR_USE_AI_AGGREGATOR = 'true'
    $env.AUTONOMY_CATEGORY_ROLLOUT_ENABLED = 'true'
    $env.AUTONOMY_AUTO_DEPLOY = 'false'
    $env.DELIVERABLE_FULFILLMENT_MAX_RETRY_ATTEMPTS = '4'
    $env.DELIVERABLE_FULFILLMENT_MAX_CHECKLIST_RETRIES = '4'
    # PAYMENTS_MODE=live set in Apply-FactoryPhaseEnvFiles when Stripe keys present
  }

  return $env
}

function Get-FactoryPhaseWebEnvMap([string]$FactoryPhase, [int]$MonthlyBudgetEur, [string]$ProdMode) {
  $lean = ($ProdMode.Trim().ToLower() -ne 'full')
  $idx = [array]::IndexOf($script:FactoryPhaseOrder, $FactoryPhase)
  if ($idx -lt 0) { $idx = 0 }

  # M6 always runs full web surface (Stripe checkout, premium modules) regardless of prodMode lean flag.
  $webMode = if ($idx -ge 6) { 'full' } elseif ($lean) { 'lean' } else { 'full' }

  return [ordered]@{
    NEXT_PUBLIC_FACTORY_PHASE      = $FactoryPhase
    NEXT_PUBLIC_MONTHLY_BUDGET_EUR = "$MonthlyBudgetEur"
    NEXT_PUBLIC_PROD_MODE          = $webMode
  }
}

function Get-FactoryPhaseRequiredKeys([string]$FactoryPhase) {
  $common = @('OPENROUTER_API_KEY')
  $byPhase = @{
    M0 = @()
    M1 = @('RESEND_API_KEY', 'CONTACT_EMAIL_FROM', 'CONTACT_EMAIL_TO')
    M2 = @('SCRAPER_KEY')
    M3 = @()
    M4 = @('HUNTER_API_KEY')
    M5 = @()
    M6 = @('STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PUBLISHABLE_KEY', 'STARTER_PRICE_ID', 'PRO_PRICE_ID', 'ENTERPRISE_PRICE_ID')
  }
  $keys = [System.Collections.Generic.List[string]]::new()
  foreach ($k in $common) { $keys.Add($k) }
  $idx = [array]::IndexOf($script:FactoryPhaseOrder, $FactoryPhase)
  for ($i = 0; $i -le $idx; $i++) {
    $p = $script:FactoryPhaseOrder[$i]
    foreach ($k in $byPhase[$p]) { if (-not $keys.Contains($k)) { $keys.Add($k) } }
  }
  return @($keys)
}

function Set-FactoryEnvLine([string]$FilePath, [string]$Key, [string]$Value) {
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

function Apply-FactoryPhaseEnvFiles(
  [string]$RepoRoot,
  [string]$FactoryPhase,
  [int]$MonthlyBudgetEur,
  [string]$ProdMode = 'lean',
  [hashtable]$DeployConfig = @{}
) {
  $phase = Resolve-FactoryPhase $FactoryPhase
  $atinaEnv = Join-Path $RepoRoot 'atina-platform\atina\.env.vps.prod'
  $webEnv = Join-Path $RepoRoot 'apps\omnigroup-web\.env.vps.production'
  $rootEnv = Join-Path $RepoRoot '.env.vps.prod'

  $atinaMap = Get-FactoryPhaseAtinaEnvMap $phase $MonthlyBudgetEur

  if ($phase -eq 'M6' -and $DeployConfig.stripeSecretKey) {
    $atinaMap.PAYMENTS_MODE = 'live'
    $atinaMap.ALLOW_MANUAL_PAYMENTS_IN_PRODUCTION = 'true'
  }

  foreach ($entry in $atinaMap.GetEnumerator()) {
    Set-FactoryEnvLine $atinaEnv $entry.Key $entry.Value
    if ($entry.Key -eq 'FACTORY_PHASE' -or $entry.Key -eq 'OWNER_MONTHLY_BUDGET_EUR') {
      Set-FactoryEnvLine $rootEnv $entry.Key $entry.Value
    }
  }

  $webMap = Get-FactoryPhaseWebEnvMap $phase $MonthlyBudgetEur $ProdMode
  foreach ($entry in $webMap.GetEnumerator()) {
    Set-FactoryEnvLine $webEnv $entry.Key $entry.Value
  }

  return $phase
}

function Test-FactoryPhaseEnvFiles(
  [string]$RepoRoot,
  [string]$FactoryPhase,
  [int]$MonthlyBudgetEur,
  [hashtable]$DeployConfig = @{},
  [object]$ConfigObject = $null
) {
  $phase = Resolve-FactoryPhase $FactoryPhase
  $expected = Get-FactoryPhaseAtinaEnvMap $phase $MonthlyBudgetEur
  $atinaEnv = Join-Path $RepoRoot 'atina-platform\atina\.env.vps.prod'
  $fail = 0
  $pass = 0

  if (-not (Test-Path $atinaEnv)) {
    Write-Host "  FAIL missing $atinaEnv (run prepare-vps-prod first)" -ForegroundColor Red
    return @{ pass = 0; fail = 1; missingKeys = @() }
  }

  $content = Get-Content $atinaEnv -Raw
  foreach ($entry in $expected.GetEnumerator()) {
    $pattern = "(?m)^\s*$([regex]::Escape($entry.Key))\s*=\s*$([regex]::Escape($entry.Value))\s*$"
    if ($content -match $pattern) {
      $pass++
    } else {
      Write-Host "  FAIL $($entry.Key) expected '$($entry.Value)'" -ForegroundColor Red
      $fail++
    }
  }

  $missingKeys = @()
  $keyLookup = @{}
  if ($null -ne $ConfigObject -and (Get-Command Build-DeployConfigKeyLookup -ErrorAction SilentlyContinue)) {
    $keyLookup = Build-DeployConfigKeyLookup $ConfigObject
  }
  foreach ($key in (Get-FactoryPhaseRequiredKeys $phase)) {
    $val = $null
    if ($keyLookup.ContainsKey($key)) { $val = $keyLookup[$key] }
    if ($DeployConfig.ContainsKey($key)) { $val = $DeployConfig[$key] }
    if ($key -eq 'OPENROUTER_API_KEY' -and $DeployConfig.openRouterApiKey) { $val = $DeployConfig.openRouterApiKey }
    if ($key -eq 'RESEND_API_KEY' -and $DeployConfig.resendApiKey) { $val = $DeployConfig.resendApiKey }
    if ($key -eq 'HUNTER_API_KEY' -and $DeployConfig.hunterApiKey) { $val = $DeployConfig.hunterApiKey }
    if ($key -eq 'SCRAPER_KEY' -and $DeployConfig.scraperKey) { $val = $DeployConfig.scraperKey }
    if ($key -eq 'STRIPE_SECRET_KEY' -and $DeployConfig.stripeSecretKey) { $val = $DeployConfig.stripeSecretKey }
    if ($key -eq 'STRIPE_WEBHOOK_SECRET' -and $DeployConfig.stripeWebhookSecret) { $val = $DeployConfig.stripeWebhookSecret }
    if ($key -eq 'STRIPE_PUBLISHABLE_KEY' -and $DeployConfig.stripePublishableKey) { $val = $DeployConfig.stripePublishableKey }
    if ($key -eq 'HEYGEN_API_KEY' -and $DeployConfig.heygenApiKey) { $val = $DeployConfig.heygenApiKey }
    if ([string]::IsNullOrWhiteSpace("$val")) {
      if ($content -notmatch "(?m)^\s*$([regex]::Escape($key))\s*=\s*\S") {
        $missingKeys += $key
      }
    }
  }

  return @{ pass = $pass; fail = $fail; missingKeys = $missingKeys; phase = $phase }
}

function Write-FactoryPhaseSummary([string]$FactoryPhase, [int]$MonthlyBudgetEur) {
  $phase = Resolve-FactoryPhase $FactoryPhase
  $map = Get-FactoryPhaseAtinaEnvMap $phase $MonthlyBudgetEur
  Write-Host "  Factory phase: $phase" -ForegroundColor Cyan
  Write-Host "    scraper=$($map.ENABLE_SCRAPER) outreach_cap=$($map.OUTREACH_DAILY_CAP) lead=$($map.LEAD_DATABASE_ROLLOUT_PHASE) autonomy=$($map.AUTONOMY_ENABLED)" -ForegroundColor DarkGray
}

function Get-FactoryPhaseLabel([string]$FactoryPhase) {
  switch (Resolve-FactoryPhase $FactoryPhase) {
    'M0' { return 'Launch - manual sales + fulfillment' }
    'M1' { return 'Inbound - contact + CRM' }
    'M2' { return 'Warm outbound - scraper + drafts' }
    'M3' { return 'Deliver and upsell - sites + retainers' }
    'M4' { return 'Lead machine - Hunter + send' }
    'M5' { return 'Autonomy reinvest' }
    'M6' { return 'Full factory - Stripe + premium' }
    default { return $FactoryPhase }
  }
}
