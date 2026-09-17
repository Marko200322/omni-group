#Requires -Version 5.1
<#
.SYNOPSIS
  Sync live-call-avatar env from deploy.config.json into local/VPS atina env files.

.EXAMPLE
  .\scripts\apply-live-call-env.ps1
  .\scripts\apply-live-call-env.ps1 -ConfigPath deploy-secrets.local\deploy.config.json
#>
param(
  [string]$ConfigPath = '',
  [string]$RepoRoot = (Split-Path $PSScriptRoot -Parent)
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'prod-lean-profile.ps1')
. (Join-Path $PSScriptRoot 'deploy-config-env.ps1')

if (-not $ConfigPath) {
  $ConfigPath = Join-Path $RepoRoot 'deploy-secrets.local\deploy.config.json'
}

$apiDomain = ''
$patches = Get-DeployConfigLiveCallEnvPatches $null ''
if (Test-Path $ConfigPath) {
  $config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
  $siteDomain = Get-DeployConfigTrim $config 'siteDomain'
  $apiDomain = Get-DeployConfigTrim $config 'apiDomain'
  if (-not $apiDomain -and $siteDomain) {
    $apiDomain = if ($siteDomain -match '^api\.') { $siteDomain } else { "api.$siteDomain" }
  }
  $patches = Get-DeployConfigLiveCallEnvPatches $config $apiDomain
  Write-Host "  Config: $ConfigPath" -ForegroundColor DarkGray
} else {
  Write-Host '  No deploy.config - applying defaults only' -ForegroundColor Yellow
}

$targets = @(
  (Join-Path $RepoRoot 'atina-platform\atina\.env.local'),
  (Join-Path $RepoRoot 'atina-platform\atina\.env.vps.prod'),
  (Join-Path $RepoRoot '.env.vps.prod')
)

Write-Host '=== apply-live-call-env ===' -ForegroundColor Cyan
if ($apiDomain) {
  Write-Host "  Recall webhook: $($patches['RECALL_WEBHOOK_URL'])" -ForegroundColor DarkGray
}
foreach ($path in $targets) {
  if (-not (Test-Path $path)) {
    Write-Host "  skip missing: $path" -ForegroundColor DarkGray
    continue
  }
  foreach ($entry in $patches.GetEnumerator()) {
    Set-EnvLineInFile $path $entry.Key $entry.Value
  }
  Write-Host "  updated: $path" -ForegroundColor Green
}

Write-Host 'Live call env synced. Paste keys in deploy.config.json then run deploy.' -ForegroundColor Yellow
