<#
.SYNOPSIS
  Jest konfiguracija za Node pakete sa `jest` dep-om (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 109: **8. sloj structural config audit-a** posle Next (Talas 108); pokriva **Jest / Node unit-test config** sloj. Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa skenira podrazumevano **3 Node paketa** i za svaki koji deklariše `jest` u `dependencies` ili `devDependencies` validira **5 strukturalnih invarijanti**:

  1. **Konfiguracioni sloj postoji** (Required-WARN) — mora postojati `jest.config.js|mjs|cjs|ts` **ili** smislen `package.json` top-level `jest` objekat (bar jedno polje kao `testRegex`, `roots`, `preset`, `testMatch`, `projects`, `moduleFileExtensions`, `transform`, itd.).
  2. **jest.config fajl nije prazan** (Required-WARN) — ako postoji `jest.config.*`, sadrzaj ne sme biti prazan whitespace.
  3. **jest u runtime dependencies** (Optional-INFO) — ako je `jest` u `dependencies` umesto `devDependencies`.
  4. **Dvostruki izvor konfiguracije** (Optional-INFO) — istovremeno `jest.config.*` i top-level `package.json#jest` (Jest spaja, ali moze zbuniti odrzavanje).
  5. **Cross-package jest dep verzija** (Optional-INFO) — ako 2+ paketa imaju `jest` dep i semver stringovi se razlikuju (MAJOR ili samo MINOR/PATCH drift informativno).

  Paketi **bez** `jest` dep-a se preskacu (npr. Next-only paket bez Jest-a — ocekivano).

  Read-only audit. **Nije** deo CI mirror-a (`verify-monorepo.ps1`).

.PARAMETER FailOnWarn
  Exit 1 ako ima WARN nalaza.

.PARAMETER MaxOutput
  Maksimalan broj detaljnih redova (default 200).

.PARAMETER NodePaths
  Relativne putanje Node paketa (default tri monorepo paketa).

.EXAMPLE
  .\scripts\check-jest-config-consistency.ps1

.EXAMPLE
  .\scripts\check-jest-config-consistency.ps1 -FailOnWarn

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 109 = ovaj skript; ukupno 39 koraka Talas 65-192).
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

Write-Host "== check-jest-config-consistency.ps1 - Jest konfiguracija (Talas 109) ==" -ForegroundColor Cyan
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

function Get-JestVersionFromDeps {
  param([object]$Deps)
  if (-not $Deps) { return $null }
  if ($Deps.PSObject.Properties['jest']) { return "$($Deps.jest)" }
  return $null
}

function Test-HasJestDep {
  param(
    [object]$Deps,
    [object]$DevDeps
  )
  if ($Deps -and $Deps.PSObject.Properties['jest']) { return $true }
  if ($DevDeps -and $DevDeps.PSObject.Properties['jest']) { return $true }
  return $false
}

function Test-InlineJestConfigMeaningful {
  param($JestBlock)
  if (-not $JestBlock) { return $false }
  if ($JestBlock -isnot [System.Management.Automation.PSCustomObject]) { return $false }
  $props = @($JestBlock.PSObject.Properties)
  if ($props.Count -lt 1) { return $false }
  return $true
}

function Find-JestConfigPath {
  param([Parameter(Mandatory)] [string]$Root)
  foreach ($rel in @('jest.config.ts', 'jest.config.js', 'jest.config.mjs', 'jest.config.cjs')) {
    $full = Join-Path $Root $rel
    if (Test-Path $full -PathType Leaf) { return $full }
  }
  return $null
}

function Get-JestMajor {
  param([string]$Ver)
  if ([string]::IsNullOrWhiteSpace($Ver)) { return $null }
  if ($Ver -match '^[\^~>=<]*\s*(\d+)') { return [int]$Matches[1] }
  return $null
}

$findings = [System.Collections.Generic.List[pscustomobject]]::new()
$withJest = [System.Collections.Generic.List[pscustomobject]]::new()

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
  if (-not (Test-HasJestDep -Deps $deps -DevDeps $devDeps)) { continue }

  $jestBlock = $null
  if ($pkg.PSObject.Properties['jest']) { $jestBlock = $pkg.jest }

  $jestCfg = Find-JestConfigPath -Root $root
  $inlineOk = Test-InlineJestConfigMeaningful -JestBlock $jestBlock
  $hasLayer = ($null -ne $jestCfg) -or $inlineOk

  $verFromDeps = Get-JestVersionFromDeps -Deps $deps
  $verFromDev = Get-JestVersionFromDeps -Deps $devDeps
  $verStr = if ($verFromDeps) { $verFromDeps } elseif ($verFromDev) { $verFromDev } else { $null }

  $inDeps = [bool]$verFromDeps
  $inDev = [bool]$verFromDev

  $row = [pscustomobject]@{
    Root           = $root
    JestVersion    = $verStr
    Major          = Get-JestMajor -Ver $verStr
    JestConfigFile = if ($jestCfg) { Split-Path $jestCfg -Leaf } else { '-' }
    InlineJest     = $inlineOk
    InDependencies = $inDeps
    InDevOnly      = ($inDev -and -not $inDeps)
  }
  $withJest.Add($row) | Out-Null

  if (-not $hasLayer) {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'WARN'; Code = 'NO-JEST-CONFIG-LAYER';
      Message = "jest dep postoji ali nema jest.config.* niti smislenog package.json top-level jest bloka"
    }) | Out-Null
    continue
  }

  if ($jestCfg) {
    $raw = Get-Content $jestCfg -Raw -Encoding UTF8
    if ([string]::IsNullOrWhiteSpace($raw)) {
      $findings.Add([pscustomobject]@{
        Root = $root; Severity = 'WARN'; Code = 'EMPTY-JEST-CONFIG'; Message = "$($row.JestConfigFile) je prazan"
      }) | Out-Null
    }
  }

  if ($jestCfg -and $inlineOk) {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'INFO'; Code = 'JEST-DUAL-CONFIG-SOURCES';
      Message = "Postoji jest.config.* i package.json#jest - Jest spaja, ali razmotri jedan izvor radi preglednosti"
    }) | Out-Null
  }

  if ($inDeps -and -not $inDev) {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'INFO'; Code = 'JEST-IN-RUNTIME-DEPS';
      Message = "jest je u dependencies - tipicno dev alat; razmotri devDependencies"
    }) | Out-Null
  }
}

$verRows = @($withJest | Where-Object { $_.JestVersion })
if ($verRows.Count -ge 2) {
  $pairs = @($verRows | ForEach-Object { "$($_.Root)=$($_.JestVersion)" })
  $uniqVer = @($verRows | ForEach-Object { $_.JestVersion } | Select-Object -Unique)
  if ($uniqVer.Count -gt 1) {
    $detail = $pairs -join ', '
    $findings.Add([pscustomobject]@{
      Root = '(cross-package)'; Severity = 'INFO'; Code = 'JEST-DEP-VERSION-DRIFT';
      Message = "jest semver string razlika preko paketa: $detail"
    }) | Out-Null
  }
}

Write-Host "== Paketi sa jest dep ==" -ForegroundColor Yellow
if ($withJest.Count -eq 0) {
  Write-Host "  (nijedan od skeniranih paketa nema jest dep)" -ForegroundColor DarkGray
} else {
  $withJest | ForEach-Object {
    [pscustomobject]@{
      Root   = $_.Root
      Ver    = $_.JestVersion
      Config = $_.JestConfigFile
      Inline = $_.InlineJest
    }
  } | Format-Table -AutoSize | Out-String | Write-Host
}

$warnFindings = @($findings | Where-Object { $_.Severity -eq 'WARN' })
$infoFindings = @($findings | Where-Object { $_.Severity -eq 'INFO' })

Write-Host ""
Write-Host "== Findings ==" -ForegroundColor Yellow
Write-Host ("  WARN (Jest-rizik):         {0}" -f $warnFindings.Count)
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
Write-Host "  - Talas 109: 8. sloj structural config (Jest unit-test entry)." -ForegroundColor DarkGray
Write-Host "  - Dopuna Talas 94 (test script) i Talas 103 (Python pytest) - JS/TS test runner sloj." -ForegroundColor DarkGray
Write-Host '  - run-all-audits.ps1: 39 koraka (37 read-only + TODO + npm); single entry point.' -ForegroundColor DarkGray

if ($FailOnWarn -and $warnFindings.Count -gt 0) {
  Write-Host ""
  Write-Host "FAIL: $($warnFindings.Count) WARN (FailOnWarn)" -ForegroundColor Red
  exit 1
}
exit 0
