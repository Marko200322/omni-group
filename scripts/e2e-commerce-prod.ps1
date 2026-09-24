#Requires -Version 5.1
<#
.SYNOPSIS
  Prod commerce QA: login → Stripe test session → paid order → fulfillment → deliveries.

  Stripe LIVE is not used. Session creation proves the hosted Checkout path.
  Delivery is completed via the existing confirm → fulfillment job (same post-pay hook as the Stripe webhook).

.EXAMPLE
  .\scripts\e2e-commerce-prod.ps1
  .\scripts\e2e-commerce-prod.ps1 -DeliverableId setup-quick
#>
param(
  [string]$WebBase = 'https://omnigrouptech.com',
  [string]$DeliverableId = 'setup-quick',
  [string]$IndustryCategory = 'marketing',
  [string]$PlanSlug = 'starter',
  [int]$FulfillmentWaitSec = 180
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
. (Join-Path $scriptsDir 'resolve-admin-credentials.ps1')

$cfg = Get-Content (Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json') -Raw | ConvertFrom-Json
$web = $WebBase.TrimEnd('/')
$creds = Get-AdminCredentials -RepoRoot $repoRoot
$adminEmail = if ($cfg.adminEmail) { "$($cfg.adminEmail)".Trim() } else { $creds.Email }
$adminPassword = if ($cfg.adminPassword) { "$($cfg.adminPassword)" } else { $creds.Password }

function Invoke-BffJson {
  param(
    [string]$Method,
    [string]$Path,
    [Microsoft.PowerShell.Commands.WebRequestSession]$Session,
    [string]$Body = ''
  )
  $params = @{
    Uri             = "$web$Path"
    Method          = $Method
    WebSession      = $Session
    UseBasicParsing = $true
    TimeoutSec      = 120
    Headers         = @{
      Origin  = $web
      Referer = "$web/"
    }
  }
  if ($Session -and $Method -ne 'GET') {
    $csrf = $null
    foreach ($c in $Session.Cookies.GetCookies([Uri]$web)) {
      if ($c.Name -eq 'og_csrf') { $csrf = $c.Value; break }
    }
    if ($csrf) { $params.Headers['x-csrf-token'] = $csrf }
  }
  if ($Body) {
    $params.ContentType = 'application/json'
    $params.Body = $Body
  }
  try {
    $r = Invoke-WebRequest @params
    return ($r.Content | ConvertFrom-Json)
  } catch {
    $resp = $_.Exception.Response
    if ($resp) {
      $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
      $text = $reader.ReadToEnd()
      throw "HTTP $($resp.StatusCode) $Path : $text"
    }
    throw
  }
}

Write-Host '== E2E commerce PROD ==' -ForegroundColor Cyan
Write-Host "  web=$web deliverable=$DeliverableId plan=$PlanSlug"

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$userEmail = "e2e-commerce-$stamp@test.local"
$userPassword = 'E2eProd1!Aa'
$userName = "E2E Commerce $stamp"

$adminSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$aj = Invoke-BffJson -Method POST -Path '/api/auth/login' -Session $adminSession -Body (@{
  email = $adminEmail; password = $adminPassword
} | ConvertTo-Json -Compress)
if (-not $aj.ok) { throw 'Admin login failed' }
Write-Host '  admin login OK' -ForegroundColor Green

$inv = Invoke-BffJson -Method POST -Path '/api/atina/admin/users/invite' -Session $adminSession -Body (@{
  name = $userName; email = $userEmail; password = $userPassword; company = 'E2E Commerce Co'
} | ConvertTo-Json -Compress)
if (-not $inv.ok) { throw "Invite failed: $($inv | ConvertTo-Json -Compress)" }
Write-Host "  invite OK ($userEmail)" -ForegroundColor Green

$userSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$lj = Invoke-BffJson -Method POST -Path '/api/auth/login' -Session $userSession -Body (@{
  email = $userEmail; password = $userPassword
} | ConvertTo-Json -Compress)
if (-not $lj.ok) { throw "User login failed: $($lj | ConvertTo-Json -Compress)" }
Write-Host '  user login OK' -ForegroundColor Green

$methods = Invoke-BffJson -Method GET -Path '/api/atina/payments/methods' -Session $userSession
if (-not $methods.ok) { throw "Methods failed: $($methods | ConvertTo-Json -Compress)" }
$ids = @($methods.data.methods | ForEach-Object { $_.id })
$stripeOn = $methods.data.methods | Where-Object { $_.id -eq 'stripe' -and $_.available }
if (-not $stripeOn) { throw "Stripe not available. methods=$($ids -join ',')" }
Write-Host "  methods OK stripe=yes mode=$($methods.data.mode) ids=$($ids -join ',')" -ForegroundColor Green

$planCo = Invoke-BffJson -Method POST -Path '/api/atina/payments/stripe/checkout' -Session $userSession -Body (@{
  planSlug = $PlanSlug; billingCycle = 'monthly'; currency = 'EUR'
} | ConvertTo-Json -Compress)
if (-not $planCo.ok -or [string]$planCo.data.url -notmatch 'checkout\.stripe\.com') {
  throw "Plan Stripe checkout failed: $($planCo | ConvertTo-Json -Compress -Depth 5)"
}
Write-Host "  stripe plan session OK ($PlanSlug)" -ForegroundColor Green

$delCo = Invoke-BffJson -Method POST -Path '/api/atina/payments/stripe/deliverable-checkout' -Session $userSession -Body (@{
  deliverableId = $DeliverableId; industryCategory = $IndustryCategory
} | ConvertTo-Json -Compress)
if (-not $delCo.ok -or [string]$delCo.data.url -notmatch 'checkout\.stripe\.com') {
  throw "Deliverable Stripe checkout failed: $($delCo | ConvertTo-Json -Compress -Depth 5)"
}
$stripeAmount = $delCo.data.amount
if ($DeliverableId -eq 'setup-quick' -and $stripeAmount -ne 549) {
  throw "Stripe session amount drifted from catalog: expected 549 got $stripeAmount"
}
Write-Host "  stripe deliverable session OK paymentId=$($delCo.data.paymentId) amount=$stripeAmount" -ForegroundColor Green

$dco = Invoke-BffJson -Method POST -Path '/api/atina/payments/manual/deliverable-checkout' -Session $userSession -Body (@{
  deliverableId = $DeliverableId
  industryCategory = $IndustryCategory
  paymentProvider = 'manual'
} | ConvertTo-Json -Compress)
if (-not $dco.ok -or -not $dco.data.paymentId) {
  throw "Manual checkout failed: $($dco | ConvertTo-Json -Compress -Depth 4)"
}
$paymentId = $dco.data.paymentId
Write-Host "  order checkout OK paymentId=$paymentId amount=$($dco.data.amount)" -ForegroundColor Green

$ms = Invoke-BffJson -Method POST -Path "/api/atina/payments/manual/mark-sent/$paymentId" -Session $userSession -Body '{}'
if (-not $ms.ok) { throw 'Mark sent failed' }
Write-Host '  payment marked sent' -ForegroundColor Green

$cf = Invoke-BffJson -Method POST -Path "/api/atina/payments/manual/confirm/$paymentId" -Session $adminSession -Body '{}'
if (-not $cf.ok) { throw "Confirm failed: $($cf | ConvertTo-Json -Compress)" }
Write-Host '  payment confirmed' -ForegroundColor Green

Write-Host "  waiting fulfillment (max ${FulfillmentWaitSec}s)..." -ForegroundColor DarkGray
$deadline = (Get-Date).AddSeconds($FulfillmentWaitSec)
$finalStatus = 'unknown'
$artifactCount = 0
do {
  Start-Sleep -Seconds 5
  $job = Invoke-BffJson -Method GET -Path "/api/atina/billing/fulfillment/jobs/$paymentId" -Session $adminSession
  if ($job.ok -and $job.data) {
    $finalStatus = if ($job.data.status) { "$($job.data.status)" } else { "$($job.data.jobStatus)" }
    $artifactCount = @($job.data.artifacts).Count
    Write-Host "    status=$finalStatus artifacts=$artifactCount" -ForegroundColor DarkGray
    if ($finalStatus -in @('completed', 'failed', 'cancelled')) { break }
  }
} while ((Get-Date) -lt $deadline)

if ($finalStatus -ne 'completed') {
  throw "Fulfillment not completed: status=$finalStatus artifacts=$artifactCount"
}
Write-Host "  delivery OK status=$finalStatus artifacts=$artifactCount" -ForegroundColor Green

$jobs = Invoke-BffJson -Method GET -Path '/api/atina/billing/fulfillment/jobs?limit=10' -Session $userSession
$jobCount = @($jobs.data.jobs).Count
if (-not $jobs.ok) { throw 'Client deliveries list failed' }
Write-Host "  client deliveries list OK jobs=$jobCount" -ForegroundColor Green

$projects = Invoke-BffJson -Method GET -Path '/api/atina/product-factory/projects?lane=client_order&limit=20' -Session $userSession
$projectCount = @($projects.data.projects).Count
Write-Host "  client orders/projects list OK projects=$projectCount" -ForegroundColor Green

[pscustomobject]@{
  ok                 = $true
  webBase            = $web
  userEmail          = $userEmail
  deliverableId      = $DeliverableId
  stripePlanUrl      = [string]$planCo.data.url
  stripeDeliverable  = $delCo.data.paymentId
  stripeAmount       = $stripeAmount
  paidPaymentId      = $paymentId
  fulfillment        = $finalStatus
  artifacts          = $artifactCount
  deliveryJobs       = $jobCount
  clientProjects     = $projectCount
  paymentsMode       = $methods.data.mode
} | ConvertTo-Json -Compress

Write-Host 'e2e-commerce-prod: PASS' -ForegroundColor Green
