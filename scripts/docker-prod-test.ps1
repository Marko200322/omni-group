# Build + migrate + start docker-compose.prod i pokreni smoke
#Requires -Version 5.1
param(
  [switch]$SkipBuild,
  [switch]$KeepRunning
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$atinaRoot = Join-Path $repoRoot 'atina-platform\atina'
$composeFile = Join-Path $repoRoot 'docker-compose.prod.yml'
$project = 'omni-prod'

Set-Location $repoRoot

if (-not (Test-Path (Join-Path $repoRoot '.env.docker.prod'))) {
  & (Join-Path $PSScriptRoot 'prepare-docker-prod.ps1')
}

$atinaPort = 3002
$webPort = 3012
foreach ($line in Get-Content (Join-Path $repoRoot '.env.docker.prod')) {
  if ($line -match '^ATINA_PORT=(\d+)') { $atinaPort = [int]$Matches[1] }
  if ($line -match '^WEB_PORT=(\d+)') { $webPort = [int]$Matches[1] }
}

$adminPass = $null
foreach ($line in Get-Content (Join-Path $atinaRoot '.env.docker.prod')) {
  if ($line -match '^ADMIN_PASSWORD=(.*)$') { $adminPass = $Matches[1].Trim(); break }
}
if (-not $adminPass) { throw 'ADMIN_PASSWORD missing in .env.docker.prod' }

Write-Host "=== Docker prod test (project: $project) ===" -ForegroundColor Cyan
Write-Host "Ports: API $atinaPort, Web $webPort"

if (-not $SkipBuild) {
  Write-Host '[1/4] Building atina-api...' -ForegroundColor Yellow
  docker compose -f $composeFile -p $project --env-file .env.docker.prod build --progress=plain atina-api
  if ($LASTEXITCODE -ne 0) { throw 'atina-api build failed' }
  Write-Host '[1/4] Building web...' -ForegroundColor Yellow
  docker compose -f $composeFile -p $project --env-file .env.docker.prod build --progress=plain web
  if ($LASTEXITCODE -ne 0) { throw 'web build failed' }
}

Write-Host '[2/4] Starting postgres + redis...' -ForegroundColor Yellow
docker compose -f $composeFile -p $project --env-file .env.docker.prod up -d postgres redis
if ($LASTEXITCODE -ne 0) { throw 'postgres/redis start failed' }

$deadline = (Get-Date).AddMinutes(2)
do {
  Start-Sleep -Seconds 3
  $pg = docker compose -f $composeFile -p $project ps postgres --format '{{.Health}}' 2>$null
  if ($pg -eq 'healthy') { break }
} while ((Get-Date) -lt $deadline)
if ($pg -ne 'healthy') { throw 'Postgres not healthy in time' }

Write-Host '[3/4] Running migrations + seed...' -ForegroundColor Yellow
docker compose -f $composeFile -p $project --env-file .env.docker.prod --profile setup run --rm migrate
if ($LASTEXITCODE -ne 0) { throw 'Migration failed' }
docker compose -f $composeFile -p $project --env-file .env.docker.prod --profile setup run --rm seed
if ($LASTEXITCODE -ne 0) { throw 'Seed failed' }

Write-Host '[4/4] Starting API + Web...' -ForegroundColor Yellow
docker compose -f $composeFile -p $project --env-file .env.docker.prod up -d atina-api web
if ($LASTEXITCODE -ne 0) { throw 'atina-api/web start failed' }

$deadline = (Get-Date).AddMinutes(5)
do {
  Start-Sleep -Seconds 5
  try {
    $h = Invoke-RestMethod -Uri "http://127.0.0.1:$atinaPort/health" -TimeoutSec 5
    if ($h.status -eq 'ok') { break }
  } catch { }
} while ((Get-Date) -lt $deadline)

$h = Invoke-RestMethod -Uri "http://127.0.0.1:$atinaPort/health" -TimeoutSec 10
if ($h.status -ne 'ok') { throw "API health failed: $($h | ConvertTo-Json -Compress)" }
Write-Host 'API health OK' -ForegroundColor Green

try {
  $wh = Invoke-WebRequest -Uri "http://127.0.0.1:$webPort/api/health" -UseBasicParsing -TimeoutSec 30
  if ($wh.StatusCode -ne 200) { throw "Web health HTTP $($wh.StatusCode)" }
  Write-Host 'Web health OK' -ForegroundColor Green
} catch {
  throw "Web health failed: $($_.Exception.Message)"
}

Push-Location $atinaRoot
npm run smoke:all -- -BaseUrl "http://127.0.0.1:$atinaPort" -Password $adminPass
if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'smoke:all failed' }
Pop-Location

& (Join-Path $PSScriptRoot 'smoke-web-integration.ps1') -WebBase "http://127.0.0.1:$webPort" -AtinaBase "http://127.0.0.1:$atinaPort" -Password $adminPass -SkipEnsureWeb
if ($LASTEXITCODE -ne 0) { throw 'smoke-web-integration failed' }

Write-Host ''
Write-Host '=== Docker prod test PASS ===' -ForegroundColor Green
Write-Host "  API:  http://127.0.0.1:$atinaPort/health"
Write-Host "  Web:  http://127.0.0.1:$webPort"
Write-Host "  Login: admin@atina.io / $adminPass"
Write-Host ''
docker compose -f $composeFile -p $project ps

if (-not $KeepRunning) {
  Write-Host 'Stack ostaje pokrenut (koristi -KeepRunning). Za stop:'
  Write-Host "  docker compose -f docker-compose.prod.yml -p $project down"
}
