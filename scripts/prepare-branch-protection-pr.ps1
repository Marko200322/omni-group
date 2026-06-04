<#
.SYNOPSIS
  Priprema probni PR za N2 0.3 / branch protection (trivijalna izmena README).

.DESCRIPTION
  Pokreni POSLE sto ukljucis branch protection na main (vidi docs/GIT-BRANCH-PROTECTION.md).
  Kreira granu, doda HTML komentar u README (ne menja render), commit-uje i opciono push-uje.

.EXAMPLE
  .\scripts\prepare-branch-protection-pr.ps1
.EXAMPLE
  .\scripts\prepare-branch-protection-pr.ps1 -Push
#>
#Requires -Version 5.1
param(
  [string]$BranchName = 'chore/n2-0-3-first-green-run',
  [string]$Repo = 'Marko200322/omni-group',
  [switch]$Push
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

Write-Host '=== prepare-branch-protection-pr ===' -ForegroundColor Cyan
Write-Host ''

if ($Push) {
  $ghOk = $false
  try {
    gh auth status 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $ghOk = $true }
  } catch { }
  if (-not $ghOk) {
    Write-Host 'FAIL: gh nije ulogovan - pre -Push: gh auth login' -ForegroundColor Red
    exit 1
  }
}

& (Join-Path $scriptsDir 'branch-protection-ready.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ''

$dirty = git status --short
if ($dirty) {
  Write-Host 'FAIL: working tree nije cist - commit/stash pre PR pripreme.' -ForegroundColor Red
  exit 1
}

$current = (git branch --show-current).Trim()
if ($current -ne 'main') {
  Write-Host ("Prebacujem sa {0} na main ..." -f $current) -ForegroundColor Yellow
  git checkout main
}

git pull --ff-only origin main 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host 'NAPOMENA: git pull nije uspeo - nastavljam sa lokalnim main.' -ForegroundColor Yellow
}

if (git show-ref --verify --quiet "refs/heads/$BranchName") {
  Write-Host ("FAIL: grana {0} vec postoji lokalno - obriši ili promeni -BranchName." -f $BranchName) -ForegroundColor Red
  exit 1
}

git checkout -b $BranchName
$readme = Join-Path $repoRoot 'README.md'
$stamp = Get-Date -Format 'yyyy-MM-dd'
$line = "<!-- ci-trigger: $stamp -->"
Add-Content -LiteralPath $readme -Value $line -Encoding utf8
git add README.md
$env:GIT_AUTHOR_NAME = 'Marko Kosic'
$env:GIT_AUTHOR_EMAIL = 'markokosic020@gmail.com'
$env:GIT_COMMITTER_NAME = 'Marko Kosic'
$env:GIT_COMMITTER_EMAIL = 'markokosic020@gmail.com'
git commit -m "chore: trigger first CI green run for N2 0.3"

Write-Host ''
Write-Host ("Grana {0} spremna (1 commit)." -f $BranchName) -ForegroundColor Green

if ($Push) {
  git push -u origin $BranchName
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Write-Host ''
  Write-Host 'Otvori PR ka main:' -ForegroundColor Cyan
  Write-Host ("  https://github.com/{0}/compare/main...{1}?expand=1" -f $Repo, $BranchName) -ForegroundColor DarkGray
} else {
  Write-Host ''
  Write-Host 'Sledece (vlasnik):' -ForegroundColor Cyan
  Write-Host ("  git push -u origin {0}" -f $BranchName) -ForegroundColor DarkGray
  Write-Host ("  https://github.com/{0}/compare/main...{1}?expand=1" -f $Repo, $BranchName) -ForegroundColor DarkGray
  Write-Host '  Sacekaj svih 5 CI check-ova zeleno, pa Merge PR.' -ForegroundColor DarkGray
}

Write-Host ''
Write-Host 'Runbook: docs/N2-0-3-EVIDENCE-LATEST.md | docs/CI-GREEN-ON-MAIN.md' -ForegroundColor DarkGray
