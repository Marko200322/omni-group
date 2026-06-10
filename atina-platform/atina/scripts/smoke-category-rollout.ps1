# Smoke: industry seed + category rollout status (+ optional rollout tick)
param(
  [string]$BaseUrl = 'http://localhost:3000',
  [string]$Email = 'admin@atina.io',
  [string]$Password = 'Admin@123456',
  [switch]$DoSeed,
  [switch]$DoRollout,
  [switch]$DoRolloutAsync,
  [int]$MaxCategories = 1,
  [int]$Limit = 5
)

$ErrorActionPreference = 'Stop'
$base = $BaseUrl.Trim().TrimEnd('/')

function Invoke-AtinaJson {
  param(
    [string]$Method,
    [string]$Uri,
    [hashtable]$Headers = @{},
    [string]$Body = $null
  )
  $params = @{
    Method     = $Method
    Uri        = $Uri
    Headers    = $Headers
    TimeoutSec = 120
  }
  if ($Method -in @('POST', 'PUT', 'PATCH')) {
    $params.Body = if ($null -ne $Body) { $Body } else { '{}' }
    $params.ContentType = 'application/json'
    $params.TimeoutSec = 600
  }
  return Invoke-RestMethod @params
}

$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json -Compress
$login = Invoke-AtinaJson -Method POST -Uri "$base/api/v1/auth/login" -Body $loginBody
$token = $login.data.accessToken
if (-not $token) { throw 'Login failed - no access token' }
$headers = @{ Authorization = "Bearer $token" }

if ($DoSeed) {
  $seed = Invoke-AtinaJson -Method POST -Uri "$base/api/v1/autonomy-loop/verticals/seed" -Headers $headers -Body '{}'
  Write-Host "Seed: inserted=$($seed.data.inserted) total=$($seed.data.total)"
}

$status = Invoke-AtinaJson -Method GET -Uri "$base/api/v1/autonomy-loop/categories/status" -Headers $headers
$summary = $status.data
Write-Host "Rollout: $($summary.completedCategories)/$($summary.totalCategories) categories ready, $($summary.overallCompletionPct)% verticals"
Write-Host "Next: $($summary.nextCategory) - $($summary.nextCategoryName)"

if ($DoRolloutAsync -and $summary.nextCategory) {
  $body = @{
    mode = 'full'
    limit = 8
    maxCategories = $MaxCategories
    processAllVerticals = $true
  } | ConvertTo-Json -Compress
  $job = Invoke-AtinaJson -Method POST -Uri "$base/api/v1/autonomy-loop/categories/rollout/async" -Headers $headers -Body $body
  Write-Host "Async job started: $($job.data.id)"
  for ($i = 0; $i -lt 600; $i++) {
    Start-Sleep -Seconds 3
    $statusJob = Invoke-AtinaJson -Method GET -Uri "$base/api/v1/autonomy-loop/categories/rollout/job" -Headers $headers
    $active = $statusJob.data.active
    $last = $statusJob.data.last
    if ($active -and $active.status -eq 'running') { continue }
    if ($last -and $last.status -eq 'completed') {
      Write-Host "Job completed: verticals=$($last.result.totalVerticalsSucceeded)/$($last.result.totalVerticalsProcessed)"
      break
    }
    if ($last -and $last.status -eq 'failed') {
      throw "Rollout job failed: $($last.error)"
    }
  }
} elseif ($DoRollout -and $summary.nextCategory) {
  $body = @{
    mode = 'full'
    limit = 8
    maxCategories = $MaxCategories
    processAllVerticals = $true
  } | ConvertTo-Json -Compress
  $rollout = Invoke-AtinaJson -Method POST -Uri "$base/api/v1/autonomy-loop/categories/rollout" -Headers $headers -Body $body
  Write-Host "Processed categories: $($rollout.data.processedCategories), verticals: $($rollout.data.totalVerticalsProcessed) (OK: $($rollout.data.totalVerticalsSucceeded))"
}

[pscustomobject]@{
  ok = $true
  completedCategories = $summary.completedCategories
  totalCategories = $summary.totalCategories
  overallCompletionPct = $summary.overallCompletionPct
  nextCategory = $summary.nextCategory
} | ConvertTo-Json -Compress
