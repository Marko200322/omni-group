<#
.SYNOPSIS
  E2E: register → login → manual checkout → mark-sent → admin confirm.

.EXAMPLE
  .\scripts\e2e-register-plan-payment.ps1
#>
#Requires -Version 5.1
param(
  [string]$WebBase = 'http://127.0.0.1:3010',
  [string]$AtinaBase = 'http://127.0.0.1:3000',
  [string]$AdminEmail = 'admin@atina.io',
  [string]$AdminPassword = 'Admin@123456',
  [string]$PlanSlug = 'starter',
  [string]$BillingCycle = 'monthly'
)

$ErrorActionPreference = 'Stop'
$web = $WebBase.TrimEnd('/')
$atina = $AtinaBase.TrimEnd('/')
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptsDir 'rate-limit-retry.ps1')
. (Join-Path $scriptsDir 'resolve-admin-credentials.ps1')

$repoRoot = Split-Path -Parent $scriptsDir
if ($AdminEmail -eq 'admin@atina.io' -and $AdminPassword -eq 'Admin@123456') {
  $adminCreds = Get-AdminCredentials -RepoRoot $repoRoot
  $AdminEmail = $adminCreds.Email
  $AdminPassword = $adminCreds.Password
}

& (Join-Path $scriptsDir 'ensure-web-dev.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$userEmail = "e2e-$stamp@test.local"
$userPassword = 'E2eTest1!'
$userName = "E2E User $stamp"

Write-Host '== E2E register → plan → payment ==' -ForegroundColor Cyan

$regBody = @{
  name     = $userName
  email    = $userEmail
  password = $userPassword
  company  = 'E2E Co'
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

$coBody = (@{ planSlug = $PlanSlug; billingCycle = $BillingCycle } | ConvertTo-Json -Compress)
$cj = Invoke-WithRateLimitRetry -Label 'manual checkout' -Action {
  $co = Invoke-WebRequest -Uri "$web/api/atina/payments/manual/checkout" -Method POST -ContentType 'application/json' -Body $coBody -WebSession $userSession -UseBasicParsing
  $parsed = $co.Content | ConvertFrom-Json
  if (-not $parsed.ok -or -not $parsed.data.paymentId) { throw "Checkout failed: $($co.Content)" }
  return $parsed
}
$paymentId = $cj.data.paymentId
Write-Host "  checkout OK paymentId=$paymentId" -ForegroundColor Green

$mj = Invoke-WithRateLimitRetry -Label 'mark-sent' -Action {
  $ms = Invoke-WebRequest -Uri "$web/api/atina/payments/manual/mark-sent/$paymentId" -Method POST -ContentType 'application/json' -Body '{}' -WebSession $userSession -UseBasicParsing
  $parsed = $ms.Content | ConvertFrom-Json
  if (-not $parsed.ok) { throw "Mark sent failed: $($ms.Content)" }
  return $parsed
}
Write-Host '  mark-sent OK' -ForegroundColor Green

$adminSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$adminLogin = @{ email = $AdminEmail; password = $AdminPassword } | ConvertTo-Json -Compress
$aj = Invoke-WithRateLimitRetry -Label 'admin-login' -Action {
  $r = Invoke-WebRequest -Uri "$web/api/auth/login" -Method POST -ContentType 'application/json' -Body $adminLogin -WebSession $adminSession -UseBasicParsing
  return ($r.Content | ConvertFrom-Json)
}
if (-not $aj.ok) { throw 'Admin login failed' }

$cfj = Invoke-WithRateLimitRetry -Label 'admin confirm' -Action {
  $cf = Invoke-WebRequest -Uri "$web/api/atina/payments/manual/confirm/$paymentId" -Method POST -ContentType 'application/json' -Body '{}' -WebSession $adminSession -UseBasicParsing
  $parsed = $cf.Content | ConvertFrom-Json
  if (-not $parsed.ok) { throw "Confirm failed: $($cf.Content)" }
  return $parsed
}
Write-Host '  admin confirm OK' -ForegroundColor Green

Write-Host ''
Write-Host 'e2e-register-plan-payment: PASS' -ForegroundColor Green
