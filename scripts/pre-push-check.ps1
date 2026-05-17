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
Write-Host "Disk C: free ${freeGb} GB" -ForegroundColor $(if ($freeGb -lt 5) { 'Yellow' } else { 'DarkGray' })
if ($freeGb -lt 5) {
  Write-Host '  Upozorenje: pre npm ci / verify-monorepo oslobodi >=5 GB' -ForegroundColor Yellow
}

$envLocal = Join-Path $repoRoot 'apps\omnigroup-web\.env.local'
if (Test-Path $envLocal) {
  $ignored = git check-ignore -q $envLocal 2>$null
  if ($LASTEXITCODE -eq 0) {
    Write-Host '.env.local je u .gitignore (OK)' -ForegroundColor Green
  } else {
    throw '.env.local NIJE ignorisan — ne commit-uj tajne!'
  }
}

if (-not $SkipSmoke) {
  & (Join-Path $scriptsDir 'owner-smoke-all.ps1')
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
Write-Host 'Vidi docs/GITHUB-PUSH-READY.md' -ForegroundColor DarkGray
