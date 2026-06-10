# Admin A0-A4 audit — shows SET/MISSING only (no secret values).
$atinaEnv = Join-Path (Split-Path -Parent $PSScriptRoot) '.env'
$webEnv = Join-Path (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))) 'apps\omnigroup-web\.env.local'

function Read-Map($path) {
  $m = @{}
  if (-not (Test-Path $path)) { return $m }
  Get-Content $path | ForEach-Object {
    $t = $_.Trim()
    if (-not $t -or $t.StartsWith('#') -or -not $t.Contains('=')) { return }
    $eq = $t.IndexOf('=')
    $m[$t.Substring(0, $eq).Trim()] = $t.Substring($eq + 1).Trim().Trim('"').Trim("'")
  }
  $m
}

function Status($map, $key) {
  $v = $map[$key]
  if ($null -eq $v -or $v -eq '') { return 'MISSING' }
  if ($v -match '^\(.*\)$|your_|change-me|placeholder|example\.com') { return 'PLACEHOLDER' }
  return 'SET'
}

$a = Read-Map $atinaEnv
$w = Read-Map $webEnv

Write-Host "=== ADMIN CHECKLIST AUDIT (values hidden) ==="
Write-Host "Atina: $atinaEnv"
Write-Host ""

$rows = @(
  @{ id='A0-1'; item='OpenRouter AI_URL'; s=(Status $a 'AI_URL') }
  @{ id='A0-1'; item='OpenRouter AI_KEY'; s=(Status $a 'AI_KEY') }
  @{ id='A0-2'; item='MANUAL_PAYMENT_ACCOUNT_NAME'; s=(Status $a 'MANUAL_PAYMENT_ACCOUNT_NAME') }
  @{ id='A0-2'; item='MANUAL_PAYMENT_IBAN'; s=(Status $a 'MANUAL_PAYMENT_IBAN') }
  @{ id='A0-2'; item='MANUAL_PAYMENT_BANK'; s=(Status $a 'MANUAL_PAYMENT_BANK') }
  @{ id='A0-2'; item='PAYMENTS_MODE=manual'; s=if($a['PAYMENTS_MODE'] -eq 'manual'){'SET'}else{'MISSING'} }
  @{ id='A0-3'; item='COMMS_URL'; s=(Status $a 'COMMS_URL') }
  @{ id='A0-3'; item='COMMS_KEY'; s=(Status $a 'COMMS_KEY') }
  @{ id='A0-3'; item='SMTP_ENABLED'; s=if($a['SMTP_ENABLED'] -eq 'true'){'SET'}else{'MISSING'} }
  @{ id='A0-3'; item='SMTP_USER'; s=(Status $a 'SMTP_USER') }
  @{ id='A0-4'; item='OUTREACH_FALLBACK_EMAIL'; s=(Status $a 'OUTREACH_FALLBACK_EMAIL') }
  @{ id='A0-5'; item='PAYMENT_NOTIFY_EMAIL'; s=(Status $a 'PAYMENT_NOTIFY_EMAIL') }
  @{ id='A0-6'; item='SCRAPER_URL'; s=(Status $a 'SCRAPER_URL') }
  @{ id='A0-6'; item='SCRAPER_KEY'; s=(Status $a 'SCRAPER_KEY') }
  @{ id='A0-7'; item='AUTONOMY_ROLLOUT_SEGMENT=freelance'; s=if($a['AUTONOMY_ROLLOUT_SEGMENT'] -in @('freelance','online','')){'SET'}elseif($a['AUTONOMY_ROLLOUT_SEGMENT'] -eq 'freelance'){'SET'}else{$a['AUTONOMY_ROLLOUT_SEGMENT']} }
  @{ id='A1-11'; item='OUTREACH_DOMAIN_WARMUP_COMPLETE'; s=if($a['OUTREACH_DOMAIN_WARMUP_COMPLETE'] -eq 'true'){'SET'}elseif($a['OUTREACH_DEV_SEND_TO_FALLBACK'] -eq 'true'){'DEV_FALLBACK'}else{'MISSING'} }
  @{ id='A1-12'; item='SALES_MEETINGS_ENABLED'; s=if($a['SALES_MEETINGS_ENABLED'] -eq 'true'){'SET'}else{'MISSING'} }
  @{ id='A1-12'; item='SALES_GOOGLE_MEET_URL'; s=(Status $a 'SALES_GOOGLE_MEET_URL') }
  @{ id='A2-14'; item='TELEGRAM_BOT_TOKEN'; s=(Status $a 'TELEGRAM_BOT_TOKEN') }
  @{ id='A2-14'; item='TELEGRAM_CHAT_ID'; s=(Status $a 'TELEGRAM_CHAT_ID') }
  @{ id='A2-15'; item='KRIPTOMAN_ENABLED'; s=if($a['KRIPTOMAN_ENABLED'] -eq 'true'){'SET'}else{'OFF'} }
  @{ id='A3-18'; item='APP_URL (not localhost)'; s=if((Status $a 'APP_URL') -eq 'SET' -and $a['APP_URL'] -notmatch 'localhost|127\.0\.0\.1'){'SET'}elseif((Status $a 'APP_URL') -eq 'SET'){'LOCALHOST'}else{'MISSING'} }
  @{ id='A4'; item='STRIPE_SECRET_KEY / FINANCE_KEY live'; s=if($a['FINANCE_KEY'] -match '^sk_live_' -or $a['STRIPE_SECRET_KEY'] -match '^sk_live_'){'SET'}elseif((Status $a 'FINANCE_KEY') -eq 'SET'){'TEST_OR_OTHER'}else{'MISSING'} }
  @{ id='WEB'; item='NEXT_PUBLIC_ATINA_API_BASE'; s=(Status $w 'NEXT_PUBLIC_ATINA_API_BASE') }
)

foreach ($r in $rows) {
  $icon = switch ($r.s) { 'SET' {'[x]'} 'DEV_FALLBACK' {'[~]'} 'OFF' {'[-]'} 'LOCALHOST' {'[~]'} 'TEST_OR_OTHER' {'[~]'} default {'[ ]'} }
  Write-Host "$icon $($r.id) $($r.item) ($($r.s))"
}

$done = ($rows | Where-Object { $_.s -eq 'SET' }).Count
Write-Host ""
Write-Host "SET: $done / $($rows.Count) (DEV_FALLBACK/OFF/LOCALHOST = partial)"
