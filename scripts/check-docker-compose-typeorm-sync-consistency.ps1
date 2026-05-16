<#
.SYNOPSIS
  `TYPEORM_SYNC` u `docker-compose*.yml` fajlovima (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 113: **proširenje Talas 100 orchestration + Talas 111 TypeORM** — hvata **compose-level** `synchronize` ekvivalent preko env var-a. Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa skenira **iste 8 docker-compose YAML fajlova** kao [`check-docker-compose-consistency.ps1`](./check-docker-compose-consistency.ps1) (default lista) i za svaku liniju koja izgleda kao `TYPEORM_SYNC: ...` proverava **1 strukturalni invariant**:

  1. **`TYPEORM_SYNC` ne sme biti truthy u compose fajlu** (Required-WARN) — vrednosti `true`, `"true"`, `'true'`, YAML boolean `true` znače da TypeORM može automatski menjati šemu pri startu (prod rizik; komplement [`check-typeorm-data-source-consistency.ps1`](./check-typeorm-data-source-consistency.ps1) koji hvata `synchronize: true` u `data-source.ts`). Linije sa `${VAR:-true}` (default true u shell-expand obrascu) takođe WARN — podrazumevani sync na compose `up` je opasan ako se zaboravi override.

  **Namerno uži opseg** od punog „compose env audit-a“: samo ključ koji je već dokumentovan u `docker-compose.atina.yml` komentarima (Nivo 1 / migracije). Ostali env ključevi ostaju za buduće talase.

  Read-only. Regex / linijski sken (PS5.1 nema native YAML parser). **Nije** deo CI mirror-a (`verify-monorepo.ps1`; pun mirror uključuje `apps/omnigroup-web` osim sa `-SkipOmnigroupWeb`).

.PARAMETER FailOnWarn
  Exit 1 ako ima WARN nalaza.

.PARAMETER MaxOutput
  Maksimalan broj detaljnih redova (default 200).

.PARAMETER ComposeFiles
  Relativne putanje compose fajlova (default 8 kao Talas 100).

.EXAMPLE
  .\scripts\check-docker-compose-typeorm-sync-consistency.ps1

.EXAMPLE
  .\scripts\check-docker-compose-typeorm-sync-consistency.ps1 -FailOnWarn

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 113 = ovaj skript; ukupno 39 koraka Talas 65-192).
  Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md; pun mirror uključuje apps/omnigroup-web build osim sa -SkipOmnigroupWeb).
  Smoke (HTTP) + Atina bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (*Local notes — Smoke tests*).
  LATEST verify: docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md (Val 355); smoke: docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md (Val 351).
  Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md.
  Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md + docs/NIVO-1-DRYRUN-LOG.md.
  Help snapshot za sve scripts/*.ps1: docs/SCRIPTS-HELP-SNAPSHOT.md (regen: scripts/regenerate-help-snapshot.ps1).
  Operativni handbook (Talas 65->192 lessons): scripts/AGENT-AUTOMATION-GUIDE.md.
  PowerShell 5.1+.
#>
#Requires -Version 5.1

[CmdletBinding()]
param(
  [switch]$FailOnWarn,
  [int]$MaxOutput = 200,
  [string[]]$ComposeFiles = @(
    'docker-compose.yml',
    'docker-compose.atina.yml',
    'docker-compose.nest-port-3001.yml',
    'docker-compose.override.yml',
    'docker-compose.override.vault-bindmount.example.yml',
    'atina-platform/atina/docker-compose.yml',
    'atina-platform/atina/docker-compose.override.yml',
    'atina-platform/atina/docker-compose.override.forge-vault-bindmount.example.yml'
  )
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

Write-Host '== check-docker-compose-typeorm-sync-consistency.ps1 - TYPEORM_SYNC u compose (Talas 113) ==' -ForegroundColor Cyan
Write-Host ("   FailOnWarn: {0}" -f $FailOnWarn) -ForegroundColor DarkGray
Write-Host ''

$findings = [System.Collections.Generic.List[pscustomobject]]::new()

function Test-TypeormSyncLineRisky {
  param([string]$Line)
  if ([string]::IsNullOrWhiteSpace($Line)) { return $false }
  $t = $Line.Trim()
  if ($t -match '^\s*#') { return $false }
  if ($t -notmatch '(?i)TYPEORM_SYNC\s*:') { return $false }
  # literal true / quoted true
  if ($t -match '(?i)TYPEORM_SYNC\s*:\s*["'']?true["'']?\s*(#|$)') { return $true }
  if ($t -match '(?i)TYPEORM_SYNC\s*:\s*true\s*(#|$)') { return $true }
  # ${VAR:-true} style default-true
  if ($t -match '(?i)TYPEORM_SYNC\s*:\s*\$\{[^}]*:-\s*true\s*\}') { return $true }
  return $false
}

foreach ($rel in $ComposeFiles) {
  $abs = Join-Path $repoRoot $rel
  if (-not (Test-Path $abs -PathType Leaf)) { continue }
  $lines = @(Get-Content -LiteralPath $abs -Encoding UTF8 -ErrorAction SilentlyContinue)
  $i = 0
  foreach ($line in $lines) {
    $i++
    if (Test-TypeormSyncLineRisky -Line $line) {
      $findings.Add([pscustomobject]@{
        File    = $rel
        LineNum = $i
        Line    = $line.Trim()
      }) | Out-Null
    }
  }
}

$warnCount = $findings.Count

Write-Host '== Rezime ==' -ForegroundColor Yellow
Write-Host ("  Compose fajlova u listi:     {0}" -f $ComposeFiles.Count)
Write-Host ("  WARN (Compose-TypeORM-rizik): {0}" -f $warnCount)
Write-Host ("  INFO (best practice):         0" )
Write-Host ''

if ($findings.Count -gt 0) {
  Write-Host '== Detalji (TYPEORM_SYNC truthy ili default-true) ==' -ForegroundColor Yellow
  $shown = 0
  foreach ($f in $findings) {
    if ($shown -ge $MaxOutput) {
      Write-Host "  ... (preseceno na $MaxOutput)"
      break
    }
    Write-Host ("  [WARN] {0}:{1}: {2}" -f $f.File, $f.LineNum, $f.Line) -ForegroundColor Red
    $shown++
  }
}

Write-Host ''
Write-Host 'Napomene:' -ForegroundColor DarkGray
Write-Host '  - Talas 113: komplement Talas 100 (compose struktura) + Talas 111 (DataSource synchronize).' -ForegroundColor DarkGray
Write-Host '  - docker-compose.atina.yml komentar: prod = TYPEORM_SYNC=false + migracije.' -ForegroundColor DarkGray
Write-Host '  - run-all-audits.ps1: 39 koraka (37 read-only + TODO + npm); single entry point.' -ForegroundColor DarkGray

if ($FailOnWarn -and $warnCount -gt 0) {
  Write-Host ''
  Write-Host "FAIL: $warnCount WARN (FailOnWarn)" -ForegroundColor Red
  exit 1
}
exit 0
