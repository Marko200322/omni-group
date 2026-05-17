<#
.SYNOPSIS
  Admin: GitHub login + kreiranje repoa + prvi push (posle gh auth).

.EXAMPLE
  .\scripts\github-admin-push.ps1
.EXAMPLE
  .\scripts\github-admin-push.ps1 -RepoName omni-group -Private
#>
#Requires -Version 5.1
param(
  [string]$RepoName = 'omni-group',
  [switch]$Private,
  [switch]$SkipPrePush
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

$gh = Get-Command gh -ErrorAction SilentlyContinue
if (-not $gh) {
  Write-Host 'GitHub CLI (gh) nije u PATH. Restartuj terminal ili: winget install GitHub.cli' -ForegroundColor Red
  exit 1
}

$auth = gh auth status 2>&1 | Out-String
if ($auth -notmatch 'Logged in') {
  Write-Host '=== GitHub login (jednom) ===' -ForegroundColor Cyan
  Write-Host 'Otvorice se browser. Potvrdi kod na https://github.com/login/device' -ForegroundColor DarkGray
  gh auth login --web --git-protocol https --hostname github.com
}

$user = gh api user -q .login
Write-Host "GitHub user: $user" -ForegroundColor Green

$repoUrl = "https://github.com/$user/$RepoName.git"
$exists = gh repo view "$user/$RepoName" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Kreiram repo $user/$RepoName ..." -ForegroundColor Cyan
  $createArgs = @('repo', 'create', $RepoName, '--source=.', '--remote=origin', '--push')
  if ($Private) { $createArgs += '--private' } else { $createArgs += '--public' }
  gh @createArgs
} else {
  Write-Host "Repo postoji: $repoUrl" -ForegroundColor DarkGray
  $remote = git remote 2>$null
  if ($remote -notcontains 'origin') {
    git remote add origin $repoUrl
  } else {
    git remote set-url origin $repoUrl
  }
  if (-not $SkipPrePush) {
    & (Join-Path $scriptsDir 'pre-push-check.ps1') -SkipSmoke
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
  git push -u origin main
}

Write-Host ''
Write-Host "Gotovo: https://github.com/$user/$RepoName" -ForegroundColor Green
Write-Host 'Sledece: GitHub Settings -> Branches -> zastiti main' -ForegroundColor DarkGray
