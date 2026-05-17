<#
.SYNOPSIS
  Bezbedno stage-uje agent rad za commit (bez .env / tajni).

.DESCRIPTION
  Dodaje izmene u apps/omnigroup-web, docs/AGENT-DEPLOY-CHECKLIST.md,
  scripts/* helper skripte, i povezane atina integracije.
  Ne commit-uje — vlasnik pregleda pa: git commit -m "..."

.EXAMPLE
  .\scripts\stage-agent-work.ps1
#>
#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

$paths = @(
  'apps/omnigroup-web',
  'atina-platform/atina/.env.example',
  'atina-platform/atina/scripts/smoke-health.ps1',
  'atina-platform/atina/scripts/smoke-forge-status.ps1',
  'docs/AGENT-DEPLOY-CHECKLIST.md',
  'docs/GITHUB-PUSH-READY.md',
  'docs/FAZA-4-BACKLOG-ISSUES.md',
  'scripts/start-local-stack.ps1',
  'scripts/restart-web-dev.ps1',
  'scripts/owner-status.ps1',
  'scripts/owner-smoke-all.ps1',
  'scripts/pre-push-check.ps1',
  'scripts/git-push-first-time.ps1',
  'scripts/check-atina-aggregators.ps1',
  'scripts/check-stripe-env.ps1',
  'scripts/disk-report.ps1',
  'scripts/rate-limit-retry.ps1',
  'scripts/smoke-web-integration.ps1',
  'scripts/test-contact-resend.ps1',
  'scripts/free-disk-space.ps1',
  'scripts/test-local.ps1',
  'atina-platform/atina/src/integrations',
  'atina-platform/atina/src/tests/unit/integrations'
)

foreach ($p in $paths) {
  if (Test-Path (Join-Path $repoRoot $p)) {
    git add -- $p
    Write-Host "staged $p"
  }
}

$envLocal = 'apps/omnigroup-web/.env.local'
$staged = git diff --cached --name-only
if ($staged -contains $envLocal) {
  git reset HEAD -- $envLocal
  Write-Host 'unstaged .env.local (tajne)' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Staged fajlovi:' -ForegroundColor Cyan
git diff --cached --name-only
Write-Host ''
Write-Host 'Sledece: git commit -m "..."  (ili reci agentu: napravi commit)' -ForegroundColor DarkGray
