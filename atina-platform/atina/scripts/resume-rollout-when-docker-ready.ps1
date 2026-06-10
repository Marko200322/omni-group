# Faza G (na kraju checkliste): Docker + stack + optional rollout resume.
# Redosled: A-F prvo, pa G (Docker), pa H (Stripe).
param(
  [string]$BaseUrl = 'http://localhost:3000',
  [string]$Email = 'admin@atina.io',
  [string]$Password = 'Admin@123456',
  [int]$MinFreeGb = 15,
  [int]$WaitMinutes = 120,
  [int]$MaxCategories = 18,
  [switch]$SkipRollout,
  [switch]$StartDockerDesktop
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

function Get-FreeGb {
  return [math]::Round((Get-PSDrive C).Free / 1GB, 2)
}

function Test-DockerReady {
  docker ps 2>$null | Out-Null
  return $LASTEXITCODE -eq 0
}

function Test-AtinaHealthy {
  param([string]$Url)
  try {
    $h = Invoke-RestMethod -Method GET -Uri "$Url/health" -TimeoutSec 5
    return [bool]$h
  } catch {
    return $false
  }
}

Write-Host "=== Atina rollout resume ==="
Write-Host "Min free disk: ${MinFreeGb} GB (current: $(Get-FreeGb) GB)"

if ((Get-FreeGb) -lt $MinFreeGb) {
  Write-Warning "Disk C: has less than ${MinFreeGb} GB free. Docker may fail to start."
  Write-Warning "Free space before continuing (Disk Cleanup, Recycle Bin, unused apps)."
}

if ($StartDockerDesktop) {
  $dockerExe = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
  if (Test-Path $dockerExe) {
    Start-Process $dockerExe -ErrorAction SilentlyContinue
    Write-Host 'Started Docker Desktop...'
  }
}

$deadline = (Get-Date).AddMinutes($WaitMinutes)
while (-not (Test-DockerReady)) {
  if ((Get-Date) -gt $deadline) {
    throw "Docker not ready after ${WaitMinutes} minutes"
  }
  Write-Host "Waiting for Docker... ($(Get-FreeGb) GB free)"
  Start-Sleep -Seconds 15
}

Write-Host 'Docker OK'
Push-Location $root
try {
  docker compose up -d
  if ($LASTEXITCODE -ne 0) { throw 'docker compose up failed' }

  $base = $BaseUrl.Trim().TrimEnd('/')
  $healthDeadline = (Get-Date).AddMinutes(10)
  while (-not (Test-AtinaHealthy $base)) {
    if ((Get-Date) -gt $healthDeadline) {
      throw "Atina API not healthy at $base after 10 minutes"
    }
    Write-Host 'Waiting for Atina /health...'
    Start-Sleep -Seconds 5
  }
  Write-Host "Atina API healthy at $base"

  if ($SkipRollout) {
    Write-Host 'SkipRollout set — stack is up, rollout not started.'
    exit 0
  }

  & "$PSScriptRoot\smoke-category-rollout.ps1" -BaseUrl $base -Email $Email -Password $Password
  & "$PSScriptRoot\smoke-category-rollout.ps1" -BaseUrl $base -Email $Email -Password $Password -DoRolloutAsync -MaxCategories $MaxCategories
} finally {
  Pop-Location
}
