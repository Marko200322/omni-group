#Requires -Version 5.1
<#
.SYNOPSIS
  Fast soft-home deploy on shared Contabo (nexora coexist). Default = SafeDeploy (minutes).

.DESCRIPTION
  Replaces the slow multi-step staging dance. Uses deploy.config.json (must point at soft host).
  - Pack via Python (Windows tar is flaky / ENOSPC)
  - SkipTls (no Caddy; nginx owns :80/:443)
  - Default: SafeDeploy (rebuild/recreate web+api only)
  - -Bootstrap: full migrate+seed+up (first time / wipe)

.EXAMPLE
  .\scripts\deploy-soft.ps1
  .\scripts\deploy-soft.ps1 -Bootstrap
  .\scripts\deploy-soft.ps1 -SkipPack
#>
param(
  [switch]$Bootstrap,
  [switch]$SkipPack,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $repoRoot
if (-not (Test-Path (Join-Path $repoRoot 'docker-compose.prod.yml'))) {
  throw "Not repo root: $repoRoot"
}

$cfgPath = Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json'
if (-not (Test-Path $cfgPath)) { throw "Missing $cfgPath" }
$cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
$hostIp = "$($cfg.vpsHost)".Trim()
if ($hostIp -eq '5.189.184.103') {
  throw 'deploy.config.json still points at dead Omni IP 5.189.184.103 — set vpsHost to soft host first'
}

Write-Host "== deploy-soft host=$hostIp SkipTls SafeDeploy=$(-not $Bootstrap) ==" -ForegroundColor Cyan

if (-not $SkipPack -and -not $DryRun) {
  $packPy = Join-Path $repoRoot 'deploy-secrets.local\staging-pack-upload.py'
  if (-not (Test-Path $packPy)) { throw "Missing $packPy" }
  Write-Host '== pack+upload (python) ==' -ForegroundColor Cyan
  python $packPy
  if ($LASTEXITCODE -ne 0) { throw "pack upload failed exit=$LASTEXITCODE" }
}

# Ensure SkipTls cookie/URL patch exists on remote (idempotent, seconds)
if (-not $DryRun) {
  $key = "$($cfg.sshKeyPath)".Trim()
  $patch = Join-Path $repoRoot 'deploy-secrets.local\staging-env-patch.sh'
  if ((Test-Path $patch) -and $key -and (Test-Path $key)) {
    scp -o BatchMode=yes -i $key $patch "root@${hostIp}:/tmp/staging-env-patch.sh" | Out-Null
    ssh -o BatchMode=yes -i $key "root@$hostIp" 'bash /tmp/staging-env-patch.sh' | Out-Host
  }
}

$deployArgs = @{
  ConfigPath = $cfgPath
  SkipTls    = $true
  SkipUpload = $true
  DryRun     = $DryRun
}
if ($Bootstrap) {
  Write-Host '== Bootstrap (migrate+seed+up, no caddy) ==' -ForegroundColor Yellow
} else {
  $deployArgs.SafeDeploy = $true
  Write-Host '== SafeDeploy (web+api only) ==' -ForegroundColor Green
}

& (Join-Path $repoRoot 'scripts\deploy-from-local-secrets.ps1') @deployArgs
if ($null -ne $LASTEXITCODE -and $LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ''
Write-Host 'Soft home URLs (until DNS):' -ForegroundColor Green
Write-Host "  Web:  http://${hostIp}:8080"
Write-Host "  API:  http://${hostIp}:3000/health"
Write-Host "  Domains (after Marko A-record + certbot): https://$($cfg.siteDomain)"
