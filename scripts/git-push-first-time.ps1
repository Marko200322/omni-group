<#
.SYNOPSIS
  Prvi push na GitHub (dodaje origin i pushuje main).

.PARAMETER RepoUrl
  HTTPS URL, npr. https://github.com/markokosic/omni-group.git

.EXAMPLE
  .\scripts\git-push-first-time.ps1 -RepoUrl "https://github.com/markokosic/omni-group.git"
#>
#Requires -Version 5.1
param(
  [Parameter(Mandatory = $true)]
  [string]$RepoUrl,
  [switch]$SkipPrePush
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

if (-not $SkipPrePush) {
  Write-Host 'pre-push-check (-SkipSmoke) ...' -ForegroundColor Cyan
  & (Join-Path $scriptsDir 'pre-push-check.ps1') -SkipSmoke
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Write-Host ''
}

$remote = git remote 2>$null
if ($remote -contains 'origin') {
  Write-Host 'origin vec postoji:' -ForegroundColor Yellow
  git remote -v
  $ans = Read-Host 'Prepisati sa novim URL? (y/N)'
  if ($ans -ne 'y' -and $ans -ne 'Y') { exit 0 }
  git remote set-url origin $RepoUrl
} else {
  git remote add origin $RepoUrl
}

Write-Host "Pushing main -> origin ..." -ForegroundColor Cyan
git push -u origin main
Write-Host 'git-push-first-time: done' -ForegroundColor Green
