<#
.SYNOPSIS
  Provera Stripe polja u atina-platform/atina/.env (bez ispisa tajni).

.EXAMPLE
  .\scripts\check-stripe-env.ps1
#>
#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
$envPath = Join-Path $repoRoot 'atina-platform\atina\.env'

if (-not (Test-Path $envPath)) {
  throw "Nema fajla: $envPath"
}

function Read-DotEnv {
  param([string]$Path)
  $map = @{}
  foreach ($line in Get-Content -LiteralPath $Path) {
    $t = $line.Trim()
    if ($t -eq '' -or $t.StartsWith('#')) { continue }
    $idx = $t.IndexOf('=')
    if ($idx -lt 1) { continue }
    $key = $t.Substring(0, $idx).Trim()
    $val = $t.Substring($idx + 1).Trim()
    $map[$key] = $val
  }
  return $map
}

function Mask-Value {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) { return '-' }
  if ($Value.Length -le 8) { return 'set' }
  return ($Value.Substring(0, 4) + '...' + $Value.Substring($Value.Length - 4))
}

function Check-Prefix {
  param([string]$Value, [string]$Prefix)
  if ([string]::IsNullOrWhiteSpace($Value)) { return 'missing' }
  if ($Value.StartsWith($Prefix)) { return 'ok' }
  return 'bad-format'
}

$env = Read-DotEnv -Path $envPath

$checks = @(
  @{ Key = 'FINANCE_URL'; Required = $false; Note = 'Finance agregator base (Stripe/PayPal/Wise proxy)' },
  @{ Key = 'FINANCE_KEY'; Required = $true; Prefix = 'sk_'; Note = 'Stripe secret (sk_test_ ili sk_live_) — config.stripe.secretKey' },
  @{ Key = 'STRIPE_WEBHOOK_SECRET'; Required = $true; Prefix = 'whsec_'; Note = 'Webhook signing secret' },
  @{ Key = 'STRIPE_PUBLISHABLE_KEY'; Required = $true; Prefix = 'pk_'; Note = 'Publishable key za frontend' },
  @{ Key = 'STARTER_PRICE_ID'; Required = $true; Prefix = 'price_'; Note = 'Stripe Price ID - Starter plan' },
  @{ Key = 'PRO_PRICE_ID'; Required = $true; Prefix = 'price_'; Note = 'Stripe Price ID - Pro plan' },
  @{ Key = 'ENTERPRISE_PRICE_ID'; Required = $true; Prefix = 'price_'; Note = 'Stripe Price ID - Enterprise plan' }
)

$optionalChecks = @(
  @{ Key = 'PAYPAL_CLIENT_ID'; Note = 'PayPal (direktno ili preko FINANCE agregatora)' },
  @{ Key = 'PAYPAL_CLIENT_SECRET'; Note = 'PayPal secret' },
  @{ Key = 'PAYPAL_MODE'; Note = 'sandbox ili live' },
  @{ Key = 'WISE_API_KEY'; Note = 'Wise transfers' },
  @{ Key = 'WISE_PROFILE_ID'; Note = 'Wise profile (opciono)' }
)

Write-Host '== Stripe env (atina/.env) ==' -ForegroundColor Cyan
Write-Host "Fajl: $envPath" -ForegroundColor DarkGray
Write-Host 'Lokalni dev radi i bez ovoga (Atina koristi price_starter / price_enterprise default).' -ForegroundColor DarkGray
Write-Host ''

$ready = 0
$required = ($checks | Where-Object { $_.Required }).Count

foreach ($c in $checks) {
  $val = if ($env.ContainsKey($c.Key)) { $env[$c.Key] } else { '' }
  $status = if ($c.Prefix) { Check-Prefix -Value $val -Prefix $c.Prefix } else {
    if ([string]::IsNullOrWhiteSpace($val)) { 'missing' } else { 'ok' }
  }
  if ($c.Required -and $status -eq 'ok') { $ready++ }
  $color = switch ($status) {
    'ok' { 'Green' }
    'bad-format' { 'Red' }
    default { 'DarkGray' }
  }
  $label = if ($c.Required) { $c.Key } else { "$($c.Key) (opciono)" }
  Write-Host ("  {0,-26} {1,-12} {2}" -f $label, $status, $(Mask-Value $val)) -ForegroundColor $color
  if ($status -eq 'bad-format') {
    Write-Host "    ocekivano: $($c.Note)" -ForegroundColor Yellow
  }
}

Write-Host ''
Write-Host "Stripe live readiness: $ready/$required obaveznih polja OK" -ForegroundColor $(if ($ready -eq $required) { 'Green' } else { 'Yellow' })
Write-Host ''
Write-Host '== PayPal / Wise (opciono) ==' -ForegroundColor Cyan
foreach ($c in $optionalChecks) {
  $val = if ($env.ContainsKey($c.Key)) { $env[$c.Key] } else { '' }
  $status = if ([string]::IsNullOrWhiteSpace($val)) { 'missing' } else { 'ok' }
  $color = if ($status -eq 'ok') { 'Green' } else { 'DarkGray' }
  Write-Host ("  {0,-26} {1,-12} {2}" -f $c.Key, $status, $(Mask-Value $val)) -ForegroundColor $color
}
Write-Host ''
Write-Host 'Gde naci vrednosti:' -ForegroundColor Cyan
Write-Host '  Stripe Dashboard -> Developers -> API keys (sk_, pk_)' -ForegroundColor DarkGray
Write-Host '  Products -> svaki plan -> Price ID (price_...)' -ForegroundColor DarkGray
Write-Host '  Developers -> Webhooks -> signing secret (whsec_...)' -ForegroundColor DarkGray
Write-Host 'Detalji: atina-platform/atina/docs/operations/production-config-matrix.md' -ForegroundColor DarkGray
