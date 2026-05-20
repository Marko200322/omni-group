<#
.SYNOPSIS
  Pregled atina-platform/atina/.env agregatora (bez ispisa tajni).

.EXAMPLE
  .\scripts\check-atina-aggregators.ps1
#>
#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
$envPath = Join-Path $repoRoot 'atina-platform\atina\.env'

if (-not (Test-Path $envPath)) {
  throw "Nema fajla: $envPath"
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

$env = Read-DotEnv -Path $envPath

$groups = @(
  @{ Label = '1. AI (MOZAK)'; Keys = @('AI_URL', 'AI_KEY') },
  @{ Label = '2. Biznis / marketing'; Keys = @('BUSINESS_AND_DEV_URL', 'BUSINESS_AND_DEV_KEY') },
  @{ Label = '3. Scraper'; Keys = @('SCRAPER_URL', 'SCRAPER_KEY') },
  @{ Label = '4. Finance / Stripe'; Keys = @('FINANCE_URL', 'FINANCE_KEY') },
  @{ Label = '5. Comms (email/SMS)'; Keys = @('COMMS_URL', 'COMMS_KEY') },
  @{ Label = '6. Infra'; Keys = @('INFRASTRUCTURE_URL', 'INFRASTRUCTURE_KEY') },
  @{ Label = '7. Storage'; Keys = @('STORAGE_URL', 'STORAGE_KEY') },
  @{ Label = '8. Captcha'; Keys = @('CAPTCHA_URL', 'CAPTCHA_KEY') },
  @{ Label = '9. Domain'; Keys = @('DOMAIN_URL', 'DOMAIN_KEY') },
  @{ Label = '10. Web3 storage'; Keys = @('WEB3_STORAGE_URL', 'WEB3_STORAGE_KEY') }
)

$platformExtras = @(
  @{ Key = 'PHASE'; Hint = 'v1-v6 (boot sync + gating)' },
  @{ Key = 'YOUTUBE_PIPELINE_URL'; Hint = 'tools/youtube-pipeline HTTP /run' },
  @{ Key = 'ELEVENLABS_API_KEY'; Hint = 'voice (optional)' },
  @{ Key = 'APEX_SUICIDE_SWITCH_ARMED'; Hint = 'apex-predator soft kill' }
)

$stripeExtras = @(
  'STRIPE_WEBHOOK_SECRET', 'STRIPE_PUBLISHABLE_KEY',
  'STARTER_PRICE_ID', 'PRO_PRICE_ID', 'ENTERPRISE_PRICE_ID'
)

Write-Host '== Atina agregatori (.env) ==' -ForegroundColor Cyan
Write-Host "Fajl: $envPath" -ForegroundColor DarkGray
Write-Host 'Infra (DB, JWT, admin): config/env-aggregator.json' -ForegroundColor DarkGray
Write-Host ''

foreach ($g in $groups) {
  $filled = ($g.Keys | Where-Object { $env.ContainsKey($_) -and -not [string]::IsNullOrWhiteSpace($env[$_]) }).Count
  $total = $g.Keys.Count
  $status = if ($filled -eq $total) { 'OK' } elseif ($filled -eq 0) { 'prazno' } else { 'delimicno' }
  $color = switch ($status) { 'OK' { 'Green' } 'delimicno' { 'Yellow' } default { 'DarkGray' } }
  Write-Host ("  {0,-22} {1} ({2}/{3})" -f $g.Label, $status, $filled, $total) -ForegroundColor $color
}

Write-Host ''
Write-Host 'Platform (ne agregatori):' -ForegroundColor Cyan
foreach ($item in $platformExtras) {
  $ok = $env.ContainsKey($item.Key) -and -not [string]::IsNullOrWhiteSpace($env[$item.Key])
  Write-Host ("  {0,-28} {1}  {2}" -f $item.Key, $(if ($ok) { 'set' } else { '-' }), $item.Hint) -ForegroundColor $(if ($ok) { 'Green' } else { 'DarkGray' })
}

Write-Host ''
Write-Host 'Stripe dodatno:' -ForegroundColor Cyan
foreach ($k in $stripeExtras) {
  $ok = $env.ContainsKey($k) -and -not [string]::IsNullOrWhiteSpace($env[$k])
  Write-Host ("  {0,-26} {1}" -f $k, $(if ($ok) { 'set' } else { '-' })) -ForegroundColor $(if ($ok) { 'Green' } else { 'DarkGray' })
}

Write-Host ''
Write-Host 'Napomena: lokalni dev (auth, dashboard, ai-memory) radi BEZ agregatora.' -ForegroundColor DarkGray
Write-Host 'Popuni agregatore kad ukljucujes live Stripe, AI provajdera, email, storage.' -ForegroundColor DarkGray
