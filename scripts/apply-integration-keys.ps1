#Requires -Version 5.1
<#
.SYNOPSIS
  Kopira integracione kljuceve iz KLJUCEVI-POPUNI.local.txt u Atina .env i deploy.config.json.

.EXAMPLE
  .\scripts\apply-integration-keys.ps1
  .\scripts\apply-integration-keys.ps1 -DeployConfigOnly
#>
param([switch]$DeployConfigOnly)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
. (Join-Path $scriptsDir 'deploy-config-env.ps1')

$keysFile = Join-Path $repoRoot 'atina-platform\atina\KLJUCEVI-POPUNI.local.txt'
$atinaEnv = Join-Path $repoRoot 'atina-platform\atina\.env'
$deployConfig = Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json'

if (-not (Test-Path $keysFile)) { throw "Nema $keysFile" }

function Read-KeyMap([string]$Path) {
  $map = @{}
  Get-Content $Path | ForEach-Object {
    $t = $_.Trim()
    if (-not $t -or $t.StartsWith('#')) { return }
    if ($t -match '^([A-Z0-9_]+)=(.*)$') { $map[$Matches[1]] = $Matches[2].Trim() }
  }
  return $map
}

function Set-EnvLine([string]$FilePath, [string]$Key, [string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { return }
  if (-not (Test-Path $FilePath)) { return }
  $escaped = [regex]::Escape($Key)
  $lines = Get-Content $FilePath
  $found = $false
  $out = foreach ($line in $lines) {
    if ($line -match "^\s*$escaped\s*=") { $found = $true; "$Key=$Value" } else { $line }
  }
  if (-not $found) { $out += "$Key=$Value" }
  Set-Content -Path $FilePath -Value $out -Encoding UTF8
}

$keys = Read-KeyMap $keysFile

$atinaKeys = @(
  'HEYGEN_API_KEY', 'DID_API_KEY', 'SLACK_WEBHOOK_URL',
  'STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET',
  'FINANCE_KEY', 'STARTER_PRICE_ID', 'PRO_PRICE_ID', 'ENTERPRISE_PRICE_ID',
  'SCRAPER_KEY', 'SCRAPER_URL', 'HUNTER_API_KEY',
  'NEVERBOUNCE_API_KEY', 'ZEROBOUNCE_API_KEY',
  'OPENROUTER_API_KEY', 'AI_KEY', 'ELEVENLABS_API_KEY', 'RESEND_API_KEY'
)

if (-not $DeployConfigOnly) {
  foreach ($k in $atinaKeys) {
    if ($keys.ContainsKey($k) -and $keys[$k]) { Set-EnvLine $atinaEnv $k $keys[$k] }
  }
  if ($keys.STRIPE_SECRET_KEY -and -not $keys.FINANCE_KEY) {
    Set-EnvLine $atinaEnv 'FINANCE_KEY' $keys.STRIPE_SECRET_KEY
  }
  if ($keys.OPENROUTER_API_KEY -and -not $keys.AI_KEY) {
    Set-EnvLine $atinaEnv 'AI_KEY' $keys.OPENROUTER_API_KEY
  }
  Write-Host "Atina .env updated from KLJUCEVI-POPUNI.local.txt" -ForegroundColor Green
}

if (Test-Path $deployConfig) {
  $cfg = Get-Content $deployConfig -Raw | ConvertFrom-Json
  $cfg = Merge-KljuceviIntoDeployConfig $cfg $keys
  $cfg | ConvertTo-Json -Depth 6 | Set-Content $deployConfig -Encoding UTF8
  Write-Host 'deploy.config.json updated' -ForegroundColor Green
}

Write-Host 'Posle popune: .\scripts\sync-kljucevi-from-deploy.ps1 (obostrno) ili deploy (prod)' -ForegroundColor DarkGray
