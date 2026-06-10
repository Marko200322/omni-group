# Smoke: Product Factory — client order + internal SaaS lanes (isolated)
param(
  [string]$BaseUrl = 'http://localhost:3000',
  [string]$Email = 'admin@atina.io',
  [string]$Password = 'Admin@123456'
)

$ErrorActionPreference = 'Stop'
$base = $BaseUrl.Trim().TrimEnd('/')

function Invoke-AtinaJson {
  param([string]$Method, [string]$Uri, [hashtable]$Headers = @{}, [string]$Body = $null)
  $params = @{ Method = $Method; Uri = $Uri; Headers = $Headers; TimeoutSec = 180 }
  if ($Method -in @('POST', 'PUT', 'PATCH')) {
    $params.Body = if ($null -ne $Body) { $Body } else { '{}' }
    $params.ContentType = 'application/json'
  }
  return Invoke-RestMethod @params
}

$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json -Compress
$login = Invoke-AtinaJson -Method POST -Uri "$base/api/v1/auth/login" -Body $loginBody
$token = $login.data.accessToken
if (-not $token) { throw 'Login failed' }
$h = @{ Authorization = "Bearer $token" }

$coSlug = "client-demo-$(Get-Random -Maximum 99999)"
$coBody = @{
  lane = 'client_order'
  slug = $coSlug
  name = 'Client CRM Portal'
  description = 'Custom CRM for Acme d.o.o.'
  clientName = 'Acme d.o.o.'
  deliverableId = 'setup-custom'
} | ConvertTo-Json -Compress
$co = Invoke-AtinaJson -Method POST -Uri "$base/api/v1/product-factory/projects" -Headers $h -Body $coBody
Write-Host "Client order: $($co.data.isolationKey) lane=$($co.data.lane)"

$coBuild = Invoke-AtinaJson -Method POST -Uri "$base/api/v1/product-factory/projects/$($co.data.id)/build" -Headers $h
$coTest = Invoke-AtinaJson -Method POST -Uri "$base/api/v1/product-factory/projects/$($co.data.id)/test" -Headers $h
Write-Host "Client build+test: $($coTest.data.test.passed)"

$isSlug = "saas-idea-$(Get-Random -Maximum 99999)"
$isBody = @{
  lane = 'internal_saas'
  slug = $isSlug
  name = 'Omni Lead Radar'
  marketHypothesis = 'SMB lead scoring SaaS for Balkan freelance agencies'
} | ConvertTo-Json -Compress
$is = Invoke-AtinaJson -Method POST -Uri "$base/api/v1/product-factory/projects" -Headers $h -Body $isBody
$tick = Invoke-AtinaJson -Method POST -Uri "$base/api/v1/product-factory/internal/tick" -Headers $h
Write-Host "Internal tick processed: $($tick.data.processed)"

$stats = Invoke-AtinaJson -Method GET -Uri "$base/api/v1/product-factory/stats" -Headers $h
Write-Host "Stats lanes: $($stats.data.byLane | ConvertTo-Json -Compress)"

if ($co.data.isolationKey -eq $is.data.isolationKey) { throw 'Isolation keys must differ between lanes' }
Write-Host 'Product Factory smoke OK' -ForegroundColor Green
