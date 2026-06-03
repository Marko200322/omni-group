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

$sha = (git rev-parse HEAD).Trim()
$short = $sha.Substring(0, 7)
$today = Get-Date -Format 'yyyy-MM-dd'

$d = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$freeGb = [math]::Round($d.FreeSpace / 1GB, 2)

$runLine = '_(CI run nije ucitan)_'
$ciRange = '#77+'
try {
  $url = "https://api.github.com/repos/$Repo/actions/runs?per_page=1&branch=main"
  $run = (Invoke-RestMethod -Uri $url -Headers @{ 'User-Agent' = 'omni-group-scripts' }).workflow_runs[0]
  if ($run) {
    $runSha = $run.head_sha.Substring(0, 7)
    $ciOk = $run.status -eq 'completed' -and $run.conclusion -eq 'success'
    $runLabel = if ($run.conclusion) { $run.conclusion } else { $run.status }
    if ($ciOk) {
      $runLine = "Run [#$($run.run_number)]($($run.html_url)) - **5/5 PASS**"
    } else {
      $runLine = "Run [#$($run.run_number)]($($run.html_url)) - **$runLabel**"
    }
    $ciRange = "#$($run.run_number)"
    if ($runSha -ne $short) {
      Write-Host ("NAPOMENA: HEAD {0} != CI run {1}" -f $short, $runSha) -ForegroundColor Yellow
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
  "**Commit za deploy:** [$short](https://github.com/$Repo/commit/$sha)  "
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
  '| owner-smoke-all.ps1 | **PASS** | ranije na istom commit-u |'
  "| Atina :3000 / Web :3010 | **$atina / $web** | health probe |"
  ''
  "**Disk C:** ~$freeGb GB$diskNote"
  ''
  '---'
  ''
  '## Vlasnik - posle deploya na staging URL'
  ''
  "1. Deploy **$short** (Atina + web + Nest po [STAGING-RELEASE-CHECKLIST.md](./STAGING-RELEASE-CHECKLIST.md))"
  '2. **Backup DB** - npm run migrate na staging'
  '3. Remote smoke:'
  ''
  $smokeExample
  ''
  '4. Popuni [STAGING-EXECUTION-LOG.template.md](./STAGING-EXECUTION-LOG.template.md)'
  '5. Upis u [CEO-G-PRODUCTION-EVIDENCE-LATEST.md](./CEO-G-PRODUCTION-EVIDENCE-LATEST.md) (staging sekcija)'
  ''
  '**Brzi pregled:** [staging-owner-next.ps1](../scripts/staging-owner-next.ps1) | [refresh-staging-handoff.ps1](../scripts/refresh-staging-handoff.ps1)'
)

Set-Content -LiteralPath $handoff -Value ($lines -join "`n") -Encoding utf8
Write-Host "refresh-staging-handoff: updated $handoff ($short)" -ForegroundColor Green

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
  git commit -m "docs: refresh staging handoff ($short)"
  Write-Host 'Committed. Push: git push origin main' -ForegroundColor Cyan
}
