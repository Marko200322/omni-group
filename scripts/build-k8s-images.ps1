#Requires -Version 5.1
<#
.SYNOPSIS
  Build Docker images for K8s deploy (Faza 6).

.EXAMPLE
  .\scripts\build-k8s-images.ps1 -Tag staging
  .\scripts\build-k8s-images.ps1 -Tag prod -Push
#>
param(
  [string]$Tag = 'staging',
  [string]$Registry = 'ghcr.io/omni-group',
  [switch]$Push
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

$images = @(
  @{ Name = 'atina-saas'; Context = Join-Path $root 'atina-platform\atina' },
  @{ Name = 'nest-api'; Context = Join-Path $root 'atina-system' },
  @{ Name = 'omnigroup-web'; Context = Join-Path $root 'apps\omnigroup-web' }
)

foreach ($img in $images) {
  $full = "$Registry/$($img.Name):$Tag"
  Write-Host "== Build $full ==" -ForegroundColor Cyan
  docker build -t $full $img.Context
  if ($Push) {
    Write-Host "== Push $full ==" -ForegroundColor Cyan
    docker push $full
  }
}

Write-Host ''
Write-Host "build-k8s-images: PASS ($Tag)" -ForegroundColor Green
Write-Host "Deploy: .\scripts\deploy-k8s.ps1 -Overlay $Tag"
