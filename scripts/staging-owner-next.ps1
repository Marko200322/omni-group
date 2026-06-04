<#
.SYNOPSIS
  Jedan ekran — sta je PASS lokalno i sta vlasnik radi sledece (branch protection + staging deploy).

.EXAMPLE
  .\scripts\staging-owner-next.ps1
.EXAMPLE
  .\scripts\staging-owner-next.ps1 -RefreshHandoff
#>
#Requires -Version 5.1
param(
  [string]$Repo = 'Marko200322/omni-group',
  [switch]$RefreshHandoff
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot
. (Join-Path $scriptsDir 'lib\github-actions-api.ps1')

$sha = (git rev-parse --short HEAD).Trim()
$subject = (git log -1 --format='%s').Trim()

Write-Host '=== staging-owner-next ===' -ForegroundColor Cyan
Write-Host ''
Write-Host ("Commit: {0}  {1}" -f $sha, $subject) -ForegroundColor DarkGray
Write-Host ''

$d = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$freeGb = [math]::Round($d.FreeSpace / 1GB, 2)
$diskColor = if ($freeGb -lt 1) { 'Red' } elseif ($freeGb -lt 2) { 'Yellow' } else { 'Green' }
Write-Host ("Disk C: {0} GB" -f $freeGb) -ForegroundColor $diskColor
if ($freeGb -lt 1) {
  Write-Host '  UPOZORENJE: disk ispod 1 GB - lokalni build preskoci' -ForegroundColor Red
  Write-Host '  Docker vhdx: .\scripts\docker-disk-help.ps1 (Clean/Purge u Docker Desktop)' -ForegroundColor DarkGray
  Write-Host '  Ili deploy na staging serveru (Korak 2 ispod) - ne zahteva lokalni disk' -ForegroundColor Yellow
  Write-Host '  Lokalni gate posle cleanup: staging-preflight -SkipAtinaTestCi -SkipDiskCheck -SkipAtinaSmoke' -ForegroundColor DarkGray
}

try {
  $health = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/health' -TimeoutSec 3
  Write-Host ("Atina :3000  {0}" -f $health.status) -ForegroundColor Green
  $atinaUp = $true
} catch {
  Write-Host 'Atina :3000  down' -ForegroundColor Yellow
  $atinaUp = $false
}

try {
  $web = Invoke-WebRequest -Uri 'http://127.0.0.1:3010/api/health' -UseBasicParsing -TimeoutSec 3
  Write-Host ("Web :3010    {0}" -f $web.StatusCode) -ForegroundColor Green
} catch {
  Write-Host 'Web :3010    down' -ForegroundColor Yellow
}

$dockerOk = $false
try {
  docker info *> $null
  if ($LASTEXITCODE -eq 0) { $dockerOk = $true }
} catch { }

if (-not $dockerOk) {
  Write-Host 'Docker: down (.\scripts\docker-repair.ps1)' -ForegroundColor Red
}

Write-Host ''
$today = Get-Date -Format 'yyyy-MM-dd'
Write-Host ("Lokalno zatvoreno ($today):") -ForegroundColor Green
Write-Host '  - GitHub CI monorepo (5/5 jobova)' -ForegroundColor DarkGray
if ($atinaUp) {
  Write-Host '  - staging-preflight.ps1 -SkipAtinaTestCi' -ForegroundColor DarkGray
  Write-Host '  - owner-smoke-all.ps1' -ForegroundColor DarkGray
} else {
  Write-Host '  - staging-preflight -SkipAtinaTestCi -SkipDiskCheck -SkipAtinaSmoke [-SkipWebBuild]' -ForegroundColor DarkGray
  Write-Host '  - owner-smoke-all.ps1 -SkipAtinaSmoke' -ForegroundColor DarkGray
}
Write-Host '  - owner-gates-quick.ps1 -SkipSmoke' -ForegroundColor DarkGray

$run = (Get-OmniGithubLatestMainRun -Repo $Repo -AllowCacheFallback).Run
$deploySha = $sha
if ($run) {
  $runSha = $run.head_sha.Substring(0, 7)
  $ciOk = $run.status -eq 'completed' -and $run.conclusion -eq 'success'
  $ciColor = if ($ciOk) { 'Green' } else { 'Yellow' }
  Write-Host ("CI Run #{0}  [{1}]" -f $run.run_number, $(if ($run.conclusion) { $run.conclusion } else { $run.status })) -ForegroundColor $ciColor
  Write-Host $run.html_url -ForegroundColor DarkGray
  if ($ciOk) {
    $deploySha = (Get-OmniDeployShaFromCommit -Sha $run.head_sha).Substring(0, 7)
  }
  if ($runSha -eq $sha) {
    if ($deploySha -ne $runSha) {
      Write-Host ("  HEAD = CI commit; deploy app kod: {0} (run {1} docs-only)" -f $deploySha, $runSha) -ForegroundColor Green
    } else {
      Write-Host '  HEAD = CI commit (deploy ovaj SHA)' -ForegroundColor Green
    }
  } else {
    Write-Host ("  HEAD ({0}) != CI run ({1}) - deploy preporucen: {2}" -f $sha, $runSha, $deploySha) -ForegroundColor Yellow
  }
}

Write-Host ''
Write-Host 'Korak 1 - Branch protection (~5 min)' -ForegroundColor Cyan
Write-Host ("  https://github.com/{0}/settings/branches" -f $Repo) -ForegroundColor DarkGray
Write-Host '  Require PR + 5 status checks (vidi docs/GIT-BRANCH-PROTECTION.md)' -ForegroundColor DarkGray
Write-Host '  Provera: .\scripts\branch-protection-ready.ps1' -ForegroundColor DarkGray
Write-Host '  Posle protection: .\scripts\prepare-branch-protection-pr.ps1 -Push' -ForegroundColor DarkGray
Write-Host ''
Write-Host 'Korak 2 - Deploy na staging host (SSH, ne ovaj PC ako je disk pun)' -ForegroundColor Cyan
Write-Host ("  git clone https://github.com/{0}.git && cd omni-group && git checkout {1}" -f $Repo, $deploySha) -ForegroundColor DarkGray
Write-Host '  Atina: npm ci && npm run build && npm run migrate (backup DB pre migrate)' -ForegroundColor DarkGray
Write-Host '  Web: npm ci && npm run build' -ForegroundColor DarkGray
Write-Host ''
Write-Host 'Korak 3 - Remote smoke posle deploya' -ForegroundColor Cyan
Write-Host '  $env:STAGING_ATINA_NODE_BASE=''https://<STAGING_HOST>''' -ForegroundColor DarkGray
Write-Host '  .\scripts\staging-smoke-remote.ps1' -ForegroundColor DarkGray
Write-Host '  Popuni: docs/STAGING-EXECUTION-LOG.template.md' -ForegroundColor DarkGray
Write-Host ''
Write-Host 'Runbook: docs/VLASNIK-PAKET.md | docs/STAGING-RELEASE-CHECKLIST.md' -ForegroundColor DarkGray
Write-Host 'Staging preduslov (lokalno): docs/STAGING-LOCAL-PREFLIGHT-LATEST.md' -ForegroundColor DarkGray
Write-Host 'Azuriraj handoff: .\scripts\refresh-staging-handoff.ps1' -ForegroundColor DarkGray
Write-Host 'Brzi gate-ovi: .\scripts\owner-daily.ps1 | owner-gates-quick.ps1 -RefreshHandoff' -ForegroundColor DarkGray

if ($RefreshHandoff) {
  Write-Host ''
  & (Join-Path $scriptsDir 'refresh-staging-handoff.ps1')
  & (Join-Path $scriptsDir 'sync-ci-evidence.ps1') -AppendDryRunLog
}
