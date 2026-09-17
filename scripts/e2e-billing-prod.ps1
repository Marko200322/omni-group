#Requires -Version 5.1
<#
.SYNOPSIS
  E2E on production: admin invite → deliverable checkout → mark-sent → admin confirm → fulfillment.

.EXAMPLE
  .\scripts\e2e-billing-prod.ps1
#>
param(
  [string]$WebBase = 'https://omnigrouptech.com',
  [string]$DeliverableId = 'audit',
  [string]$IndustryCategory = 'marketing',
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

Write-Host '== E2E billing PROD ==' -ForegroundColor Cyan
Write-Host "  web=$web deliverable=$DeliverableId"

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$userEmail = "e2e-prod-$stamp@test.local"
$userPassword = 'E2eProd1!Aa'
$userName = "E2E Prod $stamp"

$adminSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$adminLogin = @{ email = $adminEmail; password = $adminPassword } | ConvertTo-Json -Compress
$aj = Invoke-BffJson -Method POST -Path '/api/auth/login' -Session $adminSession -Body $adminLogin
if (-not $aj.ok) { throw 'Admin login failed' }
$null = Invoke-WebRequest -Uri "$web/admin" -WebSession $adminSession -UseBasicParsing -TimeoutSec 60 -MaximumRedirection 0 -ErrorAction SilentlyContinue

$inviteBody = @{
  name     = $userName
  email    = $userEmail
  password = $userPassword
  company  = 'E2E Prod Co'
} | ConvertTo-Json -Compress
$inv = Invoke-BffJson -Method POST -Path '/api/atina/admin/users/invite' -Session $adminSession -Body $inviteBody
if (-not $inv.ok) { throw "Invite failed: $($inv | ConvertTo-Json -Compress)" }
Write-Host "  invite OK ($userEmail)" -ForegroundColor Green

$userSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = @{ email = $userEmail; password = $userPassword } | ConvertTo-Json -Compress
$lj = Invoke-BffJson -Method POST -Path '/api/auth/login' -Session $userSession -Body $loginBody
if (-not $lj.ok) { throw "User login failed: $($lj | ConvertTo-Json -Compress)" }
Write-Host '  user login OK' -ForegroundColor Green
$null = Invoke-WebRequest -Uri "$web/pricing" -WebSession $userSession -UseBasicParsing -TimeoutSec 60 -Headers @{ Origin = $web; Referer = "$web/" }
Write-Host '  session ready' -ForegroundColor Green

$dqBody = (@{
  deliverableId    = $DeliverableId
  industryCategory = $IndustryCategory
  paymentProvider  = 'manual'
} | ConvertTo-Json -Compress)
$dco = Invoke-BffJson -Method POST -Path '/api/atina/payments/manual/deliverable-checkout' -Session $userSession -Body $dqBody
if (-not $dco.ok -or -not $dco.data.paymentId) {
  throw "Checkout failed: $($dco | ConvertTo-Json -Compress -Depth 4)"
}
$paymentId = $dco.data.paymentId
$reference = $dco.data.reference
Write-Host "  checkout OK paymentId=$paymentId ref=$reference amount=$($dco.data.amount)" -ForegroundColor Green

$ms = Invoke-BffJson -Method POST -Path "/api/atina/payments/manual/mark-sent/$paymentId" -Session $userSession -Body '{}'
if (-not $ms.ok) { throw 'Mark sent failed' }
Write-Host '  mark-sent OK' -ForegroundColor Green

$cf = Invoke-BffJson -Method POST -Path "/api/atina/payments/manual/confirm/$paymentId" -Session $adminSession -Body '{}'
if (-not $cf.ok) { throw "Confirm failed: $($cf | ConvertTo-Json -Compress)" }
Write-Host '  confirm OK' -ForegroundColor Green

Write-Host "  waiting fulfillment (max ${FulfillmentWaitSec}s)..." -ForegroundColor DarkGray
$deadline = (Get-Date).AddSeconds($FulfillmentWaitSec)
$finalStatus = 'unknown'
$artifactCount = 0
do {
  Start-Sleep -Seconds 5
  $job = Invoke-BffJson -Method GET -Path "/api/atina/billing/fulfillment/jobs/$paymentId" -Session $adminSession
  if ($job.ok -and $job.data) {
    $finalStatus = if ($job.data.status) { "$($job.data.status)" } else { "$($job.data.jobStatus)" }
    $arts = @($job.data.artifacts)
    $artifactCount = $arts.Count
    Write-Host "    status=$finalStatus artifacts=$artifactCount" -ForegroundColor DarkGray
    if ($finalStatus -in @('completed', 'failed', 'cancelled')) { break }
  }
} while ((Get-Date) -lt $deadline)

if ($finalStatus -ne 'completed') {
  throw "Fulfillment not completed: status=$finalStatus artifacts=$artifactCount"
}

Write-Host "  fulfillment OK status=$finalStatus artifacts=$artifactCount" -ForegroundColor Green

[pscustomobject]@{
  ok            = $true
  webBase       = $web
  userEmail     = $userEmail
  deliverableId = $DeliverableId
  paymentId     = $paymentId
  reference     = $reference
  fulfillment   = $finalStatus
  artifacts     = $artifactCount
} | ConvertTo-Json -Compress

Write-Host 'e2e-billing-prod: PASS' -ForegroundColor Green
