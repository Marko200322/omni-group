#Requires -Version 5.1
<#
.SYNOPSIS
  JA closeout smokes for factory machine (no Stripe/LLC, outbound send OFF).
#>
param(
  [string]$WebBase = 'https://omnigrouptech.com',
  [string]$ApiBase = 'https://api.omnigrouptech.com',
  [string]$ConfigPath = ''
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
if (-not $ConfigPath) { $ConfigPath = Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json' }
$cfg = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$email = [string]$cfg.adminEmail
$pass = [string]$cfg.adminPassword
$web = $WebBase.TrimEnd('/')
$api = $ApiBase.TrimEnd('/')
. (Join-Path $scriptsDir 'bff-smoke-headers.ps1')

function Ok([string]$name, [string]$detail) {
  Write-Host ("  PASS {0} - {1}" -f $name, $detail) -ForegroundColor Green
}
function Warn([string]$name, [string]$detail) {
  Write-Host ("  WARN {0} - {1}" -f $name, $detail) -ForegroundColor Yellow
}
function Fail([string]$name, [string]$detail) {
  Write-Host ("  FAIL {0} - {1}" -f $name, $detail) -ForegroundColor Red
  throw ("{0} failed: {1}" -f $name, $detail)
}

Write-Host '=== machine-closeout-smoke ===' -ForegroundColor Cyan

$h = Invoke-RestMethod "$api/health" -TimeoutSec 30
if ($h.status -ne 'ok') { Fail 'api/health' ($h | ConvertTo-Json -Compress) }
Ok 'api/health' ("db={0}" -f $h.db)

$m = Invoke-WebRequest "$api/metrics" -UseBasicParsing -TimeoutSec 20
if ($m.StatusCode -ne 200 -or $m.Content -notmatch 'atina_up 1') { Fail 'api/metrics' "$($m.StatusCode)" }
Ok 'api/metrics' 'atina_up'

foreach ($p in @('/legal/refund', '/legal/impressum', '/register', '/pricing')) {
  $r = Invoke-WebRequest "$web$p" -UseBasicParsing -TimeoutSec 40
  if ($r.StatusCode -ne 200) { Fail "page $p" "$($r.StatusCode)" }
  Ok "page $p" '200'
}

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = @{ email = $email; password = $pass } | ConvertTo-Json -Compress
$login = Invoke-WebRequest -Uri "$web/api/auth/login" -Method POST -ContentType 'application/json' `
  -Body $loginBody -WebSession $session -UseBasicParsing -TimeoutSec 60
$lj = $login.Content | ConvertFrom-Json
if (-not $lj.ok) { Fail 'admin login' $login.Content }
Ok 'admin login' $lj.user.email
$headers = Get-BffSmokePostHeaders -Session $session -WebBase $web

$fp = Invoke-WebRequest "$web/api/atina/factory-phase/status" -WebSession $session -UseBasicParsing -TimeoutSec 45
Ok 'factory-phase/status' (($fp.Content).Substring(0, [Math]::Min(180, $fp.Content.Length)))

$methods = Invoke-WebRequest "$web/api/atina/payments/methods" -WebSession $session -UseBasicParsing -TimeoutSec 45
Ok 'payments/methods' (($methods.Content).Substring(0, [Math]::Min(120, $methods.Content.Length)))

$cat = Invoke-WebRequest "$web/api/atina/billing/industry-catalog" -WebSession $session -UseBasicParsing -TimeoutSec 60
Ok 'industry-catalog' 'ok'

$ready = Invoke-WebRequest "$web/api/atina/hunting/readiness" -WebSession $session -UseBasicParsing -TimeoutSec 45
Ok 'hunting/readiness' (($ready.Content).Substring(0, [Math]::Min(160, $ready.Content.Length)))

$pipeBody = '{"verticalSlug":"marketing","intensity":20,"templateKey":"nurture-loop","processOutbound":false}'
try {
  $headers = Get-BffSmokePostHeaders -Session $session -WebBase $web
  $pipe = Invoke-WebRequest "$web/api/atina/hunting/pipeline/run" -Method POST -ContentType 'application/json' `
    -Body $pipeBody -WebSession $session -Headers $headers -UseBasicParsing -TimeoutSec 180
  Ok 'hunting pipeline (outbound OFF)' (($pipe.Content).Substring(0, [Math]::Min(160, $pipe.Content.Length)))
} catch {
  Warn 'hunting pipeline' $_.Exception.Message
}

foreach ($path in @(
  '/api/atina/analytics/admin/overview',
  '/api/atina/titanis',
  '/api/atina/autonomy-loop/status'
)) {
  try {
    $r = Invoke-WebRequest "$web$path" -WebSession $session -UseBasicParsing -TimeoutSec 45
    Ok $path ("HTTP {0}" -f $r.StatusCode)
  } catch {
    Warn $path $_.Exception.Message
  }
}

Write-Host ''
Write-Host 'machine-closeout-smoke finished.' -ForegroundColor Green
