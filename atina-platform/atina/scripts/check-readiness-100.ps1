# Provera napretka ka 100% — A-F only; Docker (G) i Stripe (H) na kraju.
param(
  [string]$EnvFile = '',
  [string]$WebEnvFile = ''
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$repoRoot = Split-Path -Parent (Split-Path -Parent $root)

if (-not $EnvFile) { $EnvFile = Join-Path $root '.env' }
if (-not $WebEnvFile) { $WebEnvFile = Join-Path $repoRoot 'apps\omnigroup-web\.env.local' }

function Read-DotEnv {
  param([string]$Path)
  $map = @{}
  if (-not (Test-Path $Path)) { return $map }
  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $eq = $line.IndexOf('=')
    if ($eq -lt 1) { return }
    $k = $line.Substring(0, $eq).Trim()
    $v = $line.Substring($eq + 1).Trim().Trim('"').Trim("'")
    $map[$k] = $v
  }
  return $map
}

function Test-EnvSet {
  param($Map, [string]$Key)
  $v = $Map[$Key]
  return [bool]($v -and $v.Trim().Length -gt 0 -and $v -notmatch '^\(.*\)$')
}

function Score-Section {
  param([array]$Checks)
  $done = ($Checks | Where-Object { $_.ok }).Count
  $total = $Checks.Count
  $pct = if ($total -gt 0) { [math]::Round(100 * $done / $total) } else { 0 }
  return @{ done = $done; total = $total; pct = $pct; checks = $Checks }
}

$atina = Read-DotEnv $EnvFile
$web = Read-DotEnv $WebEnvFile

Write-Host ''
Write-Host '=== CHECKLIST 100% — A-F readiness (G Docker + H Stripe na kraju) ==='
Write-Host "Atina env: $EnvFile $(if (Test-Path $EnvFile) { '(found)' } else { '(missing — kopiraj .env.example)' })"
Write-Host "Web env:   $WebEnvFile $(if (Test-Path $WebEnvFile) { '(found)' } else { '(missing)' })"
Write-Host ''

# A — Kod / agregatori
$aChecks = @(
  @{ name = 'AI_URL + AI_KEY'; ok = (Test-EnvSet $atina 'AI_URL') -and (Test-EnvSet $atina 'AI_KEY') }
  @{ name = 'SCRAPER_URL + SCRAPER_KEY'; ok = (Test-EnvSet $atina 'SCRAPER_URL') -and (Test-EnvSet $atina 'SCRAPER_KEY') }
  @{ name = 'COMMS ili SMTP'; ok = ((Test-EnvSet $atina 'COMMS_URL') -and (Test-EnvSet $atina 'COMMS_KEY')) -or ($atina['SMTP_ENABLED'] -eq 'true' -and (Test-EnvSet $atina 'SMTP_USER')) }
  @{ name = 'INFRASTRUCTURE agregator'; ok = ((Test-EnvSet $atina 'INFRASTRUCTURE_URL') -and (Test-EnvSet $atina 'INFRASTRUCTURE_KEY')) -or ($atina['INFRASTRUCTURE_LOCAL_FALLBACK'] -eq 'true') }
  @{ name = 'AUTONOMY_ENABLED=true'; ok = $atina['AUTONOMY_ENABLED'] -eq 'true' }
  @{ name = 'AUTONOMY_AUTO_START_SCHEDULER'; ok = $atina['AUTONOMY_AUTO_START_SCHEDULER'] -eq 'true' }
  @{ name = 'AUTONOMY_ROLLOUT_SEGMENT=freelance'; ok = ($atina['AUTONOMY_ROLLOUT_SEGMENT'] -in @('freelance', 'online', '')) -or -not $atina.ContainsKey('AUTONOMY_ROLLOUT_SEGMENT') }
  @{ name = 'Web ATINA API base'; ok = Test-EnvSet $web 'NEXT_PUBLIC_ATINA_API_BASE' }
)
$a = Score-Section $aChecks

# B — Katalog (env priprema; DB provera kad Docker gore)
$bChecks = @(
  @{ name = 'Category rollout enabled'; ok = $atina['AUTONOMY_CATEGORY_ROLLOUT_ENABLED'] -ne 'false' }
  @{ name = 'Freelance segment'; ok = ($atina['AUTONOMY_ROLLOUT_SEGMENT'] -ne 'all') -and ($atina['AUTONOMY_ROLLOUT_SEGMENT'] -ne 'legacy_smb') }
  @{ name = 'Generated dir configured'; ok = Test-EnvSet $atina 'AUTONOMY_GENERATED_DIR' -or -not $atina.ContainsKey('AUTONOMY_GENERATED_DIR') }
)
$b = Score-Section $bChecks

# C — Prodaja
$cChecks = @(
  @{ name = 'OUTREACH_FALLBACK_EMAIL'; ok = Test-EnvSet $atina 'OUTREACH_FALLBACK_EMAIL' }
  @{ name = 'OUTREACH warmup complete'; ok = ($atina['OUTREACH_DOMAIN_WARMUP_COMPLETE'] -eq 'true') -or ($atina['OUTREACH_DEV_SEND_TO_FALLBACK'] -eq 'true') }
  @{ name = 'SMTP/COMMS za slanje'; ok = ((Test-EnvSet $atina 'COMMS_URL') -and (Test-EnvSet $atina 'COMMS_KEY')) -or ($atina['SMTP_ENABLED'] -eq 'true' -and (Test-EnvSet $atina 'SMTP_USER')) }
  @{ name = 'SALES_MEETINGS_ENABLED'; ok = $atina['SALES_MEETINGS_ENABLED'] -eq 'true' }
)
$c = Score-Section $cChecks

# D — Para (bez Stripe)
$dChecks = @(
  @{ name = 'PAYMENTS_MODE=manual'; ok = ($atina['PAYMENTS_MODE'] -eq 'manual') -or -not $atina.ContainsKey('PAYMENTS_MODE') }
  @{ name = 'MANUAL_PAYMENT_IBAN'; ok = Test-EnvSet $atina 'MANUAL_PAYMENT_IBAN' }
  @{ name = 'MANUAL_PAYMENT_ACCOUNT_NAME'; ok = Test-EnvSet $atina 'MANUAL_PAYMENT_ACCOUNT_NAME' }
  @{ name = 'PAYMENT_NOTIFY_EMAIL'; ok = Test-EnvSet $atina 'PAYMENT_NOTIFY_EMAIL' }
  @{ name = 'Stripe NOT required (deferred)'; ok = $true }
)
$d = Score-Section $dChecks

# E — Samorazvoj
$eChecks = @(
  @{ name = 'AUTONOMY git repo path'; ok = Test-EnvSet $atina 'AUTONOMY_GIT_REPO_PATH' }
  @{ name = 'AUTONOMY_AUTO_DEPLOY'; ok = $atina['AUTONOMY_AUTO_DEPLOY'] -eq 'true' -or $atina['INFRASTRUCTURE_LOCAL_FALLBACK'] -eq 'true' }
  @{ name = 'Telegram notify'; ok = (Test-EnvSet $atina 'TELEGRAM_BOT_TOKEN') -and (Test-EnvSet $atina 'TELEGRAM_CHAT_ID') }
  @{ name = 'Revenue reinvest rate set'; ok = Test-EnvSet $atina 'AUTONOMY_REVENUE_REINVEST_RATE' -or -not $atina.ContainsKey('AUTONOMY_REVENUE_REINVEST_RATE') }
  @{ name = 'Platform evolution migration'; ok = Test-Path (Join-Path $root 'src\database\migrations\019_platform_evolution.sql') }
)
$e = Score-Section $eChecks

# F — Net (env hints)
$fChecks = @(
  @{ name = 'APP_URL produkcija'; ok = (Test-EnvSet $atina 'APP_URL') -and ($atina['APP_URL'] -notmatch 'localhost') }
  @{ name = 'INFRASTRUCTURE deploy'; ok = ((Test-EnvSet $atina 'INFRASTRUCTURE_URL') -and (Test-EnvSet $atina 'INFRASTRUCTURE_KEY')) -or ($atina['INFRASTRUCTURE_LOCAL_FALLBACK'] -eq 'true') }
)
$f = Score-Section $fChecks

function Write-Section {
  param([string]$Title, $Score)
  Write-Host "$Title  $($Score.pct)%  ($($Score.done)/$($Score.total))"
  foreach ($c in $Score.checks) {
    $mark = if ($c.ok) { '[x]' } else { '[ ]' }
    Write-Host "  $mark $($c.name)"
  }
  Write-Host ''
}

Write-Section 'A — Kod i arhitektura' $a
Write-Section 'B — Online katalog (env)' $b
Write-Section 'C — Automatska prodaja' $c
Write-Section 'D — Prikupljanje para (bez Stripe)' $d
Write-Section 'E — Samorazvoj' $e
Write-Section 'F — Deploy na net' $f

Write-Host '--- Na kraju (ne ulazi u procenu iznad) ---'
Write-Host '[ ] G — Docker (lokalni stack) — posle A-F'
Write-Host '[ ] H — Stripe — poslednja, kad firma zaradi'
Write-Host ''
Write-Host 'Redosled: A -> B -> C -> D -> E -> F -> G (Docker) -> H (Stripe)'
Write-Host 'Puna checklista: docs/operations/CHECKLIST-100-PROCENTA.md'
Write-Host ''

$weighted = [math]::Round(($a.pct + $b.pct + $c.pct + $d.pct + $e.pct + $f.pct) / 6)
Write-Host "Procena A-F (bez Docker i Stripe): ~$weighted%"
