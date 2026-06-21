# Premium avatar env: portreti, WFH pozadine, Meet/Zoom/Live Portrait, ElevenLabs glasovi.
param(
  [string]$AtinaEnv = '',
  [string]$WebEnv = '',
  [string]$SecretsJson = '',
  [string]$SupportMeetUrl = '',
  [string]$SalesMeetUrl = '',
  [switch]$ForceAggregatorOffForOpenRouter
)

$ErrorActionPreference = 'Stop'
$atinaRoot = Split-Path -Parent $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $atinaRoot '..\..')).Path

if (-not $AtinaEnv) { $AtinaEnv = Join-Path $atinaRoot '.env' }
if (-not $WebEnv) { $WebEnv = Join-Path $repoRoot 'apps\omnigroup-web\.env.local' }
if (-not $SecretsJson) {
  $SecretsJson = Join-Path $atinaRoot 'config\avatar-premium.local.json'
}

function Set-EnvDefault {
  param([hashtable]$Map, [string]$Key, [string]$Value, [switch]$Overwrite)
  if ($Overwrite -or -not $Map.ContainsKey($Key) -or [string]::IsNullOrWhiteSpace($Map[$Key])) {
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

  $dir = Split-Path -Parent $Path
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  Set-Content -Path $Path -Value $out -Encoding UTF8
}

if (-not (Test-Path $AtinaEnv)) {
  Copy-Item (Join-Path $atinaRoot '.env.example') $AtinaEnv
}

$secrets = @{}
if (Test-Path $SecretsJson) {
  $parsed = Get-Content $SecretsJson -Raw | ConvertFrom-Json
  $parsed.PSObject.Properties | ForEach-Object { $secrets[$_.Name] = [string]$_.Value }
  Write-Host "Loaded secrets: $SecretsJson"
}

$envData = Read-EnvFile $AtinaEnv
$m = $envData.map
$changed = 0

$webBase = 'http://localhost:3010'

$defaults = @{
  'AVATAR_PUBLIC_BASE_URL'      = $webBase
  'WEB_APP_URL'                 = $webBase
  'SUPPORT_AVATAR_ENABLED'      = 'true'
  'SALES_AVATAR_ENABLED'        = 'true'
  'SALES_MEETINGS_ENABLED'      = 'true'
  'ELEVENLABS_DEFAULT_VOICE_ID' = 'pNInz6obpgDQGcFmaJgB'
  'SUPPORT_AGENT_AVATAR_URL'    = '/avatars/portraits/mila.svg'
  'SALES_AGENT_AVATAR_URL'      = '/avatars/portraits/nikola.svg'
  'MEETING_DEFAULT_DURATION_MIN' = '30'
  'AVATAR_VIDEO_PROVIDER_CHAIN'  = 'heygen,d-id,live_portrait'
  'AVATAR_TTS_PROVIDER_CHAIN'      = 'elevenlabs,cartesia'
  'AVATAR_CLIENT_MEMORY_ENABLED'   = 'true'
  'CARTESIA_MODEL_ID'              = 'sonic-2'
}

foreach ($kv in $defaults.GetEnumerator()) {
  if (Set-EnvDefault -Map $m -Key $kv.Key -Value $kv.Value) { $changed += 1 }
}

$aiUrl = ''
if ($m.ContainsKey('AI_URL')) { $aiUrl = [string]$m['AI_URL'] }
$aiUrl = $aiUrl.ToLower()
if ($ForceAggregatorOffForOpenRouter -or $aiUrl.Contains('openrouter.ai')) {
  if (Set-EnvDefault -Map $m -Key 'AVATAR_USE_AI_AGGREGATOR' -Value 'false' -Overwrite:$ForceAggregatorOffForOpenRouter) {
    $changed += 1
    Write-Host 'AVATAR_USE_AI_AGGREGATOR=false (OpenRouter nema avatar render API — koristi lokalni ElevenLabs + portreti).'
  }
}

function Apply-Secret {
  param([string]$Key, [string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) { return }
  if (Set-EnvDefault -Map $m -Key $Key -Value $Value -Overwrite) { $script:changed += 1 }
}

function Pick-First {
  param([string[]]$Values)
  foreach ($v in $Values) {
    if (-not [string]::IsNullOrWhiteSpace($v)) { return $v }
  }
  return ''
}

Apply-Secret -Key 'SUPPORT_GOOGLE_MEET_URL' -Value (Pick-First @($SupportMeetUrl, $secrets['supportGoogleMeetUrl']))
Apply-Secret -Key 'SALES_GOOGLE_MEET_URL' -Value (Pick-First @($SalesMeetUrl, $secrets['salesGoogleMeetUrl']))
Apply-Secret -Key 'ZOOM_ACCOUNT_ID' -Value $secrets['zoomAccountId']
Apply-Secret -Key 'ZOOM_CLIENT_ID' -Value $secrets['zoomClientId']
Apply-Secret -Key 'ZOOM_CLIENT_SECRET' -Value $secrets['zoomClientSecret']
Apply-Secret -Key 'APEX_LIVE_PORTRAIT_API_URL' -Value $secrets['apexLivePortraitApiUrl']
Apply-Secret -Key 'APEX_LIVE_PORTRAIT_API_KEY' -Value $secrets['apexLivePortraitApiKey']
Apply-Secret -Key 'HEYGEN_API_KEY' -Value $secrets['heygenApiKey']
Apply-Secret -Key 'DID_API_KEY' -Value $secrets['didApiKey']
Apply-Secret -Key 'CARTESIA_API_KEY' -Value $secrets['cartesiaApiKey']
Apply-Secret -Key 'CARTESIA_VOICE_ID' -Value $secrets['cartesiaVoiceId']

Write-EnvFile -Path $AtinaEnv -Map $m -OriginalLines $envData.lines

# Web app — javni URL za portrete
$webData = Read-EnvFile $WebEnv
$wm = $webData.map
if (Set-EnvDefault -Map $wm -Key 'NEXT_PUBLIC_APP_URL' -Value $webBase) { $changed += 1 }
Write-EnvFile -Path $WebEnv -Map $wm -OriginalLines $webData.lines

Write-Host ""
Write-Host "apply-avatar-premium-env: $changed keys updated" -ForegroundColor Green
Write-Host "Atina: $AtinaEnv"
Write-Host "Web:   $WebEnv"
Write-Host ""
Write-Host "Timovi (DB + kod): Support 5 | Sales 6 | WFH pozadine u /avatars/backgrounds/"
Write-Host ""
$missing = @()
if ([string]::IsNullOrWhiteSpace($m['SUPPORT_GOOGLE_MEET_URL'])) { $missing += 'SUPPORT_GOOGLE_MEET_URL' }
if ([string]::IsNullOrWhiteSpace($m['SALES_GOOGLE_MEET_URL'])) { $missing += 'SALES_GOOGLE_MEET_URL' }
if ([string]::IsNullOrWhiteSpace($m['ZOOM_ACCOUNT_ID'])) { $missing += 'ZOOM_*' }
if ([string]::IsNullOrWhiteSpace($m['APEX_LIVE_PORTRAIT_API_URL'])) { $missing += 'APEX_LIVE_PORTRAIT_*' }
if ([string]::IsNullOrWhiteSpace($m['HEYGEN_API_KEY']) -and [string]::IsNullOrWhiteSpace($m['DID_API_KEY'])) {
  $missing += 'HEYGEN_API_KEY ili DID_API_KEY (ultra-realističan video)'
}
if ($missing.Count -gt 0) {
  Write-Host "Još treba tvojih naloga (kopiraj u config/avatar-premium.local.json):" -ForegroundColor Yellow
  foreach ($item in $missing) { Write-Host "  - $item" }
  Write-Host "  Primer: atina-platform/atina/config/avatar-premium.local.json.example"
  Write-Host "  Google Meet: Calendar -> Novi dogadjaj -> Dodaj Google Meet video -> kopiraj link (2 sobe: support + sales)"
}
