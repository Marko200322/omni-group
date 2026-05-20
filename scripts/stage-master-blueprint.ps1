<#
.SYNOPSIS
  Staging za commit Master Blueprint izmena — iskljucuje .env tajne.

.EXAMPLE
  .\scripts\stage-master-blueprint.ps1
.EXAMPLE
  .\scripts\stage-master-blueprint.ps1 -Commit
#>
#Requires -Version 5.1
param([switch]$Commit)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

$secretPaths = @(
  'atina-platform/atina/.env',
  'atina-platform/atina/.env.local',
  'apps/omnigroup-web/.env.local'
)

Write-Host '== stage-master-blueprint ==' -ForegroundColor Cyan
git add -A
foreach ($rel in $secretPaths) {
  if (Test-Path $rel) {
    git reset -- $rel 2>$null
    Write-Host "  unstaged: $rel" -ForegroundColor DarkGray
  }
}

Write-Host ''
git status -sb
$staged = (git diff --cached --name-only | Measure-Object -Line).Lines
Write-Host ''
Write-Host "Staged fajlova: $staged" -ForegroundColor $(if ($staged -gt 0) { 'Green' } else { 'Yellow' })

if (-not $Commit) {
  Write-Host ''
  Write-Host 'Sledece (vlasnik):' -ForegroundColor Cyan
  Write-Host '  git commit -m "feat(atina): Master Blueprint integracije, agregatori, Val 357 gate"'
  Write-Host '  git push origin main'
  Write-Host 'Ili: .\scripts\stage-master-blueprint.ps1 -Commit'
  exit 0
}

if ($staged -eq 0) {
  throw 'Nema staged izmena za commit.'
}

$msg = @'
feat(atina): Master Blueprint integracije, agregatori, Val 357 gate

- 7 agregatora + CAPTCHA/DOMAIN/WEB3; C-S-R moduli; queue workers
- deal-offer/validator/proxy idempotency + COMMS/AI/SCRAPER
- test:ci 3170/3170; verify-monorepo Val 357; Nest supply-core specs
- migrate 010_leads_compat_view; ops docs + agent checklist
'@

git commit -m $msg.Trim()
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host 'Commit OK. Push: git push origin main' -ForegroundColor Green
