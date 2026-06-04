<#
.SYNOPSIS
  Pre-push provera: smoke, lint, disk, git safety (.env.local).

.EXAMPLE
  .\scripts\pre-push-check.ps1
.EXAMPLE
  .\scripts\pre-push-check.ps1 -SkipSmoke
#>
#Requires -Version 5.1
param([switch]$SkipSmoke)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

Write-Host '=== pre-push-check ===' -ForegroundColor Cyan

$d = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$freeGb = [math]::Round($d.FreeSpace / 1GB, 2)
Write-Host "Disk C: free ${freeGb} GB" -ForegroundColor $(if ($freeGb -lt 1) { 'Red' } elseif ($freeGb -lt 5) { 'Yellow' } else { 'DarkGray' })
if ($freeGb -lt 1) {
  Write-Host '  KRITICNO: disk ispod 1 GB - zaustavi dev servere i pokreni free-disk-space.ps1' -ForegroundColor Red
} elseif ($freeGb -lt 5) {
  Write-Host '  Upozorenje: pre npm ci / verify-monorepo (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md; apps/omnigroup-web; npm run smoke:all) oslobodi >=5 GB' -ForegroundColor Yellow
}

$envLocal = Join-Path $repoRoot 'apps\omnigroup-web\.env.local'
if (Test-Path $envLocal) {
  $ignored = git check-ignore -q $envLocal 2>$null
  if ($LASTEXITCODE -eq 0) {
    Write-Host '.env.local je u .gitignore (OK)' -ForegroundColor Green
  } else {
    throw '.env.local NIJE ignorisan - ne commit-uj tajne!'
  }
}

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

Write-Host ''
Write-Host '== Web env (D.2 Resend) ==' -ForegroundColor Cyan
$resendKey = Read-DotEnvValue -Path $envLocal -Key 'RESEND_API_KEY'
$contactFrom = Read-DotEnvValue -Path $envLocal -Key 'CONTACT_EMAIL_FROM'
$contactTo = Read-DotEnvValue -Path $envLocal -Key 'CONTACT_EMAIL_TO'
if ([string]::IsNullOrWhiteSpace($resendKey)) {
  Write-Host '  RESEND: stub mode (queued_local_stub) - odkomentarisi RESEND_* u .env.local za D.2' -ForegroundColor Yellow
} elseif (-not $contactFrom -or -not $contactTo) {
  Write-Host '  RESEND: ključ set ali CONTACT_EMAIL_FROM/TO nedostaju' -ForegroundColor Yellow
} else {
  Write-Host '  RESEND: spreman za live test (test-contact-resend.ps1)' -ForegroundColor Green
}

Write-Host ''
& (Join-Path $scriptsDir 'check-atina-aggregators.ps1')
Write-Host ''
if (-not $SkipSmoke) {
  & (Join-Path $scriptsDir 'owner-smoke-all.ps1')
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Push-Location (Join-Path $repoRoot 'apps\omnigroup-web')
npm.cmd run lint
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

$changed = (git status --short | Measure-Object -Line).Lines
Write-Host "Git: $changed fajlova izmenjeno/netracked" -ForegroundColor DarkGray
Write-Host ''
Write-Host 'pre-push-check: PASS' -ForegroundColor Green
Write-Host 'Sledece: git add / commit / git remote add origin ... / git push' -ForegroundColor DarkGray
Write-Host 'Brzi pregled: .\scripts\owner-status.ps1' -ForegroundColor DarkGray
Write-Host 'Vidi docs/GITHUB-PUSH-READY.md' -ForegroundColor DarkGray
