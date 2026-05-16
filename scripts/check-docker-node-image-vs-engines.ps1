<#
.SYNOPSIS
  `FROM node:` major u Dockerfile-u vs `package.json#engines.node` (informativan, opciono `-FailOnWarn`). Talas 114: **komplement Talas 79** (`engines.node`) + **Talas 99** (Node Dockerfile) — hvata produkcioni rizik da image koristi drugačiji Node major od deklaracije u paketu.

.DESCRIPTION
  Za svaku **Node** lokaciju u default listi (isti logički skup kao [`check-docker-files-presence.ps1`](./check-docker-files-presence.ps1) — `apps/omnigroup-web`, `atina-platform/atina`, `atina-system`):

  - Ako **nema** `Dockerfile` na disku — lokacija se **preskače** (nema šta uporediti; omnigroup-web baseline nema image build).
  - Ako `Dockerfile` postoji, ekstraktuju se svi **`FROM node:NN`** tagovi sa **numeričkim** major-om (NN = cifre).
  - Čita se `package.json` u istom korenu lokacije; iz `engines.node` se grubo izvlači **očekivani major** (`>=20 <21` → **20**, `20.x` → **20`, vodeći broj kao fallback).
  - **WARN** ako je očekivani major poznat i postoji bar jedan `FROM node:` sa **drugačijim** numeričkim major-om.
  - **INFO** ako `engines.node` nedostaje — preskočena cross-provera (Talas 79 već signalizira); ako postoji `FROM node:` ali **bez** numeričkog taga (`lts`, `iron`, itd.) — informativno (nije mogao major match).

  Namerno **ne** duplira Talas 79 WARN za missing `engines` — ovde je samo INFO + preskok upoređivanja.

  Read-only. **Nije** deo CI mirror-a (`verify-monorepo.ps1`). Hub: [`scripts/README.md`](./README.md).

.PARAMETER FailOnWarn
  Exit 1 ako bilo koji invariant prijavi WARN.

.PARAMETER MaxOutput
  Maksimalan broj WARN detaljnih redova (default 200).

.PARAMETER NodeDockerLocations
  Hashtabele sa `Path` (relativno od repo root) i `Label` (prikaz ime).

.EXAMPLE
  .\scripts\check-docker-node-image-vs-engines.ps1

.NOTES
  Konsolidovani audit suite: vidi [`run-all-audits.ps1`](./run-all-audits.ps1) (Talas 114 = ovaj skript; ukupno 39 koraka Talas 65-192).
  Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md).
  Smoke (HTTP) + Atina bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes — Smoke tests).
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
  [hashtable[]]$NodeDockerLocations = @(
    @{ Path = 'apps/omnigroup-web';   Label = 'apps/omnigroup-web' }
    @{ Path = 'atina-platform/atina'; Label = 'atina-platform/atina' }
    @{ Path = 'atina-system';         Label = 'atina-system' }
  )
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

Write-Host '== check-docker-node-image-vs-engines.ps1 - Dockerfile node major vs engines.node (Talas 114) ==' -ForegroundColor Cyan
Write-Host ("   FailOnWarn: {0}" -f $FailOnWarn) -ForegroundColor DarkGray
Write-Host ''

function Get-EnginesNodeMajorRough {
  param([string]$Spec)
  if ([string]::IsNullOrWhiteSpace($Spec)) { return $null }
  $t = $Spec.Trim()
  if ($t -match '>=\s*(\d+)') { return [int]$Matches[1] }
  if ($t -match '^\s*(\d+)') { return [int]$Matches[1] }
  if ($t -match '(?i)(\d+)\.x') { return [int]$Matches[1] }
  return $null
}

function Get-FromNodeNumericMajors {
  param([string]$DockerfileAbs)
  $majors = [System.Collections.Generic.HashSet[int]]::new()
  if (-not (Test-Path -LiteralPath $DockerfileAbs)) { return $majors }
  $lines = @(Get-Content -LiteralPath $DockerfileAbs -Encoding UTF8 -ErrorAction SilentlyContinue)
  foreach ($line in $lines) {
    $trim = $line.Trim()
    if ($trim -eq '' -or $trim.StartsWith('#')) { continue }
    if ($trim -match '(?i)^FROM\s+node:(\d+)') {
      [void]$majors.Add([int]$Matches[1])
    }
  }
  return $majors
}

function Test-FromNodeWithoutNumericMajor {
  param([string]$DockerfileAbs)
  $hits = $false
  if (-not (Test-Path -LiteralPath $DockerfileAbs)) { return $false }
  $lines = @(Get-Content -LiteralPath $DockerfileAbs -Encoding UTF8 -ErrorAction SilentlyContinue)
  foreach ($line in $lines) {
    $trim = $line.Trim()
    if ($trim -eq '' -or $trim.StartsWith('#')) { continue }
    if ($trim -match '(?i)^FROM\s+node:') {
      if ($trim -match '(?i)^FROM\s+node:(\d+)') { continue }
      $hits = $true
      break
    }
  }
  return $hits
}

$findingsWarn = New-Object System.Collections.Generic.List[object]
$infoNoEngines = 0
$infoNonNumericTag = 0
$skippedNoDockerfile = 0

foreach ($loc in $NodeDockerLocations) {
  $rel = [string]$loc.Path
  $label = [string]$loc.Label
  $dirAbs = Join-Path $repoRoot $rel
  $dockerAbs = Join-Path $dirAbs 'Dockerfile'
  $pkgAbs = Join-Path $dirAbs 'package.json'

  if (-not (Test-Path $dockerAbs -PathType Leaf)) {
    $skippedNoDockerfile++
    continue
  }

  $enginesSpec = $null
  if (Test-Path -LiteralPath $pkgAbs) {
    try {
      $j = Get-Content -LiteralPath $pkgAbs -Raw -Encoding UTF8 | ConvertFrom-Json
      if ($j.engines -and $j.engines.node) {
        $enginesSpec = [string]$j.engines.node
      }
    } catch { $enginesSpec = $null }
  }

  $engineMajor = Get-EnginesNodeMajorRough -Spec $enginesSpec

  $dockerMajors = @(Get-FromNodeNumericMajors -DockerfileAbs $dockerAbs)

  if (Test-FromNodeWithoutNumericMajor -DockerfileAbs $dockerAbs) {
    $infoNonNumericTag++
  }

  if ($null -eq $engineMajor) {
    $infoNoEngines++
    continue
  }

  foreach ($m in $dockerMajors) {
    if ($m -ne $engineMajor) {
      $findingsWarn.Add([pscustomobject]@{
        Location = $label
        Expected = $engineMajor
        DockerfileMajor = $m
        EnginesLine = ($enginesSpec)
      }) | Out-Null
    }
  }
}

$warnCount = $findingsWarn.Count
$infoCount = $infoNoEngines + $infoNonNumericTag + $skippedNoDockerfile

Write-Host '== Rezime ==' -ForegroundColor Yellow
Write-Host ("  WARN (Docker-engines-rizik): {0}" -f $warnCount)
Write-Host ("  INFO (best practice / preskok): {0}" -f $infoCount)
Write-Host ''

if ($findingsWarn.Count -gt 0) {
  Write-Host '== Detalji — Dockerfile node major != engines.node ==' -ForegroundColor Yellow
  $shown = 0
  foreach ($f in $findingsWarn) {
    if ($shown -ge $MaxOutput) {
      Write-Host "  ... (preseceno na $MaxOutput)"
      break
    }
    Write-Host ("  [WARN] {0}: FROM node:{1} vs engines.node (ocekivano major {2}; engines='{3}')" -f $f.Location, $f.DockerfileMajor, $f.Expected, $f.EnginesLine) -ForegroundColor Red
    $shown++
  }
}

Write-Host ''
Write-Host 'Napomene:' -ForegroundColor DarkGray
Write-Host '  - Talas 114: komplement Talas 79 (engines) + Talas 99 (Dockerfile).' -ForegroundColor DarkGray
Write-Host '  - Numericki node: tag je jedini pouzdan auto-signal; lts/iron tagovi daju INFO (provera major-a rucno).' -ForegroundColor DarkGray
Write-Host '  - run-all-audits.ps1: 39 koraka (37 read-only + TODO + npm); Talas 114 read-only korak.' -ForegroundColor DarkGray

if ($FailOnWarn -and $warnCount -gt 0) {
  Write-Host ''
  Write-Host ("FAIL: {0} WARN (FailOnWarn)" -f $warnCount) -ForegroundColor Red
  exit 1
}
exit 0
