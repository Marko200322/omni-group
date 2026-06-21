<#
.SYNOPSIS
  E2E: manual billing — checkout → mark sent → admin confirm.

.DESCRIPTION
  Pretpostavlja Atina (:3000) i web (:3010). Koristi admin nalog za ceo tok.

.EXAMPLE
  .\scripts\e2e-billing-manual.ps1
#>
#Requires -Version 5.1
param(
  [string]$WebBase = 'http://127.0.0.1:3010',
  [string]$Email = 'admin@atina.io',
  [string]$Password = 'Admin@123456',
  [string]$PlanSlug = 'starter',
  [string]$BillingCycle = 'monthly'
)

$ErrorActionPreference = 'Stop'
$web = $WebBase.TrimEnd('/')
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptsDir 'rate-limit-retry.ps1')
. (Join-Path $scriptsDir 'resolve-admin-credentials.ps1')
if (-not $PSBoundParameters.ContainsKey('Email') -or -not $PSBoundParameters.ContainsKey('Password')) {
  $creds = Get-AdminCredentials -RepoRoot (Split-Path $scriptsDir -Parent)
  if (-not $PSBoundParameters.ContainsKey('Email')) { $Email = $creds.Email }
  if (-not $PSBoundParameters.ContainsKey('Password')) { $Password = $creds.Password }
}

& (Join-Path $scriptsDir 'ensure-web-dev.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '== E2E manual billing ==' -ForegroundColor Cyan

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json -Compress
$lj = Invoke-WithRateLimitRetry -Label 'login' -Action {
  $r = Invoke-WebRequest -Uri "$web/api/auth/login" -Method POST -ContentType 'application/json' -Body $loginBody -WebSession $session -UseBasicParsing
  return ($r.Content | ConvertFrom-Json)
}
if (-not $lj.ok) { throw 'Login failed' }
Write-Host "  login OK ($($lj.user.email))" -ForegroundColor Green

$coBody = (@{ planSlug = $PlanSlug; billingCycle = $BillingCycle } | ConvertTo-Json -Compress)
$co = Invoke-WebRequest -Uri "$web/api/atina/payments/manual/checkout" -Method POST -ContentType 'application/json' -Body $coBody -WebSession $session -UseBasicParsing
$cj = $co.Content | ConvertFrom-Json
if (-not $cj.ok -or -not $cj.data.paymentId) { throw "Checkout failed: $($co.Content)" }
$paymentId = $cj.data.paymentId
Write-Host "  checkout OK paymentId=$paymentId ref=$($cj.data.reference)" -ForegroundColor Green

$ms = Invoke-WebRequest -Uri "$web/api/atina/payments/manual/mark-sent/$paymentId" -Method POST -ContentType 'application/json' -Body '{}' -WebSession $session -UseBasicParsing
$mj = $ms.Content | ConvertFrom-Json
if (-not $mj.ok) { throw "Mark sent failed: $($ms.Content)" }
Write-Host '  mark-sent OK' -ForegroundColor Green

Start-Sleep -Seconds 1
$plist = Invoke-WebRequest -Uri "$web/api/atina/admin/payments?status=processing&provider=manual&limit=20" -WebSession $session -UseBasicParsing
$plj = $plist.Content | ConvertFrom-Json
if (-not $plj.ok) { throw "Admin payments list failed: $($plist.Content)" }
$found = @($plj.data | Where-Object { $_.id -eq $paymentId })
if ($found.Count -lt 1) { throw "Payment $paymentId not in processing list" }
Write-Host "  admin list OK (processing=$($plj.data.Count))" -ForegroundColor Green

$cf = Invoke-WebRequest -Uri "$web/api/atina/payments/manual/confirm/$paymentId" -Method POST -ContentType 'application/json' -Body '{}' -WebSession $session -UseBasicParsing
$cfj = $cf.Content | ConvertFrom-Json
if (-not $cfj.ok) { throw "Confirm failed: $($cf.Content)" }
Write-Host '  admin confirm OK' -ForegroundColor Green

$bill = Invoke-WebRequest -Uri "$web/api/atina/billing/summary" -WebSession $session -UseBasicParsing
$bj = $bill.Content | ConvertFrom-Json
if (-not $bj.ok) { throw "Billing summary failed: $($bill.Content)" }
Write-Host '  billing summary OK' -ForegroundColor Green

Write-Host ''
Write-Host 'e2e-billing-manual: PASS' -ForegroundColor Green
