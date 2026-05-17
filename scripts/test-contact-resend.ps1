<#
.SYNOPSIS
  Test kontakt forme — stub ili Resend (D.2).

.DESCRIPTION
  Čita RESEND_* iz apps/omnigroup-web/.env.local (ako postoji).
  Bez ključa očekuje queued_local_stub.
  Sa ključem očekuje sent_via_resend (restartuj web dev posle izmene .env.local).

.EXAMPLE
  .\scripts\test-contact-resend.ps1
.EXAMPLE
  .\scripts\test-contact-resend.ps1 -WebBase http://127.0.0.1:3010
#>
#Requires -Version 5.1
param(
  [string]$WebBase = 'http://127.0.0.1:3010'
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
$envLocal = Join-Path $repoRoot 'apps\omnigroup-web\.env.local'
$web = $WebBase.TrimEnd('/')

function Read-DotEnvValue {
  param([string]$Path, [string]$Key)
  if (-not (Test-Path $Path)) { return '' }
  foreach ($line in Get-Content -LiteralPath $Path) {
    $t = $line.Trim()
    if ($t -eq '' -or $t.StartsWith('#')) { continue }
    if ($t -like "$Key=*") {
      return $t.Substring($Key.Length + 1).Trim()
    }
  }
  return ''
}

$resendKey = Read-DotEnvValue -Path $envLocal -Key 'RESEND_API_KEY'
$from = Read-DotEnvValue -Path $envLocal -Key 'CONTACT_EMAIL_FROM'
$to = Read-DotEnvValue -Path $envLocal -Key 'CONTACT_EMAIL_TO'
$expectResend = -not [string]::IsNullOrWhiteSpace($resendKey)

Write-Host "== Contact env ==" -ForegroundColor Cyan
Write-Host "  RESEND_API_KEY: $(if ($expectResend) { 'set' } else { 'missing (stub mode)' })"
Write-Host "  CONTACT_EMAIL_FROM: $(if ($from) { $from } else { '(empty)' })"
Write-Host "  CONTACT_EMAIL_TO: $(if ($to) { $to } else { '(empty)' })"

if ($expectResend -and (-not $from -or -not $to)) {
  throw 'RESEND_API_KEY je set ali CONTACT_EMAIL_FROM ili CONTACT_EMAIL_TO nedostaju u .env.local'
}

$body = @{
  name = 'Omni Group smoke'
  email = 'smoke@omnigroup.local'
  company = 'Dev test'
  message = "Contact test $(Get-Date -Format o)"
} | ConvertTo-Json -Compress

Write-Host "== POST /api/contact ==" -ForegroundColor Cyan
$res = Invoke-WebRequest -Uri "$web/api/contact" -Method POST -ContentType 'application/json' -Body $body -UseBasicParsing
$json = $res.Content | ConvertFrom-Json

if ($res.StatusCode -ne 200 -or -not $json.ok) {
  throw "Contact failed: $($res.Content)"
}

Write-Host "  message=$($json.message)" -ForegroundColor Green

if ($expectResend) {
  if ($json.message -ne 'sent_via_resend') {
    throw "Očekivan sent_via_resend, dobijeno: $($json.message)"
  }
  if ($json.id) { Write-Host "  resend_id=$($json.id)" -ForegroundColor DarkGray }
  Write-Host 'D.2 PASS — proveri inbox na CONTACT_EMAIL_TO' -ForegroundColor Green
} else {
  if ($json.message -ne 'queued_local_stub') {
    throw "Očekivan queued_local_stub, dobijeno: $($json.message)"
  }
  Write-Host 'D.3 PASS (stub). Za D.2 dodaj RESEND_API_KEY u apps/omnigroup-web/.env.local' -ForegroundColor Yellow
}
