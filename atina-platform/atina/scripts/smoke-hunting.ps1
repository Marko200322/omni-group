# npm: npm run smoke:hunting
# Lovacki modul — readiness, bootstrap, templates, opciono pipeline run.
# Optional: -BaseUrl, -Email, -Password, -AccessToken (skip login when set — required in param() for smoke-all reuse)
# Optional: -SkipPipeline (samo readiness + bootstrap + templates, bez pipeline/run)
# Optional: -VerticalSlug, -Intensity, -TemplateKey
param(
  [string]$BaseUrl = 'http://localhost:3000',
  [string]$Email = 'admin@atina.io',
  [string]$Password = 'Admin@123456',
  [string]$AccessToken = '',
  [switch]$SkipPipeline,
  [string]$VerticalSlug = 'marketing',
  [int]$Intensity = 40,
  [string]$TemplateKey = 'nurture-loop'
)

$ErrorActionPreference = 'Stop'

$base = $BaseUrl.Trim().TrimEnd('/')
$t30 = @{ TimeoutSec = 30 }
$t120 = @{ TimeoutSec = 120 }
$headers = @{}

if ([string]::IsNullOrWhiteSpace($AccessToken)) {
  $loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json -Compress
  $login = Invoke-RestMethod @t30 -Method POST -Uri "$base/api/v1/auth/login" -ContentType 'application/json' -Body $loginBody
  $token = $login.data.accessToken
} else {
  $token = $AccessToken.Trim()
}

if (-not $token) {
  throw 'Smoke hunting failed: access token missing.'
}

$headers = @{ Authorization = "Bearer $token" }

Write-Host '==> hunting: readiness'
$ready = Invoke-RestMethod @t30 -Method GET -Uri "$base/api/v1/client-hunter/readiness" -Headers $headers
if (-not $ready.data) {
  throw 'Smoke hunting failed: readiness data missing.'
}
$score = [int]($ready.data.score)
Write-Host "    score=$score ready=$($ready.data.ready)"

Write-Host '==> hunting: bootstrap workspaces'
$boot = Invoke-RestMethod @t30 -Method POST -Uri "$base/api/v1/client-hunter/bootstrap" -Headers $headers -ContentType 'application/json' -Body '{}'
if (-not $boot.data.workspaces) {
  throw 'Smoke hunting failed: bootstrap workspaces missing.'
}
Write-Host "    total=$($boot.data.workspaces.total) created=$($boot.data.workspaces.created)"

Write-Host '==> hunting: workflow templates'
$tpl = Invoke-RestMethod @t30 -Method GET -Uri "$base/api/v1/workflow-chain/templates" -Headers $headers
$tplList = @($tpl.data)
$nurture = @($tplList | Where-Object { $_.key -eq $TemplateKey } | Select-Object -First 1)
if ($nurture.Count -eq 0) {
  throw "Smoke hunting failed: template '$TemplateKey' not in catalog."
}
Write-Host "    template=$TemplateKey steps=$($nurture[0].totalSteps)"

$pipelineResult = $null
if (-not $SkipPipeline) {
  Write-Host '==> hunting: pipeline run (may take up to 120s)'
  $pipeBody = @{
    verticalSlug = $VerticalSlug
    intensity = $Intensity
    templateKey = $TemplateKey
    processOutbound = $true
    force = $false
  } | ConvertTo-Json -Compress

  $pipelineResult = Invoke-RestMethod @t120 -Method POST -Uri "$base/api/v1/client-hunter/pipeline/run" -Headers $headers -ContentType 'application/json' -Body $pipeBody
  if (-not $pipelineResult.data.templateKey) {
    throw 'Smoke hunting failed: pipeline response missing templateKey.'
  }
  Write-Host "    templateKey=$($pipelineResult.data.templateKey)"
}

Write-Host '==> hunting: outbound stats'
$outStats = Invoke-RestMethod @t30 -Method GET -Uri "$base/api/v1/autonomy-loop/outbound/stats" -Headers $headers
$warmup = $outStats.data.warmupComplete
Write-Host "    warmupComplete=$warmup sentToday=$($outStats.data.sentToday)"

[pscustomobject]@{
  ok = $true
  baseUrl = $base
  readinessScore = $score
  workspacesTotal = $boot.data.workspaces.total
  templateKey = $TemplateKey
  pipelineRan = (-not $SkipPipeline.IsPresent)
  verticalSlug = $VerticalSlug
  outboundWarmupComplete = $warmup
  outboundSentToday = $outStats.data.sentToday
} | ConvertTo-Json -Compress
