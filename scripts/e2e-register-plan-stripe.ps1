<#
.SYNOPSIS
  E2E: register, login, Stripe Checkout session (no live charge, no IBAN).

.EXAMPLE
  .\scripts\e2e-register-plan-stripe.ps1
#>
#Requires -Version 5.1
param(
  [string]$WebBase = 'http://127.0.0.1:3010',
  [string]$AtinaBase = 'http://127.0.0.1:3000',
  [string]$PlanSlug = 'starter',
  [string]$BillingCycle = 'monthly'
)

$ErrorActionPreference = 'Stop'
$web = $WebBase.TrimEnd('/')
$atina = $AtinaBase.TrimEnd('/')
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptsDir 'rate-limit-retry.ps1')

& (Join-Path $scriptsDir 'ensure-atina-api.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& (Join-Path $scriptsDir 'ensure-web-dev.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$userEmail = "e2e-stripe-$stamp@test.local"
$userPassword = 'E2eTest1!'
$userName = "E2E Stripe $stamp"

Write-Host '== E2E register / Stripe checkout ==' -ForegroundColor Cyan

$regBody = @{
  name     = $userName
  email    = $userEmail
  password = $userPassword
  company  = 'E2E Stripe Co'
} | ConvertTo-Json -Compress

$reg = Invoke-WithRateLimitRetry -Label 'register' -Action {
  $r = Invoke-WebRequest -Uri "$atina/api/v1/auth/register" -Method POST -ContentType 'application/json' -Body $regBody -UseBasicParsing
  return ($r.Content | ConvertFrom-Json)
}
if (-not $reg.success) { throw "Register failed: $($reg | ConvertTo-Json -Compress)" }
Write-Host "  register OK ($userEmail)" -ForegroundColor Green
Start-Sleep -Seconds 2

$userSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = @{ email = $userEmail; password = $userPassword } | ConvertTo-Json -Compress
$lj = Invoke-WithRateLimitRetry -Label 'user-login' -Action {
  $r = Invoke-WebRequest -Uri "$web/api/auth/login" -Method POST -ContentType 'application/json' -Body $loginBody -WebSession $userSession -UseBasicParsing
  return ($r.Content | ConvertFrom-Json)
}
if (-not $lj.ok) { throw 'User login failed' }
Write-Host '  user login OK' -ForegroundColor Green

$methods = Invoke-WithRateLimitRetry -Label 'payment-methods' -Action {
  $r = Invoke-WebRequest -Uri "$web/api/atina/payments/methods" -WebSession $userSession -UseBasicParsing
  return ($r.Content | ConvertFrom-Json)
}
if (-not $methods.ok) { throw "Methods failed: $($methods | ConvertTo-Json -Compress)" }
$ids = @($methods.data.methods | ForEach-Object { $_.id })
$stripeOn = $methods.data.methods | Where-Object { $_.id -eq 'stripe' -and $_.available }
if (-not $stripeOn) { throw "Stripe not available. methods=$($ids -join ',')" }
if ($ids -contains 'manual') { throw 'IBAN/manual still listed while Stripe is configured' }
Write-Host "  methods OK stripe=yes iban=no mode=$($methods.data.mode)" -ForegroundColor Green

$coBody = (@{ planSlug = $PlanSlug; billingCycle = $BillingCycle; currency = 'EUR' } | ConvertTo-Json -Compress)
$cj = Invoke-WithRateLimitRetry -Label 'stripe checkout' -Action {
  $co = Invoke-WebRequest -Uri "$web/api/atina/payments/stripe/checkout" -Method POST -ContentType 'application/json' -Body $coBody -WebSession $userSession -UseBasicParsing
  $parsed = $co.Content | ConvertFrom-Json
  if (-not $parsed.ok -or -not $parsed.data.url) { throw "Stripe checkout failed: $($co.Content)" }
  return $parsed
}
$url = [string]$cj.data.url
if ($url -notmatch 'checkout\.stripe\.com') { throw "Unexpected checkout URL host: $url" }
$previewLen = [Math]::Min(48, $url.Length)
Write-Host ("  stripe session OK ({0}...)" -f $url.Substring(0, $previewLen)) -ForegroundColor Green

Write-Host ''
Write-Host 'e2e-register-plan-stripe: PASS (session created, no charge)' -ForegroundColor Green
