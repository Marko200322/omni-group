<#
.SYNOPSIS
  `package.json` `scripts:` polja doslednost preko 3 Node paketa (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 94: dopuna Talas 79 (`engines.node` + `license` + `private` strukturalna polja); Talas 79 pokriva metapodatke ali NE pokriva `scripts:` polja koja su ključna za **CI/CD usklađenost** (workflow zove `npm test`, `npm run lint`, `npm run build` — ako nedostaju, build pada). Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa parsira 3 paket-level `package.json` fajla (`apps/omnigroup-web/package.json` Next + `atina-platform/atina/package.json` Node lib + `atina-system/package.json` Nest) i validira **6 strukturalnih invarijanti** za `scripts:` blok:

  1. **`test` script postoji** (WARN): obavezan svuda — bez ovog `npm test` u CI fail-uje sa `Missing script: "test"` (npm konvencija). **Trenutno baseline (2026-05-14):** `apps/omnigroup-web` NEMA `test` script — **realan CI/CD signal** koji bi npm v7+ uhvatio u workflow.
  2. **`lint` script postoji** (WARN): obavezan svuda — ESLint integracija sa `npm run lint` je standard za pre-commit / CI lint stage. Sva 3 paketa trenutno imaju.
  3. **`build` script postoji** (WARN): obavezan svuda — kompilacija pre deploy-a.
  4. **`start` script postoji** (WARN za servise; INFO za libs): obavezan za servise koji se boot-uju — `npm run start` (Atina, Nest, Next dev start). Lib paketi mogu legitimno bez.
  5. **`dev` ili `start:dev` script postoji** (INFO): konzistentnost development workflow-a — Next i Atina koriste `dev`, Nest koristi `start:dev` (NestCLI konvencija). INFO jer dva legitimna stila.
  6. **`format` script postoji** (INFO): Prettier integracija — samo Nest trenutno ima `format: "prettier --write ..."`. INFO jer nije strogo obavezan.

  **Parsing strategija:**

  - `Get-Content -Raw -LiteralPath ... | ConvertFrom-Json` (PS5.1 native).
  - `package.json` je čist JSON (ne JSONC), nema komentara — sigurnu od PS Lesson #19 (block-comment regex glob bug iz Talas 87).
  - Lookup `$json.scripts.PSObject.Properties.Name` daje listu key-eva.

  Read-only audit: ne menja fajlove. **Nije** deo CI mirror-a (`verify-monorepo.ps1` job **`python`** / required check **`Python (Doslednost dok + pytest)`** — `docs/GIT-BRANCH-PROTECTION.md`) i ne menja njegov scope. Dopuna pre-PR pregleda; smoke (HTTP) i bundled `npm run smoke:all`: `scripts/smoke-stack.ps1` + `atina-platform/atina/docs/operations/release-gate-checklist.md` (*Local notes — Smoke tests*).

.PARAMETER FailOnWarn
  Vraća exit 1 ako bilo koji paket ima WARN nalaz (`test` / `lint` / `build` / `start` script nedostaje). Bez ove opcije, uvek vraća 0 (skripta je informativna).

.PARAMETER MaxOutput
  Maksimalan broj redova u Detalji sekciji. Default 200.

.PARAMETER PackageRoots
  Lista relativnih putanja do `package.json` fajlova koji se proveravaju. Default 3 paketa: `apps/omnigroup-web/package.json`, `atina-platform/atina/package.json`, `atina-system/package.json`. Parametrizovan radi ekstenzibilnosti — ako se doda 4. Node paket, vlasnik može proširiti listu bez izmene koda.

.EXAMPLE
  .\scripts\check-package-scripts-consistency.ps1
  # Default: skenira 3 package.json fajla, prijavljuje WARN/INFO nalaze, exit 0 uvek.

.EXAMPLE
  .\scripts\check-package-scripts-consistency.ps1 -FailOnWarn
  # Strogi rezim: exit 1 ako bilo koji paket nema test/lint/build/start script.

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 94 = ovaj skript; ukupno 39 koraka Talas 65-192).
  Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md; pun mirror uključuje apps/omnigroup-web build osim sa -SkipOmnigroupWeb).
  Smoke (HTTP) + Atina bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (*Local notes — Smoke tests*).
  LATEST verify: docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md (Val 355); smoke: docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md (Val 351).
  Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md.
  Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md + docs/NIVO-1-DRYRUN-LOG.md.
  Help snapshot za sve scripts/*.ps1: docs/SCRIPTS-HELP-SNAPSHOT.md (regen: scripts/regenerate-help-snapshot.ps1).
  PowerShell 5.1+.
#>
#Requires -Version 5.1
param(
  [switch]$FailOnWarn,
  [int]$MaxOutput = 200,
  [string[]]$PackageRoots = @(
    'apps/omnigroup-web/package.json',
    'atina-platform/atina/package.json',
    'atina-system/package.json'
  )
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

Write-Host '== check-package-scripts-consistency.ps1 - npm scripts: doslednost preko 3 Node paketa (informativan) ==' -ForegroundColor Cyan
Write-Host ("   FailOnWarn: {0}" -f $FailOnWarn) -ForegroundColor DarkGray
Write-Host ("   PackageRoots ({0} fajla): {1}" -f $PackageRoots.Count, ($PackageRoots -join ', ')) -ForegroundColor DarkGray

# --- Helper: parsiraj package.json i ekstraktuj scripts: keys ---
function Get-PackageScriptsInfo {
  param(
    [string]$RelPath,
    [string]$AbsPath
  )
  $info = [pscustomobject]@{
    Package = $RelPath
    Exists = (Test-Path $AbsPath)
    PackageName = $null
    HasScriptsBlock = $false
    ScriptKeys = @()
    HasTest = $false
    HasLint = $false
    HasBuild = $false
    HasStart = $false
    HasDev = $false
    HasStartDev = $false
    HasFormat = $false
  }
  if (-not $info.Exists) { return $info }

  try {
    $raw = Get-Content -Raw -LiteralPath $AbsPath -Encoding UTF8
    $json = $raw | ConvertFrom-Json
  } catch {
    Write-Host ("   WARN: ConvertFrom-Json fail za {0}: {1}" -f $RelPath, $_.Exception.Message) -ForegroundColor Yellow
    return $info
  }

  if ($json.PSObject.Properties.Name -contains 'name') {
    $info.PackageName = [string]$json.name
  }
  if ($json.PSObject.Properties.Name -contains 'scripts' -and $null -ne $json.scripts) {
    $info.HasScriptsBlock = $true
    $info.ScriptKeys = @($json.scripts.PSObject.Properties.Name)
    $keysLower = @($info.ScriptKeys | ForEach-Object { $_.ToLowerInvariant() })
    $info.HasTest = $keysLower -contains 'test'
    $info.HasLint = $keysLower -contains 'lint'
    $info.HasBuild = $keysLower -contains 'build'
    $info.HasStart = $keysLower -contains 'start'
    $info.HasDev = $keysLower -contains 'dev'
    $info.HasStartDev = $keysLower -contains 'start:dev'
    $info.HasFormat = $keysLower -contains 'format'
  }

  return $info
}

# --- Skeniraj 3 paketa ---
$packages = New-Object 'System.Collections.Generic.List[object]'
$findings = New-Object 'System.Collections.Generic.List[object]'

foreach ($rel in $PackageRoots) {
  $abs = Join-Path $repoRoot $rel
  if (-not (Test-Path $abs)) {
    $findings.Add([pscustomobject]@{
      Package = $rel
      Severity = 'WARN'
      Code = 'MISSING-PACKAGE-JSON'
      Detail = 'package.json fajl ne postoji'
    }) | Out-Null
    continue
  }
  $info = Get-PackageScriptsInfo -RelPath $rel -AbsPath $abs
  $packages.Add($info) | Out-Null
}

# --- Validacija + nalazi ---
foreach ($pkg in $packages) {
  if (-not $pkg.HasScriptsBlock) {
    $findings.Add([pscustomobject]@{
      Package = $pkg.Package
      Severity = 'WARN'
      Code = 'NO-SCRIPTS-BLOCK'
      Detail = 'package.json nema "scripts" objekat - svi npm run komande fail-uju'
    }) | Out-Null
    continue
  }

  # Inv 1: test
  if (-not $pkg.HasTest) {
    $findings.Add([pscustomobject]@{
      Package = $pkg.Package
      Severity = 'WARN'
      Code = 'NO-TEST-SCRIPT'
      Detail = 'nema "test" script - npm test u CI fail-uje sa "Missing script: test" (npm konvencija)'
    }) | Out-Null
  }

  # Inv 2: lint
  if (-not $pkg.HasLint) {
    $findings.Add([pscustomobject]@{
      Package = $pkg.Package
      Severity = 'WARN'
      Code = 'NO-LINT-SCRIPT'
      Detail = 'nema "lint" script - ESLint integracija sa pre-commit / CI lint stage je polomljena'
    }) | Out-Null
  }

  # Inv 3: build
  if (-not $pkg.HasBuild) {
    $findings.Add([pscustomobject]@{
      Package = $pkg.Package
      Severity = 'WARN'
      Code = 'NO-BUILD-SCRIPT'
      Detail = 'nema "build" script - kompilacija pre deploy-a polomljena'
    }) | Out-Null
  }

  # Inv 4: start
  if (-not $pkg.HasStart) {
    $findings.Add([pscustomobject]@{
      Package = $pkg.Package
      Severity = 'WARN'
      Code = 'NO-START-SCRIPT'
      Detail = 'nema "start" script - servis ne moze biti boot-ovan sa npm run start'
    }) | Out-Null
  }

  # Inv 5: dev / start:dev (INFO)
  if (-not ($pkg.HasDev -or $pkg.HasStartDev)) {
    $findings.Add([pscustomobject]@{
      Package = $pkg.Package
      Severity = 'INFO'
      Code = 'NO-DEV-WORKFLOW'
      Detail = 'nema "dev" ni "start:dev" script - lokalni development workflow nedosledan (Next/Atina koriste "dev", Nest koristi "start:dev")'
    }) | Out-Null
  }

  # Inv 6: format (INFO konzistentnost Prettier integracije)
  if (-not $pkg.HasFormat) {
    $findings.Add([pscustomobject]@{
      Package = $pkg.Package
      Severity = 'INFO'
      Code = 'NO-FORMAT-SCRIPT'
      Detail = 'nema "format" script - Prettier integracija nedosledna preko paketa (samo Nest trenutno ima)'
    }) | Out-Null
  }
}

# --- Sumarni izveštaj ---
$warns = @($findings | Where-Object { $_.Severity -eq 'WARN' })
$infos = @($findings | Where-Object { $_.Severity -eq 'INFO' })

Write-Host ''
Write-Host '== package.json scripts: doslednost rezime ==' -ForegroundColor Cyan
Write-Host ("  Node paketa skenirano:        {0}" -f $packages.Count)
Write-Host ("  WARN (CI/CD risk):            {0}" -f $warns.Count)
Write-Host ("  INFO (informativno):          {0}" -f $infos.Count)

# --- Tabela paketa ---
Write-Host ''
Write-Host '== Tabela paketa ==' -ForegroundColor Cyan
$packages |
  Select-Object @{N='Paket';E={$_.Package}}, @{N='Scripts';E={$_.ScriptKeys.Count}}, @{N='test';E={$_.HasTest}}, @{N='lint';E={$_.HasLint}}, @{N='build';E={$_.HasBuild}}, @{N='start';E={$_.HasStart}}, @{N='dev';E={if ($_.HasDev) { 'dev' } elseif ($_.HasStartDev) { 'start:dev' } else { '(none)' }}}, @{N='format';E={$_.HasFormat}} |
  Format-Table -AutoSize | Out-String | Write-Host

# --- Detalji WARN + INFO ---
if ($findings.Count -gt 0) {
  Write-Host '== Detalji nalaza (WARN prvo, INFO posle) ==' -ForegroundColor Cyan
  $sorted = $findings | Sort-Object @{Expression='Severity'; Descending=$false}, Package, Code
  $sorted | Select-Object -First $MaxOutput | ForEach-Object {
    $color = if ($_.Severity -eq 'WARN') { 'Yellow' } else { 'DarkGray' }
    Write-Host ("  [{0}] {1} :: {2}" -f $_.Severity, $_.Package, $_.Code) -ForegroundColor $color
    Write-Host ("    {0}" -f $_.Detail) -ForegroundColor DarkGray
  }
}

Write-Host ''
Write-Host 'Napomene:' -ForegroundColor DarkGray
Write-Host '  - Komplementaran sa Talas 79 (`check-package-json-consistency.ps1`) - Talas 79 pokriva strukturalna polja (engines.node, license, private), Talas 94 pokriva scripts: blok.'
Write-Host '  - Talas 79 + 80 + 81 + 87 + 91 + 92 + 94 = 7 strukturalnih audit-a preko 3 Node paketa (paket metapodaci + CI/CD + Discoverability + TypeScript + ESLint + VCS-hygiene + npm scripts).'
Write-Host '  - Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md).'
Write-Host '  - Smoke (HTTP) i bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).'
Write-Host '  - Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md (LATEST verify Val 355; smoke Val 351).'
Write-Host '  - Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md i docs/NIVO-1-DRYRUN-LOG.md.'

if ($FailOnWarn -and $warns.Count -gt 0) {
  exit 1
}
exit 0
