# Postavi .env vrednosti za checklist A-F (ne dira postojeće vrednosti).
param(
  [string]$AtinaEnv = '',
  [switch]$ForceDevOutbound
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $root '..\..')).Path

if (-not $AtinaEnv) { $AtinaEnv = Join-Path $root '.env' }

function Set-EnvDefault {
  param([hashtable]$Map, [string]$Key, [string]$Value)
  if (-not $Map.ContainsKey($Key) -or [string]::IsNullOrWhiteSpace($Map[$Key])) {
    $Map[$Key] = $Value
    return $true
  }
  return $false
}

function Read-EnvFile {
  param([string]$Path)
  $lines = @()
  $map = @{}
  if (Test-Path $Path) {
    $lines = Get-Content $Path
    foreach ($line in $lines) {
      $t = $line.Trim()
      if (-not $t -or $t.StartsWith('#')) { continue }
      $eq = $t.IndexOf('=')
      if ($eq -lt 1) { continue }
      $map[$t.Substring(0, $eq).Trim()] = $t.Substring($eq + 1).Trim()
    }
  }
  return @{ lines = $lines; map = $map }
}

function Write-EnvFile {
  param([string]$Path, [hashtable]$Map, [string[]]$OriginalLines)
  $keysWritten = New-Object 'System.Collections.Generic.HashSet[string]'
  $out = New-Object System.Collections.Generic.List[string]

  foreach ($line in $OriginalLines) {
    $t = $line.Trim()
    if ($t -and -not $t.StartsWith('#') -and $t.Contains('=')) {
      $k = $t.Substring(0, $t.IndexOf('=')).Trim()
      if ($Map.ContainsKey($k)) {
        $out.Add("$k=$($Map[$k])")
        [void]$keysWritten.Add($k)
        continue
      }
    }
    $out.Add($line)
  }

  foreach ($k in $Map.Keys) {
    if (-not $keysWritten.Contains($k)) {
      $out.Add("$k=$($Map[$k])")
    }
  }

  Set-Content -Path $Path -Value $out -Encoding UTF8
}

if (-not (Test-Path $AtinaEnv)) {
  Copy-Item (Join-Path $root '.env.example') $AtinaEnv
}

$envData = Read-EnvFile $AtinaEnv
$m = $envData.map
$changed = 0

$defaults = @{
  'AUTONOMY_ROLLOUT_SEGMENT'           = 'freelance'
  'INFRASTRUCTURE_LOCAL_FALLBACK'      = 'true'
  'AUTONOMY_EVOLUTION_RUN_TESTS'       = 'true'
  'AUTONOMY_GIT_REPO_PATH'             = $repoRoot.Replace('\', '/')
  'SALES_MEETINGS_ENABLED'             = 'true'
  'PAYMENTS_MODE'                      = 'manual'
}

if ($ForceDevOutbound) {
  $defaults['OUTREACH_DEV_SEND_TO_FALLBACK'] = 'true'
}

foreach ($kv in $defaults.GetEnumerator()) {
  if (Set-EnvDefault -Map $m -Key $kv.Key -Value $kv.Value) { $changed += 1 }
}

Write-EnvFile -Path $AtinaEnv -Map $m -OriginalLines $envData.lines
Write-Host "apply-checklist-env: $changed keys added/updated in $AtinaEnv"
Write-Host "Repo path: $repoRoot"
