<#
.SYNOPSIS
  Copy-paste checklist za GitHub branch protection na main (vlasnik, ~5 min).

.EXAMPLE
  .\scripts\print-branch-protection-checklist.ps1
.EXAMPLE
  .\scripts\print-branch-protection-checklist.ps1 -OpenSettings
#>
#Requires -Version 5.1
param(
  [string]$Repo = 'Marko200322/omni-group',
  [string]$Branch = 'main',
  [switch]$OpenSettings
)

$checks = @(
  'Python (Doslednost dok + pytest)'
  'Atina SaaS (test:ci)'
  'Omnigroup web (Next.js build)'
  'Atina System (verify:ci)'
  'Compose (docker compose config)'
)

$url = "https://github.com/$Repo/settings/branches"

Write-Host '=== branch-protection-checklist ===' -ForegroundColor Cyan
Write-Host ''
Write-Host "URL: $url" -ForegroundColor DarkGray
Write-Host ''
Write-Host 'Korak po korak (GitHub UI):' -ForegroundColor Cyan
Write-Host '  1. Add branch protection rule (ili Edit postojece)' -ForegroundColor White
Write-Host ("  2. Branch name pattern: {0}" -f $Branch) -ForegroundColor White
Write-Host '  3. [x] Require a pull request before merging' -ForegroundColor White
Write-Host '     (opciono: Require approvals = 1)' -ForegroundColor DarkGray
Write-Host '  4. [x] Require status checks to pass before merging' -ForegroundColor White
Write-Host '  5. [x] Require branches to be up to date before merging (preporuceno)' -ForegroundColor White
Write-Host '  6. U search boxu "Status checks" izaberi SVIH 5:' -ForegroundColor White
foreach ($c in $checks) {
  Write-Host ("       - {0}" -f $c) -ForegroundColor Green
}
Write-Host '     (GitHub moze prikazati: CI (monorepo) / <ime job-a>)' -ForegroundColor DarkGray
Write-Host '  7. Save changes' -ForegroundColor White
Write-Host ''
Write-Host 'Posle Save:' -ForegroundColor Cyan
Write-Host '  gh auth login' -ForegroundColor DarkGray
Write-Host '  .\scripts\prepare-branch-protection-pr.ps1 -Push' -ForegroundColor DarkGray
Write-Host ''
Write-Host 'Runbook: docs/GIT-BRANCH-PROTECTION.md' -ForegroundColor DarkGray

if ($OpenSettings) {
  Start-Process $url
}
