# Smoke: platform evolution tasks + tick
param(
  [string]$BaseUrl = 'http://localhost:3000',
  [string]$Email = 'admin@atina.io',
  [string]$Password = 'Admin@123456'
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
    $params.TimeoutSec = 300
  }
  return Invoke-RestMethod @params
}

$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json -Compress
$login = Invoke-AtinaJson -Method POST -Uri "$base/api/v1/auth/login" -Body $loginBody
$token = $login.data.accessToken
if (-not $token) { throw 'Login failed - no access token' }
$headers = @{ Authorization = "Bearer $token" }

$tasks = Invoke-AtinaJson -Method GET -Uri "$base/api/v1/autonomy-loop/evolution/tasks" -Headers $headers
$pending = @($tasks.data)
Write-Host "Evolution tasks pending/running: $($pending.Count)"

$tick = Invoke-AtinaJson -Method POST -Uri "$base/api/v1/autonomy-loop/evolution/tick" -Headers $headers -Body '{}'
$processed = $tick.data.processed
Write-Host "Evolution tick processed: $processed"
if ($tick.data.results) {
  foreach ($r in @($tick.data.results)) {
    Write-Host "  - $($r.task_type): $($r.status)"
  }
}

Write-Host 'Evolution smoke OK' -ForegroundColor Green
