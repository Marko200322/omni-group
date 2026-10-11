#Requires -Version 5.1
<#
.SYNOPSIS
  Marko P2 readiness - firma + Stripe LIVE path. Does not change secrets.

.DESCRIPTION
  Exit 0  = P2-01+P2-02 filled (ready for SafeDeploy)
  Exit 2  = fields still missing (TEST prod still OK)
  Exit 1  = config missing / error

.EXAMPLE
  .\scripts\marko-p2-finish.ps1
  .\scripts\marko-p2-finish.ps1 -StrictLive
#>
param(
  [string]$ConfigPath = '',
  [switch]$StrictLive
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
if (-not $ConfigPath) {
  $ConfigPath = Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json'
}

function T([object]$v) {
  if ($null -eq $v) { return '' }
  return ([string]$v).Trim()
}

function Mask([string]$v) {
  if ([string]::IsNullOrWhiteSpace($v)) { return '(empty)' }
  if ($v.Length -le 10) { return 'set' }
  return ($v.Substring(0, 7) + '...' + $v.Substring($v.Length - 4))
}

Write-Host '== Marko P2 finish readiness ==' -ForegroundColor Cyan
Write-Host "Config: $ConfigPath" -ForegroundColor DarkGray
Write-Host 'System already runs on Stripe TEST + Ultimatrix. This is your GTM flip only.' -ForegroundColor DarkGray
Write-Host ''

if (-not (Test-Path -LiteralPath $ConfigPath)) {
  Write-Host 'FAIL: missing deploy.config.json' -ForegroundColor Red
  Write-Host 'Copy deploy-secrets.local\deploy.config.template.json -> deploy.config.json' -ForegroundColor Yellow
  exit 1
}

$c = Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json

$firma = @(
  @{ Id = 'P2-01a'; Key = 'companyLegalName'; Val = (T $c.companyLegalName); Hint = 'Legal name on invoice / impressum' }
  @{ Id = 'P2-01b'; Key = 'companyTaxId'; Val = (T $c.companyTaxId); Hint = 'EIN / PIB / MB' }
  @{ Id = 'P2-01c'; Key = 'companyAddress'; Val = (T $c.companyAddress); Hint = 'Registered address' }
)

$stripeSecret = T $c.stripeSecretKey
$stripePub = T $c.stripePublishableKey
$stripeWh = T $c.stripeWebhookSecret
$prices = @(
  @{ Key = 'starterPriceId'; Val = (T $c.starterPriceId) }
  @{ Key = 'proPriceId'; Val = (T $c.proPriceId) }
  @{ Key = 'enterprisePriceId'; Val = (T $c.enterprisePriceId) }
)

$mode = 'missing'
if ($stripeSecret.StartsWith('sk_live_')) { $mode = 'live' }
elseif ($stripeSecret.StartsWith('sk_test_')) { $mode = 'test' }
elseif ($stripeSecret) { $mode = 'unknown-prefix' }

Write-Host '-- P2-01 Firma / VAT --' -ForegroundColor Yellow
$firmaMissing = @()
foreach ($f in $firma) {
  $ok = -not [string]::IsNullOrWhiteSpace($f.Val)
  $status = if ($ok) { 'SET' } else { 'EMPTY' }
  $color = if ($ok) { 'Green' } else { 'Red' }
  Write-Host ("  [{0}] {1,-20} {2}" -f $status, $f.Key, $(if ($ok) { 'ok' } else { $f.Hint })) -ForegroundColor $color
  if (-not $ok) { $firmaMissing += $f.Key }
}

Write-Host ''
Write-Host '-- P2-02 Stripe --' -ForegroundColor Yellow
Write-Host ("  mode:              {0}" -f $mode) -ForegroundColor $(if ($mode -eq 'live') { 'Green' } elseif ($mode -eq 'test') { 'Cyan' } else { 'Red' })
Write-Host ("  stripeSecretKey:   {0}" -f (Mask $stripeSecret))
Write-Host ("  stripePublishable: {0}" -f (Mask $stripePub))
Write-Host ("  stripeWebhook:     {0}" -f (Mask $stripeWh))

$stripeIssues = @()
if (-not $stripeSecret) { $stripeIssues += 'stripeSecretKey empty' }
if (-not $stripePub) { $stripeIssues += 'stripePublishableKey empty' }
if (-not $stripeWh) { $stripeIssues += 'stripeWebhookSecret empty' }
elseif (-not $stripeWh.StartsWith('whsec_')) { $stripeIssues += 'stripeWebhookSecret must start with whsec_' }

if ($mode -eq 'live' -or $StrictLive) {
  if (-not $stripeSecret.StartsWith('sk_live_')) { $stripeIssues += 'LIVE needs sk_live_...' }
  if (-not $stripePub.StartsWith('pk_live_')) { $stripeIssues += 'LIVE needs pk_live_...' }
  if ($firmaMissing.Count -gt 0) { $stripeIssues += 'LIVE blocked until firma fields set (P2-01)' }
}

foreach ($p in $prices) {
  $ok = $p.Val -and $p.Val.StartsWith('price_')
  Write-Host ("  [{0}] {1}" -f $(if ($ok) { 'SET' } else { 'EMPTY' }), $p.Key) -ForegroundColor $(if ($ok) { 'Green' } else { 'Yellow' })
  if (-not $ok) { $stripeIssues += "$($p.Key) (LIVE price_... from Stripe Dashboard)" }
}

Write-Host ''
Write-Host '-- P2-03..05 (optional after LIVE) --' -ForegroundColor DarkGray
Write-Host '  PayPal / Wise / Kriptoman - fail-closed while empty.' -ForegroundColor DarkGray

Write-Host ''
Write-Host '-- Deploy wiring (already in place) --' -ForegroundColor Cyan
Write-Host '  COMPANY_* -> Atina invoices + NEXT_PUBLIC_COMPANY_* -> impressum/web'
Write-Host '  sk_live_ -> PAYMENTS_MODE=live via deploy-config-env.ps1'
Write-Host '  Deploy: .\scripts\deploy-from-local-secrets.ps1 -SafeDeploy'

$readyFirma = $firmaMissing.Count -eq 0
$readyLive = ($mode -eq 'live') -and ($stripeIssues.Count -eq 0) -and $readyFirma
$readyTestOk = ($mode -eq 'test') -and $stripeSecret -and $stripePub -and $stripeWh

Write-Host ''
if ($readyLive) {
  Write-Host 'STATUS: P2 READY - firma + Stripe LIVE filled.' -ForegroundColor Green
  Write-Host 'Next:' -ForegroundColor Green
  Write-Host '  1. Stripe Dashboard -> Webhooks -> https://api.omnigrouptech.com/api/v1/payments/webhooks/stripe (LIVE whsec_)' -ForegroundColor White
  Write-Host '  2. .\scripts\deploy-from-local-secrets.ps1 -SafeDeploy' -ForegroundColor White
  Write-Host '  3. Card smoke (1 EUR) on /pricing -> Confirm' -ForegroundColor White
  Write-Host '  4. node scripts/test-ultimatrix.mjs' -ForegroundColor White
  Write-Host 'Runbook: docs/MARKO-P2-FINISH.md' -ForegroundColor DarkGray
  exit 0
}

Write-Host 'STATUS: SYSTEM READY - waiting for your P2 fill (TEST sales still OK).' -ForegroundColor Cyan
if (-not $readyFirma) {
  Write-Host ''
  Write-Host 'Do P2-01 (firma) in deploy-secrets.local\deploy.config.json:' -ForegroundColor Yellow
  foreach ($k in $firmaMissing) { Write-Host "  - $k" -ForegroundColor Yellow }
}
if ($mode -ne 'live') {
  Write-Host ''
  Write-Host 'Then P2-02 (Stripe LIVE) in the same file:' -ForegroundColor Yellow
  Write-Host '  - stripeSecretKey      = sk_live_...' -ForegroundColor Yellow
  Write-Host '  - stripePublishableKey = pk_live_...' -ForegroundColor Yellow
  Write-Host '  - stripeWebhookSecret  = whsec_... (LIVE webhook)' -ForegroundColor Yellow
  Write-Host '  - starter/pro/enterprise Price IDs from LIVE mode' -ForegroundColor Yellow
}
if ($stripeIssues.Count -gt 0 -and ($mode -eq 'live' -or $StrictLive)) {
  Write-Host ''
  Write-Host 'LIVE blockers:' -ForegroundColor Red
  foreach ($i in $stripeIssues) { Write-Host "  - $i" -ForegroundColor Red }
}

if ($readyTestOk) {
  Write-Host ''
  Write-Host ("Currently: Stripe TEST OK ({0}) - prod GTM CONDITIONAL." -f (Mask $stripeSecret)) -ForegroundColor Green
}

Write-Host ''
Write-Host 'After fill: re-run .\scripts\marko-p2-finish.ps1 then SafeDeploy.' -ForegroundColor White
Write-Host 'Runbook: docs/MARKO-P2-FINISH.md' -ForegroundColor DarkGray
exit 2
