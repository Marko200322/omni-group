# npm: npm run smoke:forge-admin
# Optional: -BaseUrl, -Email, -Password, -ExecutionStatsDays, -AccessToken
param(
  [string]$BaseUrl = 'http://localhost:3000',
  [string]$Email = 'admin@atina.io',
  [string]$Password = 'Admin@123456',
  [int]$ExecutionStatsDays = 30,
  [string]$AccessToken = ''
)

$ErrorActionPreference = 'Stop'

$base = $BaseUrl.Trim().TrimEnd('/')
$t15 = @{}; $t30 = @{}
if ($PSVersionTable.PSVersion.Major -ge 6) { $t15.TimeoutSec = 15; $t30.TimeoutSec = 30 }

function Get-AccessToken {
  param(
    [string]$LoginBaseUrl,
    [string]$LoginEmail,
    [string]$LoginPassword
  )

  $body = @{
    email = $LoginEmail
    password = $LoginPassword
  } | ConvertTo-Json -Compress

  $login = Invoke-RestMethod @t30 -Method POST -Uri "$LoginBaseUrl/api/v1/auth/login" -ContentType 'application/json' -Body $body
  $token = $login.data.accessToken

  if (-not $token) {
    throw 'Smoke forge/admin failed: access token missing.'
  }

  return $token
}

if ([string]::IsNullOrWhiteSpace($AccessToken)) {
  $token = Get-AccessToken -LoginBaseUrl $base -LoginEmail $Email -LoginPassword $Password
} else {
  $token = $AccessToken.Trim()
}

if (-not $token) {
  throw 'Smoke forge/admin failed: access token missing.'
}

$headers = @{ Authorization = "Bearer $token" }

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$retryHelper = Join-Path (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $here))) 'scripts\rate-limit-retry.ps1'
. $retryHelper

$forgeStatus = Invoke-WithRateLimitRetry -Label 'forge status' -Action {
  Invoke-RestMethod @t15 -Method GET -Uri "$base/api/v1/forge/status" -Headers $headers
}
$templates = Invoke-WithRateLimitRetry -Label 'workflow templates' -Action {
  Invoke-RestMethod @t15 -Method GET -Uri "$base/api/v1/workflow-chain/templates" -Headers $headers
}
$adminOverview = Invoke-WithRateLimitRetry -Label 'admin overview' -Action {
  Invoke-RestMethod @t15 -Method GET -Uri "$base/api/v1/admin/overview" -Headers $headers
}
$executionStats = Invoke-WithRateLimitRetry -Label 'admin execution stats' -Action {
  Invoke-RestMethod @t30 -Method GET -Uri "$base/api/v1/admin/workflow/templates/execution-stats?days=$ExecutionStatsDays" -Headers $headers
}

$templateRows = @()
if ($templates -and $templates.data) {
  $templateRows = @($templates.data)
}

$atinaTemplateCount = @($templateRows | Where-Object { $_.key -like 'atina-*' }).Count
$atinaForgeTemplateCount = @($templateRows | Where-Object { $_.key -like 'atina-forge-*' }).Count
$hasAtinaForgeSyncLoop = @($templateRows | Where-Object { $_.key -eq 'atina-forge-sync-loop' }).Count -gt 0

if (-not $forgeStatus.data) {
  throw 'Smoke forge/admin failed: forge status payload missing.'
}
if (-not $adminOverview.data) {
  throw 'Smoke forge/admin failed: admin overview payload missing.'
}
if (-not $executionStats.data) {
  throw 'Smoke forge/admin failed: admin workflow template stats payload missing.'
}
if ($atinaTemplateCount -lt 1) {
  throw 'Smoke forge/admin failed: no Atina templates were returned.'
}
if ($atinaForgeTemplateCount -lt 1) {
  throw 'Smoke forge/admin failed: no Atina+Forge templates were returned.'
}

[pscustomobject]@{
  ok = $true
  baseUrl = $base
  checks = @{
    forgeStatus = @{
      ok = $true
      budgetRsd = $forgeStatus.data.budgetRsd
      nextProvider = $forgeStatus.data.nextProvider
    }
    templates = @{
      ok = $hasAtinaForgeSyncLoop
      total = @($templateRows).Count
      atinaTemplates = $atinaTemplateCount
      atinaForgeTemplates = $atinaForgeTemplateCount
      hasAtinaForgeSyncLoop = $hasAtinaForgeSyncLoop
    }
    admin = @{
      overviewOk = ($null -ne $adminOverview.data.workflowTemplatesExecutionSummary)
      executionStatsOk = ($null -ne $executionStats.data.summary)
      usersTotal = $adminOverview.data.users.total
      workflowTemplatesEvaluated = $executionStats.data.alerts.totalTemplatesEvaluated
      workflowTemplateAlerted = $executionStats.data.alerts.totalAlertedTemplates
      executionStatsDays = $executionStats.data.days
    }
  }
} | ConvertTo-Json -Compress -Depth 8
