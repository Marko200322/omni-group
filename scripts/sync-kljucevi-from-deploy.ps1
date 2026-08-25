#Requires -Version 5.1
<#
.SYNOPSIS
  Sync prazna polja iz deploy.config.json u KLJUCEVI-POPUNI.local.txt (M0-M6 keys).
#>
$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
. (Join-Path $scriptsDir 'deploy-config-env.ps1')

$cfgPath = Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json'
$keysPath = Join-Path $repoRoot 'atina-platform\atina\KLJUCEVI-POPUNI.local.txt'
if (-not (Test-Path $cfgPath)) { throw "Nema $cfgPath" }
if (-not (Test-Path $keysPath)) { throw "Nema $keysPath" }

$cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
$map = Get-KljuceviSyncFromDeployConfig $cfg

$out = Get-Content $keysPath | ForEach-Object {
  $line = $_
  if ($line -match '^([A-Z0-9_]+)=(.*)$') {
    $k = $Matches[1]
    $v = $Matches[2]
    if ($map.ContainsKey($k) -and [string]::IsNullOrWhiteSpace($v) -and $map[$k]) {
      return "$k=$($map[$k])"
    }
  }
  return $line
}
Set-Content $keysPath -Value $out -Encoding UTF8
Write-Host 'KLJUCEVI synced from deploy.config (empty fields only)' -ForegroundColor Green
