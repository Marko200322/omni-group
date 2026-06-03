<#
.SYNOPSIS
  Provera prod-spremnosti web env-a (apps/omnigroup-web/.env.local) bez ispisa tajni.

.EXAMPLE
  .\scripts\check-web-env.ps1
#>
#Requires -Version 5.1
param(
  [switch]$Quiet
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
$envPath = Join-Path $repoRoot 'apps\omnigroup-web\.env.local'
$examplePath = Join-Path $repoRoot 'apps\omnigroup-web\.env.example'

if (-not (Test-Path $envPath)) {
  Write-Host "FAIL: nema $envPath (kopiraj iz .env.example)" -ForegroundColor Red
  exit 1
}

function Read-DotEnv {
  param([string]$Path)
  $map = @{}
  foreach ($line in Get-Content -LiteralPath $Path) {
    $t = $line.Trim()
    if ($t -eq '' -or $t.StartsWith('#')) { continue }
    $idx = $t.IndexOf('=')
    if ($idx -lt 1) { continue }
    $key = $t.Substring(0, $idx).Trim()
    $val = $t.Substring($idx + 1).Trim()
    $map[$key] = $val
  }
  return $map
}

function Mask-Value {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) { return '-' }
  if ($Value.Length -le 8) { return 'set' }
  return ($Value.Substring(0, 4) + '...' + $Value.Substring($Value.Length - 4))
}

$devDefaults = @(
  'change-me',
  'change-me-to-a-long-random-string',
  'change-me-in-development'
)

function Is-DevDefault {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) { return $true }
  $v = $Value.Trim().ToLowerInvariant()
  foreach ($d in $devDefaults) {
    if ($v -eq $d) { return $true }
  }
  return $false
}

$env = Read-DotEnv -Path $envPath

if (-not $Quiet) {
  Write-Host '== Web env (apps/omnigroup-web/.env.local) ==' -ForegroundColor Cyan
  Write-Host "Fajl: $envPath" -ForegroundColor DarkGray
  Write-Host ''
}

$checks = @(
  @{ Key = 'SESSION_SECRET'; MinLen = 32; DevDefault = $true; Note = 'Obavezno u produkciji (auth-session.ts)' },
  @{ Key = 'NEXT_PUBLIC_ATINA_API_BASE'; MinLen = 8; DevDefault = $false; Note = 'BFF -> Atina Node base URL' },
  @{ Key = 'RESEND_API_KEY'; MinLen = 8; DevDefault = $false; Note = 'Kontakt forma (D.2) — opciono za dev' }
)

$requiredKeys = @('SESSION_SECRET', 'NEXT_PUBLIC_ATINA_API_BASE')

$ready = 0
$required = $requiredKeys.Count

foreach ($c in $checks) {
  $val = if ($env.ContainsKey($c.Key)) { $env[$c.Key] } else { '' }
  $status = 'ok'
  if ([string]::IsNullOrWhiteSpace($val)) {
    $status = 'missing'
  } elseif ($c.DevDefault -and (Is-DevDefault -Value $val)) {
    $status = 'dev-default'
  } elseif ($c.MinLen -gt 0 -and $val.Length -lt $c.MinLen) {
    $status = 'too-short'
  }
  $isRequired = $requiredKeys -contains $c.Key
  if ($status -eq 'ok' -and $isRequired) { $ready++ }
  $color = switch ($status) {
    'ok' { 'Green' }
    'dev-default' { 'Yellow' }
    default { 'Red' }
  }
  if (-not $Quiet) {
    Write-Host ("  {0,-32} {1,-14} {2}" -f $c.Key, $status, $(Mask-Value $val)) -ForegroundColor $color
    if ($status -ne 'ok') {
      Write-Host "    $($c.Note)" -ForegroundColor DarkGray
    }
  }
}

if (-not $Quiet) {
  Write-Host ''
  Write-Host "Web prod readiness: $ready/$required polja OK" -ForegroundColor $(if ($ready -eq $required) { 'Green' } else { 'Yellow' })
  Write-Host "Sablon: $examplePath" -ForegroundColor DarkGray
}

if ($ready -lt $required) { exit 1 }
