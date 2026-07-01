#Requires -Version 5.1
<#
.SYNOPSIS
  Proverava da li site + api A zapisi pokazuju na VPS IP iz deploy.config.json.
#>
param(
  [string]$ConfigPath = ''
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
if ($rows | Where-Object { -not $_.Ok }) {
  Write-Host 'Dodaj A zapise kod DNS provajdera:' -ForegroundColor Yellow
  Write-Host "  $site  ->  $vpsIp"
  Write-Host "  $api  ->  $vpsIp"
  exit 1
}
Write-Host 'DNS OK' -ForegroundColor Green
