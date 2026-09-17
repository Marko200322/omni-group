<#
.SYNOPSIS
  Smoke: lovacki modul preko web BFF (readiness, bootstrap, pipeline).

.DESCRIPTION
  Pretpostavlja Atina (:3000) i web (:3010). Zahteva admin login (ne demo).

.EXAMPLE
  .\scripts\smoke-hunting-integration.ps1
  .\scripts\smoke-hunting-integration.ps1 -SkipPipeline
#>
#Requires -Version 5.1
param(
  [string]$WebBase = 'http://127.0.0.1:3010',
  [string]$AtinaBase = 'http://127.0.0.1:3000',
  [string]$Email = 'admin@atina.io',
  [string]$Password = '',
  [switch]$SkipPipeline,
  [switch]$SkipEnsureWeb,
  [switch]$SkipEnsureAtina
)

$ErrorActionPreference = 'Stop'
$web = $WebBase.TrimEnd('/')
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path $scriptsDir -Parent
. (Join-Path $scriptsDir 'resolve-admin-credentials.ps1')

if (-not $Password) {
  $creds = Get-AdminCredentials -RepoRoot $repoRoot
  $Email = $creds.Email
  $Password = $creds.Password
}
$BffTimeoutSec = 120
. (Join-Path $scriptsDir 'rate-limit-retry.ps1')
. (Join-Path $scriptsDir 'bff-smoke-headers.ps1')

if (-not $SkipEnsureWeb) {
  & (Join-Path $scriptsDir 'ensure-web-dev.ps1')
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

if (-not $SkipEnsureAtina) {
  & (Join-Path $scriptsDir 'ensure-atina-api.ps1')
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "== BFF login ==" -ForegroundColor Cyan
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = @{ email = $Email; password = $Password } | ConvertTo-Json -Compress
$lj = Invoke-WithRateLimitRetry -Label 'BFF login' -Action {
  $login = Invoke-WebRequest -Uri "$web/api/auth/login" -Method POST -ContentType 'application/json' -Body $body -WebSession $session -UseBasicParsing -TimeoutSec 45
  $parsed = $login.Content | ConvertFrom-Json
  if (-not $parsed.ok) { throw "login failed: $($login.Content)" }
  return $parsed
}
Write-Host "  OK $($lj.user.email) role=$($lj.user.role)" -ForegroundColor Green
$postHeaders = Get-BffSmokePostHeaders -Session $session -WebBase $web

Write-Host "== BFF hunting readiness ==" -ForegroundColor Cyan
$rj = Invoke-WithRateLimitRetry -Label 'hunting readiness' -Action {
  $res = Invoke-WebRequest -Uri "$web/api/atina/hunting/readiness" -WebSession $session -UseBasicParsing -TimeoutSec 45
  $parsed = $res.Content | ConvertFrom-Json
  if (-not $parsed.ok -or -not $parsed.data) { throw "readiness failed: $($res.Content)" }
  return $parsed
}
Write-Host "  OK score=$($rj.data.score)" -ForegroundColor Green

Write-Host "== BFF hunting bootstrap ==" -ForegroundColor Cyan
$bj = Invoke-WithRateLimitRetry -Label 'hunting bootstrap' -Action {
  $res = Invoke-WebRequest -Uri "$web/api/atina/hunting/bootstrap" -Method POST -WebSession $session -Headers $postHeaders -UseBasicParsing -TimeoutSec 45
  $parsed = $res.Content | ConvertFrom-Json
  if (-not $parsed.ok) { throw "bootstrap failed: $($res.Content)" }
  return $parsed
}
Write-Host "  OK workspaces=$($bj.data.workspaces.total)" -ForegroundColor Green

Write-Host "== BFF workflow templates ==" -ForegroundColor Cyan
$tj = Invoke-WithRateLimitRetry -Label 'workflow templates' -Action {
  $res = Invoke-WebRequest -Uri "$web/api/atina/workflow-chain/templates" -WebSession $session -UseBasicParsing -TimeoutSec 45
  $parsed = $res.Content | ConvertFrom-Json
  if (-not $parsed.ok) { throw "templates failed: $($res.Content)" }
  return $parsed
}
$nurture = @($tj.data | Where-Object { $_.key -eq 'nurture-loop' })
if ($nurture.Count -eq 0) { throw 'nurture-loop template missing' }
Write-Host "  OK templates=$($tj.data.Count) nurtureSteps=$($nurture[0].totalSteps)" -ForegroundColor Green

if (-not $SkipPipeline) {
  Write-Host "== BFF hunting pipeline run ==" -ForegroundColor Cyan
  $pipeBody = '{"verticalSlug":"marketing","intensity":40,"templateKey":"nurture-loop","processOutbound":true}'
  $pj = Invoke-WithRateLimitRetry -Label 'hunting pipeline' -MaxAttempts 2 -Action {
    $res = Invoke-WebRequest -Uri "$web/api/atina/hunting/pipeline/run" -Method POST -ContentType 'application/json' -Body $pipeBody -WebSession $session -Headers $postHeaders -UseBasicParsing -TimeoutSec $BffTimeoutSec
    $parsed = $res.Content | ConvertFrom-Json
    if (-not $parsed.ok) { throw "pipeline failed: $($res.Content)" }
    return $parsed
  }
  Write-Host "  OK templateKey=$($pj.data.templateKey)" -ForegroundColor Green
}

Write-Host ''
Write-Host 'smoke-hunting-integration: all checks passed.' -ForegroundColor Green
