#Requires -Version 5.1
<#
.SYNOPSIS
  Prod Customer A vs B: A gets a fulfilled order; B must be denied on A's IDs.
#>
param(
  [string]$WebBase = 'https://omnigrouptech.com',
  [string]$DeliverableId = 'setup-quick',
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
    [string]$Body = '',
    [switch]$AllowError
  )
  $params = @{
    Uri             = "$web$Path"
    Method          = $Method
    WebSession      = $Session
    UseBasicParsing = $true
    TimeoutSec      = 120
    Headers         = @{ Origin = $web; Referer = "$web/" }
  }
  if ($Session -and $Method -ne 'GET') {
    foreach ($c in $Session.Cookies.GetCookies([Uri]$web)) {
      if ($c.Name -eq 'og_csrf') { $params.Headers['x-csrf-token'] = $c.Value; break }
    }
  }
  if ($Body) { $params.ContentType = 'application/json'; $params.Body = $Body }
  try {
    $r = Invoke-WebRequest @params
    return @{ status = [int]$r.StatusCode; json = ($r.Content | ConvertFrom-Json) }
  } catch {
    $resp = $_.Exception.Response
    if (-not $resp) { throw }
    $code = [int]$resp.StatusCode
    $text = ''
    try { $text = (New-Object System.IO.StreamReader($resp.GetResponseStream())).ReadToEnd() } catch {}
    if (-not $AllowError) { throw "HTTP $code $Path : $text" }
    $parsed = $null
    try { $parsed = $text | ConvertFrom-Json } catch {}
    return @{ status = $code; json = $parsed; text = $text }
  }
}

function New-TestUser([string]$Label) {
  $stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $email = "e2e-iso-$Label-$stamp@test.local"
  $password = 'E2eIso1!Aa'
  $admin = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $login = Invoke-BffJson -Method POST -Path '/api/auth/login' -Session $admin -Body (@{
    email = $adminEmail; password = $adminPassword
  } | ConvertTo-Json -Compress)
  if (-not $login.json.ok) { throw 'Admin login failed' }
  $inv = Invoke-BffJson -Method POST -Path '/api/atina/admin/users/invite' -Session $admin -Body (@{
    name = "ISO $Label $stamp"; email = $email; password = $password; company = "ISO $Label"
  } | ConvertTo-Json -Compress)
  if (-not $inv.json.ok) { throw "Invite $Label failed" }
  $user = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $ul = Invoke-BffJson -Method POST -Path '/api/auth/login' -Session $user -Body (@{
    email = $email; password = $password
  } | ConvertTo-Json -Compress)
  if (-not $ul.json.ok) { throw "User $Label login failed" }
  return @{ Email = $email; Session = $user; Admin = $admin }
}

Write-Host '== Isolation A vs B ==' -ForegroundColor Cyan
$a = New-TestUser 'a'
$b = New-TestUser 'b'
Write-Host "  A=$($a.Email) B=$($b.Email)" -ForegroundColor Green

$co = Invoke-BffJson -Method POST -Path '/api/atina/payments/manual/deliverable-checkout' -Session $a.Session -Body (@{
  deliverableId = $DeliverableId
  industryCategory = $IndustryCategory
  paymentProvider = 'manual'
} | ConvertTo-Json -Compress)
if (-not $co.json.ok -or -not $co.json.data.paymentId) { throw 'A checkout failed' }
$paymentId = [string]$co.json.data.paymentId
Invoke-BffJson -Method POST -Path "/api/atina/payments/manual/mark-sent/$paymentId" -Session $a.Session -Body '{}' | Out-Null
Invoke-BffJson -Method POST -Path "/api/atina/payments/manual/confirm/$paymentId" -Session $a.Admin -Body '{}' | Out-Null

$deadline = (Get-Date).AddSeconds($FulfillmentWaitSec)
$job = $null
do {
  Start-Sleep -Seconds 5
  $jr = Invoke-BffJson -Method GET -Path "/api/atina/billing/fulfillment/jobs/$paymentId" -Session $a.Session
  if ($jr.json.ok) { $job = $jr.json.data }
  if ($job -and $job.status -in @('completed', 'failed')) { break }
} while ((Get-Date) -lt $deadline)
if (-not $job -or $job.status -ne 'completed') { throw "A fulfillment not completed: $($job.status)" }
Write-Host "  A fulfillment OK artifacts=$(@($job.artifacts).Count)" -ForegroundColor Green

$projectId = [string]$job.projectId
$denied = 0
$leaked = @()

function Assert-Denied([string]$Label, $Res) {
  if ($Res.status -in @(401, 403, 404)) {
    $script:denied++
    Write-Host "  DENIED $Label HTTP $($Res.status)" -ForegroundColor Green
    return
  }
  $ok = $false
  if ($Res.json -and $Res.json.ok -eq $false) { $ok = $true }
  if ($ok -and $Res.status -ge 400) {
    $script:denied++
    Write-Host "  DENIED $Label HTTP $($Res.status)" -ForegroundColor Green
    return
  }
  $script:leaked += "$Label HTTP $($Res.status)"
  Write-Host "  LEAK $Label HTTP $($Res.status)" -ForegroundColor Red
}

Assert-Denied "B GET fulfillment job" (Invoke-BffJson -Method GET -Path "/api/atina/billing/fulfillment/jobs/$paymentId" -Session $b.Session -AllowError)
Assert-Denied "B GET A payment" (Invoke-BffJson -Method GET -Path "/api/atina/payments/$paymentId" -Session $b.Session -AllowError)
if ($projectId) {
  Assert-Denied "B GET A project" (Invoke-BffJson -Method GET -Path "/api/atina/product-factory/projects/$projectId" -Session $b.Session -AllowError)
}
$arts = @($job.artifacts)
if ($arts.Count -gt 0 -and $arts[0].filename) {
  $fn = [uri]::EscapeDataString([string]$arts[0].filename)
  Assert-Denied "B download A artifact" (Invoke-BffJson -Method GET -Path "/api/atina/billing/fulfillment/jobs/$paymentId/artifacts/$fn" -Session $b.Session -AllowError)
}

$aJobs = Invoke-BffJson -Method GET -Path '/api/atina/billing/fulfillment/jobs?limit=20' -Session $a.Session
$bJobs = Invoke-BffJson -Method GET -Path '/api/atina/billing/fulfillment/jobs?limit=20' -Session $b.Session
$bSeesA = @($bJobs.json.data.jobs) | Where-Object { $_.paymentId -eq $paymentId -or $_.id -eq $job.id }
if ($bSeesA) {
  $leaked += 'B list contains A job'
  Write-Host '  LEAK B list contains A job' -ForegroundColor Red
} else {
  $denied++
  Write-Host '  DENIED B list does not include A job' -ForegroundColor Green
}

if ($leaked.Count -gt 0) {
  throw ("Isolation FAILED: " + ($leaked -join '; '))
}

[pscustomobject]@{
  ok = $true
  customerA = $a.Email
  customerB = $b.Email
  paymentId = $paymentId
  projectId = $projectId
  deniedChecks = $denied
  artifacts = @($arts).Count
} | ConvertTo-Json -Compress

Write-Host 'e2e-isolation-prod: PASS' -ForegroundColor Green
