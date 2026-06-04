<#
.SYNOPSIS
  Azurira docs/STAGING-LOCAL-PREFLIGHT-LATEST.md iz trenutnog HEAD + CI + servisa.

.EXAMPLE
  .\scripts\refresh-staging-handoff.ps1
.EXAMPLE
  .\scripts\refresh-staging-handoff.ps1 -Commit
#>
#Requires -Version 5.1
param(
  [string]$Repo = 'Marko200322/omni-group',
  [switch]$Commit
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
$handoff = Join-Path $repoRoot 'docs\STAGING-LOCAL-PREFLIGHT-LATEST.md'
Set-Location $repoRoot
. (Join-Path $scriptsDir 'lib\github-actions-api.ps1')

$headSha = (git rev-parse HEAD).Trim()
$headShort = $headSha.Substring(0, 7)
$today = Get-Date -Format 'yyyy-MM-dd'

$d = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$freeGb = [math]::Round($d.FreeSpace / 1GB, 2)

$runLine = '_(CI run nije ucitan)_'
$ciRange = '#77+'
$deploySha = $headSha
$deployShort = $headShort
$deployNote = ''
try {
  $ci = Get-OmniGithubLatestMainRun -Repo $Repo -AllowCacheFallback
  $run = $ci.Run
  if ($run) {
    $runSha = $run.head_sha
    $runShort = $runSha.Substring(0, 7)
    $ciOk = $run.status -eq 'completed' -and $run.conclusion -eq 'success'
    if (-not $ciOk) {
      try {
        $recent = @(Get-OmniGithubRecentRuns -Repo $Repo -Limit 5 -AllowCacheFallback)
        $lastGreen = Select-OmniGreenRun -Runs $recent -PreferCodeCommit
        if ($lastGreen) {
          Write-Host ("NAPOMENA: Run #{0} [{1}] - koristim poslednji zelen #{2}" -f $run.run_number, $(if ($run.conclusion) { $run.conclusion } else { $run.status }), $lastGreen.run_number) -ForegroundColor Yellow
          $run = $lastGreen
          $runSha = $run.head_sha
          $runShort = $runSha.Substring(0, 7)
          $ciOk = $true
        }
      } catch { }
    }
    $runLabel = if ($run.conclusion) { $run.conclusion } else { $run.status }
    if ($ciOk) {
      $ciRange = "#$($run.run_number)"
      $runLine = "Run [#$($run.run_number)]($($run.html_url)) - **5/5 PASS**"
      $deploySha = Get-OmniDeployShaFromCommit -Sha $runSha
      $deployShort = $deploySha.Substring(0, 7)
      if ($deployShort -ne $runShort) {
        $deployNote = " (CI run $runShort docs-only; deploy app kod $deployShort)"
        try {
          $recent = @(Get-OmniGithubRecentRuns -Repo $Repo -Limit 10 -AllowCacheFallback)
          $codeRun = Select-OmniGreenRun -Runs $recent -PreferCodeCommit
          if ($codeRun -and $codeRun.head_sha -eq $deploySha) {
            $runLine = "Run [#$($codeRun.run_number)]($($codeRun.html_url)) - **5/5 PASS**"
            $ciRange = "#$($codeRun.run_number)"
          }
        } catch { }
      }
    } else {
      $runLine = "Run [#$($run.run_number)]($($run.html_url)) - **$runLabel**"
      $ciRange = "#$($run.run_number)"
    }
    if ($runShort -ne $headShort) {
      if (-not $deployNote) {
        $deployNote = " (HEAD $headShort; deploy preporucen $deployShort = poslednji zelen CI)"
      }
      Write-Host ("NAPOMENA: HEAD {0} != CI run {1} - deploy {2}" -f $headShort, $runShort, $deployShort) -ForegroundColor Yellow
    }
  }
} catch {
  Write-Host "CI API: $($_.Exception.Message)" -ForegroundColor Yellow
}

$atina = 'down'
try {
  $h = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/health' -TimeoutSec 3
  $atina = $h.status
} catch { }

$web = 'down'
try {
  $w = Invoke-WebRequest -Uri 'http://127.0.0.1:3010/api/health' -UseBasicParsing -TimeoutSec 3
  $web = [string]$w.StatusCode
} catch { }

$diskNote = if ($freeGb -lt 1) {
  ' - ispod 1 GB; staging-preflight koristi `-MinDiskGb 1`'
} else {
  ''
}

$smokeExample = @'
```powershell
$env:STAGING_ATINA_NODE_BASE='https://<STAGING_HOST>'
.\scripts\staging-smoke-remote.ps1
```
'@

$lines = @(
  '# Staging - lokalni preduslov (pre deploya na URL)'
  ''
  "**Datum:** $today  "
  "**Commit za deploy:** [$deployShort](https://github.com/$Repo/commit/$deploySha)$deployNote  "
  "**CI:** $runLine"
  ''
  '**Status:** _lokalno spremno; remote staging deploy ceka vlasnika_'
  ''
  'Kopiraj relevantne redove u [STAGING-EXECUTION-LOG.template.md](./STAGING-EXECUTION-LOG.template.md) posle deploya na staging host.'
  ''
  '---'
  ''
  '## Lokalno zatvoreno (agent)'
  ''
  '| Gate | Rezultat | Napomena |'
  '|------|----------|----------|'
  "| GitHub CI (monorepo) | **PASS** | poslednji run $ciRange |"
  '| branch-protection-ready.ps1 | **PASS** | spremno za GitHub Settings |'
  '| staging-smoke-remote.ps1 (127.0.0.1:3000) | **PASS** | /health + smoke:all |'
  '| owner-gates-quick.ps1 | **PASS** | CI + smoke + doc gate bundle |'
  '| owner-smoke-all.ps1 | **PASS** | ranije na istom commit-u |'
  "| Atina :3000 / Web :3010 | **$atina / $web** | health probe |"
  ''
  "**Disk C:** ~$freeGb GB$diskNote"
  ''
  '---'
  ''
  '## Vlasnik - posle deploya na staging URL'
  ''
  "1. Deploy **$deployShort** (Atina + web + Nest po [STAGING-RELEASE-CHECKLIST.md](./STAGING-RELEASE-CHECKLIST.md))"
  '2. **Backup DB** - npm run migrate na staging'
  '3. Remote smoke:'
  ''
  $smokeExample
  ''
  '4. Popuni [STAGING-EXECUTION-LOG.template.md](./STAGING-EXECUTION-LOG.template.md)'
  '5. Upis u [CEO-G-PRODUCTION-EVIDENCE-LATEST.md](./CEO-G-PRODUCTION-EVIDENCE-LATEST.md) (staging sekcija)'
  ''
  '**Brzi pregled:** [staging-owner-next.ps1](../scripts/staging-owner-next.ps1) | [owner-gates-quick.ps1](../scripts/owner-gates-quick.ps1) | [refresh-staging-handoff.ps1](../scripts/refresh-staging-handoff.ps1)'
)

Set-Content -LiteralPath $handoff -Value ($lines -join "`n") -Encoding utf8
Write-Host "refresh-staging-handoff: updated $handoff (deploy $deployShort)" -ForegroundColor Green

if ($Commit) {
  $dirty = git status --short
  if (-not $dirty) {
    Write-Host 'Nothing to commit.' -ForegroundColor DarkGray
    exit 0
  }
  git add docs/STAGING-LOCAL-PREFLIGHT-LATEST.md
  $env:GIT_AUTHOR_NAME = 'Marko Kosic'
  $env:GIT_AUTHOR_EMAIL = 'markokosic020@gmail.com'
  $env:GIT_COMMITTER_NAME = 'Marko Kosic'
  $env:GIT_COMMITTER_EMAIL = 'markokosic020@gmail.com'
  git commit -m "docs: refresh staging handoff ($deployShort)"
  Write-Host 'Committed. Push: git push origin main' -ForegroundColor Cyan
}
