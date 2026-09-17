#Requires -Version 5.1
<#
.SYNOPSIS
  Proverava da li site + api A zapisi pokazuju na VPS IP iz deploy.config.json.
#>
param(
  [string]$ConfigPath = '',
  [switch]$Strict
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not $ConfigPath) {
  $ConfigPath = Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json'
}
$config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$vpsIp = $config.vpsHost.Trim()
$site = $config.siteDomain.Trim()
$api = if ($config.apiDomain -and $config.apiDomain.Trim()) {
  $config.apiDomain.Trim()
} else {
  "api.$site"
}

function Test-DnsA([string]$HostName, [string]$ExpectedIp) {
  try {
    $records = [System.Net.Dns]::GetHostAddresses($HostName) | ForEach-Object { $_.IPAddressToString }
    $ok = $records -contains $ExpectedIp
    [pscustomobject]@{
      Host = $HostName
      Expected = $ExpectedIp
      Resolved = ($records -join ', ')
      Ok = $ok
    }
  } catch {
    [pscustomobject]@{
      Host = $HostName
      Expected = $ExpectedIp
      Resolved = 'NXDOMAIN / error'
      Ok = $false
    }
  }
}

Write-Host '=== DNS verification ===' -ForegroundColor Cyan
Write-Host "  VPS IP: $vpsIp"
$rows = @(
  (Test-DnsA $site $vpsIp),
  (Test-DnsA $api $vpsIp)
)
$rows | Format-Table -AutoSize

$siteRow = $rows | Where-Object { $_.Host -eq $site } | Select-Object -First 1
if (-not $siteRow -or -not $siteRow.Ok) {
  Write-Host "FAIL: $site ne pokazuje na $vpsIp" -ForegroundColor Red
  exit 1
}

$apiRow = $rows | Where-Object { $_.Host -eq $api } | Select-Object -First 1
if ($apiRow -and $apiRow.Ok) {
  Write-Host 'DNS OK (site + api subdomain)' -ForegroundColor Green
  exit 0
}

if ($api -eq $site) {
  Write-Host 'DNS OK (single-domain API)' -ForegroundColor Green
  exit 0
}

$healthUrl = "https://$site/health"
try {
  $health = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 25
  if ($health.StatusCode -ge 200 -and $health.StatusCode -lt 300) {
    Write-Host "DNS OK (site); API preko $healthUrl (api subdomain opciono)" -ForegroundColor Green
    if ($apiRow -and -not $apiRow.Ok) {
      Write-Host "  Napomena: dodaj A zapis $api -> $vpsIp kad bude moguce" -ForegroundColor DarkGray
    }
    exit 0
  }
} catch {
  Write-Host "Health probe failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

if ($Strict) {
  Write-Host 'Dodaj A zapise kod DNS provajdera:' -ForegroundColor Yellow
  Write-Host "  $site  ->  $vpsIp"
  Write-Host "  $api  ->  $vpsIp"
  exit 1
}

Write-Host 'DNS OK (site); api subdomain jos nije propagiran' -ForegroundColor Green
exit 0
