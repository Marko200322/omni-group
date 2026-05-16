<#
.SYNOPSIS
  Nest CLI `nest-cli.json` doslednost za Node pakete sa Nest framework dep-om (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 110: **9. sloj structural config audit-a** posle Jest (Talas 109); pokriva **Nest CLI / schematics build-time** sloj. Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa skenira podrazumevano **3 Node paketa** i za svaki koji deklariše **`@nestjs/core`** u `dependencies` ili **`@nestjs/cli`** u `devDependencies` validira **5 strukturalnih invarijanti**:

  1. **`nest-cli.json` postoji** (Required-WARN) — kanonski ulaz za `nest build` / `nest start` (schematics `collection`, `sourceRoot`, `compilerOptions`).
  2. **Fajl nije prazan** (Required-WARN) — mora biti validan JSON (ne samo whitespace).
  3. **`sourceRoot` ili `monorepo`/`projects`** (Optional-INFO) — ako nema eksplicitnog `sourceRoot` niti monorepo `projects` mape, prijavi INFO (Nest podrazumevano `src`, ali eksplicitno je bolje za odrzavanje).
  4. **`$schema` u nest-cli.json** (Optional-INFO) — ako nema json.schemastore.org polja, prijavi INFO (IDE validacija).
  5. **Cross-package `@nestjs/core` MAJOR** (Optional-INFO) — ako 2+ paketa imaju `@nestjs/core` sa različitim MAJOR semver-om.

  Paketi **bez** Nest dep-a se preskacu (Next-only, Node lib bez Nest-a — ocekivano).

  Read-only audit. **Nije** deo CI mirror-a (`verify-monorepo.ps1`).

.PARAMETER FailOnWarn
  Exit 1 ako ima WARN nalaza.

.PARAMETER MaxOutput
  Maksimalan broj detaljnih redova (default 200).

.PARAMETER NodePaths
  Relativne putanje Node paketa (default tri monorepo paketa).

.EXAMPLE
  .\scripts\check-nest-cli-config-consistency.ps1

.EXAMPLE
  .\scripts\check-nest-cli-config-consistency.ps1 -FailOnWarn

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 110 = ovaj skript; ukupno 39 koraka Talas 65-192).
  Pun verify (CI mirror): `scripts/verify-monorepo.ps1` (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — `docs/GIT-BRANCH-PROTECTION.md`).
  Smoke (HTTP) i bundled `npm run smoke:all`: `scripts/smoke-stack.ps1` + `atina-platform/atina/docs/operations/release-gate-checklist.md` (*Local notes — Smoke tests*).
#>
#Requires -Version 5.1

[CmdletBinding()]
param(
  [switch]$FailOnWarn,
  [int]$MaxOutput = 200,
  [string[]]$NodePaths = @(
    'apps/omnigroup-web',
    'atina-platform/atina',
    'atina-system'
  )
)

$ErrorActionPreference = 'Stop'

Write-Host "== check-nest-cli-config-consistency.ps1 - Nest CLI nest-cli.json (Talas 110) ==" -ForegroundColor Cyan
Write-Host "   FailOnWarn: $FailOnWarn"
Write-Host ""

function Get-JsonObjectField {
  param(
    [Parameter(Mandatory)] $Json,
    [Parameter(Mandatory)] [string]$Field
  )
  if (-not $Json) { return $null }
  if ($Json.PSObject.Properties[$Field]) { return $Json.$Field }
  return $null
}

function Test-HasNestFrameworkDep {
  param(
    [object]$Deps,
    [object]$DevDeps
  )
  if ($Deps -and $Deps.PSObject.Properties['@nestjs/core']) { return $true }
  if ($DevDeps -and $DevDeps.PSObject.Properties['@nestjs/cli']) { return $true }
  return $false
}

function Get-NestCoreVersion {
  param([object]$Deps)
  if (-not $Deps) { return $null }
  if ($Deps.PSObject.Properties['@nestjs/core']) { return "$($Deps.'@nestjs/core')" }
  return $null
}

function Get-NestMajor {
  param([string]$Ver)
  if ([string]::IsNullOrWhiteSpace($Ver)) { return $null }
  if ($Ver -match '^[\^~>=<]*\s*(\d+)') { return [int]$Matches[1] }
  return $null
}

function Find-NestCliPath {
  param([Parameter(Mandatory)] [string]$Root)
  foreach ($rel in @('nest-cli.json', 'nest.json')) {
    $full = Join-Path $Root $rel
    if (Test-Path $full -PathType Leaf) { return $full }
  }
  return $null
}

$findings = [System.Collections.Generic.List[pscustomobject]]::new()
$withNest = [System.Collections.Generic.List[pscustomobject]]::new()

foreach ($root in $NodePaths) {
  if (-not (Test-Path $root -PathType Container)) {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'WARN'; Code = 'MISSING-PKG-DIR'; Message = "Direktorijum ne postoji: $root"
    }) | Out-Null
    continue
  }

  $pkgPath = Join-Path $root 'package.json'
  if (-not (Test-Path $pkgPath -PathType Leaf)) { continue }

  try {
    $pkg = Get-Content $pkgPath -Raw -Encoding UTF8 | ConvertFrom-Json
  } catch {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'WARN'; Code = 'INVALID-PACKAGE-JSON'; Message = "package.json parsing fail: $_"
    }) | Out-Null
    continue
  }

  $deps = Get-JsonObjectField -Json $pkg -Field 'dependencies'
  $devDeps = Get-JsonObjectField -Json $pkg -Field 'devDependencies'
  if (-not (Test-HasNestFrameworkDep -Deps $deps -DevDeps $devDeps)) { continue }

  $coreVer = Get-NestCoreVersion -Deps $deps
  $row = [pscustomobject]@{
    Root        = $root
    CoreVersion = $coreVer
    Major       = Get-NestMajor -Ver $coreVer
    CliFile     = '-'
  }

  $cliPath = Find-NestCliPath -Root $root
  if (-not $cliPath) {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'WARN'; Code = 'NO-NEST-CLI-JSON';
      Message = 'Nest dep (@nestjs/core ili @nestjs/cli) ali nema nest-cli.json ni nest.json u korenu paketa'
    }) | Out-Null
    continue
  }

  $row.CliFile = Split-Path $cliPath -Leaf
  $withNest.Add($row) | Out-Null

  try {
    $raw = Get-Content $cliPath -Raw -Encoding UTF8
    if ([string]::IsNullOrWhiteSpace($raw)) {
      $findings.Add([pscustomobject]@{
        Root = $root; Severity = 'WARN'; Code = 'EMPTY-NEST-CLI'; Message = "$($row.CliFile) je prazan"
      }) | Out-Null
      continue
    }
    $nestCli = $raw | ConvertFrom-Json
  } catch {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'WARN'; Code = 'INVALID-NEST-CLI-JSON'; Message = "$($row.CliFile) nije validan JSON: $_"
    }) | Out-Null
    continue
  }

  $hasSourceRoot = $nestCli.PSObject.Properties['sourceRoot'] -and -not [string]::IsNullOrWhiteSpace("$($nestCli.sourceRoot)")
  $hasProjects = $nestCli.PSObject.Properties['projects'] -and ($nestCli.projects -is [System.Management.Automation.PSCustomObject]) -and (@($nestCli.projects.PSObject.Properties).Count -gt 0)
  if (-not $hasSourceRoot -and -not $hasProjects) {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'INFO'; Code = 'NO-SOURCEROOT-OR-PROJECTS';
      Message = 'nest-cli.json nema sourceRoot ni projects mapu - cesto OK (Nest default src), ali eksplicitno je preglednije'
    }) | Out-Null
  }

  if (-not ($nestCli.PSObject.Properties['$schema'])) {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'INFO'; Code = 'NO-NEST-CLI-SCHEMA';
      Message = 'nest-cli.json nema json.schemastore.org $schema polje (IDE validacija)'
    }) | Out-Null
  }
}

$coreRows = @($withNest | Where-Object { $_.CoreVersion })
if ($coreRows.Count -ge 2) {
  $majors = @($coreRows | ForEach-Object { $_.Major } | Where-Object { $_ -ne $null } | Select-Object -Unique)
  if ($majors.Count -gt 1) {
    $pairs = @($coreRows | ForEach-Object { "$($_.Root)=@nestjs/core $($_.CoreVersion)" })
    $findings.Add([pscustomobject]@{
      Root = '(cross-package)'; Severity = 'INFO'; Code = 'NEST-CORE-MAJOR-DRIFT';
      Message = "Razlicit MAJOR @nestjs/core preko paketa: $($pairs -join ', ')"
    }) | Out-Null
  }
}

Write-Host "== Paketi sa Nest dep (core ili CLI) ==" -ForegroundColor Yellow
if ($withNest.Count -eq 0) {
  Write-Host "  (nijedan od skeniranih paketa nema @nestjs/core u dependencies ni @nestjs/cli u devDependencies)" -ForegroundColor DarkGray
} else {
  $withNest | ForEach-Object {
    [pscustomobject]@{
      Root   = $_.Root
      Core   = if ($_.CoreVersion) { $_.CoreVersion } else { '-' }
      CliCfg = $_.CliFile
    }
  } | Format-Table -AutoSize | Out-String | Write-Host
}

$warnFindings = @($findings | Where-Object { $_.Severity -eq 'WARN' })
$infoFindings = @($findings | Where-Object { $_.Severity -eq 'INFO' })

Write-Host ""
Write-Host "== Findings ==" -ForegroundColor Yellow
Write-Host ("  WARN (Nest-rizik):         {0}" -f $warnFindings.Count)
Write-Host ("  INFO (best practice):     {0}" -f $infoFindings.Count)
Write-Host ""

if ($findings.Count -gt 0) {
  Write-Host "== Detalji ==" -ForegroundColor Yellow
  $shown = 0
  foreach ($f in $findings) {
    if ($shown -ge $MaxOutput) {
      Write-Host "  ... (preseceno na $MaxOutput, koristite -MaxOutput za vise)"
      break
    }
    $color = if ($f.Severity -eq 'WARN') { 'Red' } else { 'DarkGray' }
    Write-Host ("  [{0,-4}] {1,-35} {2}: {3}" -f $f.Severity, $f.Code, $f.Root, $f.Message) -ForegroundColor $color
    $shown++
  }
}

Write-Host ""
Write-Host "Napomene:" -ForegroundColor DarkGray
Write-Host "  - Talas 110: 9. sloj structural config (Nest CLI / nest build ulaz)." -ForegroundColor DarkGray
Write-Host '  - Dopuna Talas 94 (scripts:) i Talas 108 (Next) - backend Nest workspace konfiguracija.' -ForegroundColor DarkGray
Write-Host '  - run-all-audits.ps1: 39 koraka (37 read-only + TODO + npm); single entry point.' -ForegroundColor DarkGray

if ($FailOnWarn -and $warnFindings.Count -gt 0) {
  Write-Host ""
  Write-Host "FAIL: $($warnFindings.Count) WARN (FailOnWarn)" -ForegroundColor Red
  exit 1
}
exit 0
