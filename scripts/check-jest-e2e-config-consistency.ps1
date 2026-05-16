<#
.SYNOPSIS
  Jest E2E / integration-test konfiguracija za Node pakete sa `test:e2e` script-om (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 112: **11. sloj structural config audit-a** posle TypeORM (Talas 111); pokriva **Jest E2E bootstrap** sloj na `verify:ci` putanji. Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa skenira podrazumevano **3 Node paketa** i za svaki koji deklariše **`test:e2e`** u `package.json` polju `scripts` validira **6 strukturalnih invarijanti**:

  1. **E2E Jest config fajl postoji** (Required-WARN) — putanja iz `jest --config ...` u `test:e2e` mora postojati na disku.
  2. **Config fajl nije prazan** (Required-WARN) — mora imati ne-whitespace sadrzaj.
  3. **Validan JSON config** (Required-WARN) — `jest-e2e.json` / `*.json` mora parsirati kao JSON.
  4. **`testEnvironment: node`** (Required-WARN) — backend/Nest E2E ocekuju Node okruzenje, ne jsdom.
  5. **Bar jedan E2E spec fajl** (Optional-INFO) — ako `testRegex` / `testMatch` ne match-uje nijedan `*.e2e-spec.ts` u paketu.
  6. **`supertest` u devDependencies** (Optional-INFO) — Nest/Express E2E tipicno koriste supertest; INFO ako nedostaje.

  Paketi **bez** `test:e2e` script-a se preskacu (Next-only, Node lib bez E2E — ocekivano).

  **Dopuna Talas 109** koji pokriva samo unit Jest (`jest.config.*` / `package.json` polje `jest`), ne i odvojeni E2E config na putanji `verify:ci` u `atina-system`.

  Read-only audit. **Nije** deo CI mirror-a (`verify-monorepo.ps1`).

.PARAMETER FailOnWarn
  Exit 1 ako ima WARN nalaza.

.PARAMETER MaxOutput
  Maksimalan broj detaljnih redova (default 200).

.PARAMETER NodePaths
  Relativne putanje Node paketa (default tri monorepo paketa).

.EXAMPLE
  .\scripts\check-jest-e2e-config-consistency.ps1

.EXAMPLE
  .\scripts\check-jest-e2e-config-consistency.ps1 -FailOnWarn

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 112 = ovaj skript; ukupno 39 koraka Talas 65-192).
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

Write-Host "== check-jest-e2e-config-consistency.ps1 - Jest E2E konfiguracija (Talas 112) ==" -ForegroundColor Cyan
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

function Get-ScriptValue {
  param([object]$Scripts, [string]$Name)
  if (-not $Scripts) { return $null }
  if ($Scripts.PSObject.Properties[$Name]) { return "$($Scripts.$Name)" }
  return $null
}

function Get-E2eConfigPathFromScript {
  param([string]$ScriptLine)
  if ([string]::IsNullOrWhiteSpace($ScriptLine)) { return $null }
  if ($ScriptLine -match '(?i)--config\s+([^\s]+)') {
    return $Matches[1].Trim('"', "'")
  }
  return $null
}

function Resolve-PackageRelativePath {
  param(
    [string]$Root,
    [string]$Rel
  )
  if ([string]::IsNullOrWhiteSpace($Rel)) { return $null }
  $norm = $Rel -replace '/', [IO.Path]::DirectorySeparatorChar
  if ([IO.Path]::IsPathRooted($norm)) { return $norm }
  return Join-Path $Root $norm
}

function Test-HasSupertestDep {
  param([object]$DevDeps)
  if (-not $DevDeps) { return $false }
  return [bool]$DevDeps.PSObject.Properties['supertest']
}

function Find-E2eSpecFiles {
  param([string]$Root)
  if (-not (Test-Path $Root -PathType Container)) { return @() }
  return @(Get-ChildItem -LiteralPath $Root -Recurse -File -Filter '*.e2e-spec.ts' -ErrorAction SilentlyContinue)
}

function Test-MatchesJestPattern {
  param(
    [string]$Pattern,
    [string[]]$FileNames
  )
  if ([string]::IsNullOrWhiteSpace($Pattern)) { return $false }
  foreach ($name in $FileNames) {
    if ($name -match $Pattern) { return $true }
  }
  return $false
}

$findings = [System.Collections.Generic.List[pscustomobject]]::new()
$withE2e = [System.Collections.Generic.List[pscustomobject]]::new()

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

  $scripts = Get-JsonObjectField -Json $pkg -Field 'scripts'
  $e2eScript = Get-ScriptValue -Scripts $scripts -Name 'test:e2e'
  if ([string]::IsNullOrWhiteSpace($e2eScript)) { continue }

  $verifyCi = Get-ScriptValue -Scripts $scripts -Name 'verify:ci'
  $configRel = Get-E2eConfigPathFromScript -ScriptLine $e2eScript
  $configFull = Resolve-PackageRelativePath -Root $root -Rel $configRel
  $devDeps = Get-JsonObjectField -Json $pkg -Field 'devDependencies'
  $e2eSpecs = Find-E2eSpecFiles -Root $root
  $specNames = @($e2eSpecs | ForEach-Object { $_.Name })

  $row = [pscustomobject]@{
    Root         = $root
    E2eScript    = $e2eScript
    ConfigRel    = if ($configRel) { $configRel } else { '-' }
    VerifyCi     = if ($verifyCi -match 'test:e2e') { 'yes' } else { 'no' }
    E2eSpecCount = $e2eSpecs.Count
  }
  $withE2e.Add($row) | Out-Null

  if (-not $configRel) {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'WARN'; Code = 'NO-E2E-CONFIG-PATH';
      Message = "test:e2e ne sadrzi jest --config putanju: $e2eScript"
    }) | Out-Null
    continue
  }

  if (-not $configFull -or -not (Test-Path $configFull -PathType Leaf)) {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'WARN'; Code = 'MISSING-E2E-CONFIG-FILE';
      Message = "E2E config ne postoji: $configRel (iz test:e2e)"
    }) | Out-Null
    continue
  }

  $rawCfg = Get-Content $configFull -Raw -Encoding UTF8
  if ([string]::IsNullOrWhiteSpace($rawCfg)) {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'WARN'; Code = 'EMPTY-E2E-CONFIG';
      Message = "E2E config je prazan: $configRel"
    }) | Out-Null
    continue
  }

  $jestCfg = $null
  try {
    $jestCfg = $rawCfg | ConvertFrom-Json
  } catch {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'WARN'; Code = 'INVALID-E2E-CONFIG-JSON';
      Message = "E2E config JSON parsing fail ($configRel): $_"
    }) | Out-Null
    continue
  }

  $testEnv = $null
  if ($jestCfg.PSObject.Properties['testEnvironment']) { $testEnv = "$($jestCfg.testEnvironment)" }
  if ($testEnv -and $testEnv -ne 'node') {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'WARN'; Code = 'E2E-WRONG-TEST-ENVIRONMENT';
      Message = "testEnvironment='$testEnv' - backend E2E ocekuju 'node'"
    }) | Out-Null
  } elseif (-not $testEnv) {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'WARN'; Code = 'E2E-MISSING-TEST-ENVIRONMENT';
      Message = "testEnvironment nije eksplicitno 'node' u $configRel"
    }) | Out-Null
  }

  $pattern = $null
  if ($jestCfg.PSObject.Properties['testRegex']) { $pattern = "$($jestCfg.testRegex)" }
  elseif ($jestCfg.PSObject.Properties['testMatch']) {
    $tm = $jestCfg.testMatch
    if ($tm -is [System.Array] -and $tm.Count -gt 0) { $pattern = [string]$tm[0] }
    else { $pattern = "$tm" }
  }

  if ($e2eSpecs.Count -eq 0) {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'INFO'; Code = 'NO-E2E-SPEC-FILES';
      Message = "Nema *.e2e-spec.ts fajlova u paketu (test:e2e postoji)"
    }) | Out-Null
  } elseif ($pattern -and -not (Test-MatchesJestPattern -Pattern $pattern -FileNames $specNames)) {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'INFO'; Code = 'E2E-PATTERN-NO-MATCH';
      Message = "testRegex/testMatch ne match-uje postojece E2E spec fajlove ($($specNames -join ', '))"
    }) | Out-Null
  }

  if (-not (Test-HasSupertestDep -DevDeps $devDeps)) {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'INFO'; Code = 'NO-SUPERTEST-DEP';
      Message = "supertest nije u devDependencies - tipicno za Nest/Express E2E"
    }) | Out-Null
  }

  if ($verifyCi -and $verifyCi -match 'test:e2e') {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'INFO'; Code = 'VERIFY-CI-CHAINS-E2E';
      Message = "verify:ci ukljucuje test:e2e - CI kritican put"
    }) | Out-Null
  }
}

Write-Host "== Paketi sa test:e2e ==" -ForegroundColor Yellow
if ($withE2e.Count -eq 0) {
  Write-Host "  (nijedan od skeniranih paketa nema test:e2e script)" -ForegroundColor DarkGray
} else {
  $withE2e | ForEach-Object {
    [pscustomobject]@{
      Root    = $_.Root
      Config  = $_.ConfigRel
      Specs   = $_.E2eSpecCount
      VerifyCi = $_.VerifyCi
    }
  } | Format-Table -AutoSize | Out-String | Write-Host
}

$warnFindings = @($findings | Where-Object { $_.Severity -eq 'WARN' })
$infoFindings = @($findings | Where-Object { $_.Severity -eq 'INFO' })

Write-Host ""
Write-Host "== Findings ==" -ForegroundColor Yellow
Write-Host ("  WARN (Jest-E2E-rizik):    {0}" -f $warnFindings.Count)
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
Write-Host "  - Talas 112: 11. sloj structural config (Jest E2E / integration-test entry)." -ForegroundColor DarkGray
Write-Host "  - Dopuna Talas 109 (unit Jest) + Talas 94 (test:e2e script na verify:ci putanji)." -ForegroundColor DarkGray
Write-Host '  - run-all-audits.ps1: 39 koraka (37 read-only + TODO + npm); single entry point.' -ForegroundColor DarkGray

if ($FailOnWarn -and $warnFindings.Count -gt 0) {
  Write-Host ""
  Write-Host "FAIL: $($warnFindings.Count) WARN (FailOnWarn)" -ForegroundColor Red
  exit 1
}
exit 0
