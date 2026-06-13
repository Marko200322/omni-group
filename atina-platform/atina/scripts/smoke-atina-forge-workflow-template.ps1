# npm: npm run smoke:atina-forge:workflow-template
# Optional: -BaseUrl, -Email, -Password, -AccessToken (skip login when set — required in param() for smoke-all.ps1 JWT reuse)
# Optional: -Days, -TemplateKey, -RequireTemplateKey
# Default: only validates admin execution-stats shape (200 + summary + templates). Use -RequireTemplateKey to
# enforce that -TemplateKey appears in aggregates (fails if other templates have runs but not this key).
param(
  [string]$BaseUrl = 'http://localhost:3000',
  [string]$Email = 'admin@atina.io',
  [string]$Password = 'Admin@123456',
  [string]$AccessToken = '',
  [int]$Days = 30,
  [string]$TemplateKey = 'ecosystem-hunt-to-conversion',
  [switch]$RequireTemplateKey
)

$ErrorActionPreference = 'Stop'

$base = $BaseUrl.Trim().TrimEnd('/')
$t30 = @{}
if ($PSVersionTable.PSVersion.Major -ge 6) { $t30.TimeoutSec = 30 }
if ([string]::IsNullOrWhiteSpace($AccessToken)) {
  $loginBody = @{
    email = $Email
    password = $Password
  } | ConvertTo-Json -Compress

  $login = Invoke-RestMethod @t30 -Method POST -Uri "$base/api/v1/auth/login" -ContentType 'application/json' -Body $loginBody
  $token = $login.data.accessToken
} else {
  $token = $AccessToken.Trim()
}

if (-not $token) {
  throw 'Smoke workflow template verification failed: access token missing.'
}

$stats = Invoke-RestMethod @t30 -Method GET -Uri "$base/api/v1/admin/workflow/templates/execution-stats?days=$Days" -Headers @{ Authorization = "Bearer $token" }
$data = $stats.data

if (-not $data) {
  throw 'Smoke workflow template verification failed: response data missing.'
}

if (-not $data.summary) {
  throw 'Smoke workflow template verification failed: summary missing.'
}

$summaryRuns = [int]($data.summary.totalRuns)
$templates = @()
if ($null -ne $data.templates) {
  $templates = @($data.templates)
} elseif ($summaryRuns -gt 0) {
  throw 'Smoke workflow template verification failed: templates list missing.'
}

$template = @($templates | Where-Object { $_.templateKey -eq $TemplateKey } | Select-Object -First 1)

if ($template.Count -eq 0) {
  if ($RequireTemplateKey) {
    if ($summaryRuns -eq 0) {
      [pscustomobject]@{
        ok = $true
        baseUrl = $base
        freshEnvironment = $true
        requireTemplateKey = $true
        days = $data.days
        templateKey = $TemplateKey
        summaryTotalTemplates = $data.summary.totalTemplates
        summaryTotalRuns = $data.summary.totalRuns
        summarySuccessRate = $data.summary.successRate
        alertsCount = @($data.alerts.templates).Count
      } | ConvertTo-Json -Compress
      exit 0
    }
    throw "Smoke workflow template verification failed: template key '$TemplateKey' not present in execution stats."
  }
  [pscustomobject]@{
    ok = $true
    baseUrl = $base
    templatePresent = $false
    days = $data.days
    templateKey = $TemplateKey
    summaryTotalTemplates = $data.summary.totalTemplates
    summaryTotalRuns = $data.summary.totalRuns
    summarySuccessRate = $data.summary.successRate
    alertsCount = @($data.alerts.templates).Count
  } | ConvertTo-Json -Compress
  exit 0
}

[pscustomobject]@{
  ok = $true
  baseUrl = $base
  templatePresent = $true
  days = $data.days
  templateKey = $TemplateKey
  templateRuns = $template[0].totalRuns
  templateSuccessRate = $template[0].successRate
  summaryTotalTemplates = $data.summary.totalTemplates
  summaryTotalRuns = $data.summary.totalRuns
  summarySuccessRate = $data.summary.successRate
  alertsCount = @($data.alerts.templates).Count
} | ConvertTo-Json -Compress
