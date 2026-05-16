<#
.SYNOPSIS
  `package.json` `devDependencies` MAJOR version doslednost preko 3 Node paketa (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 96: **3. sloj `package.json` audit-a** posle Talas 79 (metapodaci: `engines.node` + `license` + `private`) i Talas 94 (`scripts:` polja: test/lint/build/start/dev/format) — fokus na verzijama ključnih dev-tools (TypeScript, ESLint, `@types/node`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, prettier) koje moraju biti **konzistentne preko paketa** da bi compile + lint output bio reproduktibilan i da ne bi došlo do tip / pravilo drift-a između CI build-ova. Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa parsira 3 paket-level `package.json` fajla (`apps/omnigroup-web/package.json` Next + `atina-platform/atina/package.json` Node lib + `atina-system/package.json` Nest) i validira **6 strukturalnih invarijanti** za **MAJOR version** ključnih dev-deps:

  1. **`typescript` MAJOR** (WARN ako mismatch) — različite TS major verzije znače različite type system features (npr. TS 4 vs TS 5: `const` type parameters, `using` declarations, decorator standardization); inkonzistentnost preko paketa može uzrokovati subtle compile differences u shared types ili paralelnim `tsc --noEmit` build-ovima.
  2. **`eslint` MAJOR** (WARN ako mismatch) — različite ESLint major verzije imaju različita default pravila (npr. ESLint 8 → 9: flat config je default); inkonzistentnost znači da `npm run lint` može davati različite output-e u CI vs lokalno.
  3. **`@types/node` MAJOR** (WARN ako mismatch) — kritičan signal jer **`@types/node` major mora odgovarati Node major-u** (`@types/node@20` za Node 20 LTS); inkonzistentnost preko paketa znači da različiti paketi tretiraju globalne Node API-je (Buffer, fs, http, stream) drugačije.
  4. **`@typescript-eslint/parser` MAJOR** (WARN ako mismatch) — kritičan signal za TS lint kvalitet; major version razlika (npr. v6 vs v8) znači različita lint pravila: v8 ima novi parser sa boljom TS 5.x podrškom, v6 koristi stari resolver — direktna lint output razlika.
  5. **`@typescript-eslint/eslint-plugin` MAJOR** (WARN ako mismatch) — par sa parser-om; mora se sinhronizovati major version sa parser-om u istom paketu (`@typescript-eslint` peer-dep matrica).
  6. **`prettier` MAJOR** (INFO; samo paketi koji imaju Prettier — Talas 91/94 follow-up) — Prettier 2 vs 3 ima različita default pravila (Prettier 3 default: `trailingComma: "all"`, ASI vs aposterior); INFO jer samo Nest trenutno ima Prettier.

  **Parsing strategija (PS Lesson #19):**

  - `Get-Content -Raw -LiteralPath ... | ConvertFrom-Json` (PS5.1 native).
  - `package.json` je čist JSON (ne JSONC) — bez block-comment regex glob bug-a (Talas 87 lekcija).
  - **MAJOR ekstrakcija** preko regex-a `^[\^~]?(\d+)` — caret (`^5.3.2` → `5`), tilde (`~5.3.2` → `5`), exact (`5.3.2` → `5`), glob (`^5` → `5`); rukuje sve oblike koji se pojavljuju u `package.json` semver string-u.

  Read-only audit: ne menja fajlove. **Nije** deo CI mirror-a (`verify-monorepo.ps1` job **`python`** / required check **`Python (Doslednost dok + pytest)`** — `docs/GIT-BRANCH-PROTECTION.md`). Dopuna pre-PR pregleda; smoke (HTTP) i bundled `npm run smoke:all`: `scripts/smoke-stack.ps1` + `atina-platform/atina/docs/operations/release-gate-checklist.md` (*Local notes — Smoke tests*).

.PARAMETER FailOnWarn
  Vraća exit 1 ako bilo koja od 5 obaveznih dev-deps (`typescript`, `eslint`, `@types/node`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`) ima MAJOR mismatch preko paketa. `prettier` je INFO-only i ne podiže exit. Bez ove opcije, uvek vraća 0 (skripta je informativna).

.PARAMETER MaxOutput
  Maksimalan broj redova u Detalji sekciji. Default 200.

.PARAMETER PackageRoots
  Lista relativnih putanja do `package.json` fajlova koji se proveravaju. Default 3 paketa: `apps/omnigroup-web/package.json`, `atina-platform/atina/package.json`, `atina-system/package.json`. Parametrizovan radi ekstenzibilnosti — ako se doda 4. Node paket, vlasnik može proširiti listu bez izmene koda.

.EXAMPLE
  .\scripts\check-dev-deps-versions-consistency.ps1
  # Default: skenira 3 package.json fajla, prijavljuje WARN/INFO nalaze, exit 0 uvek.

.EXAMPLE
  .\scripts\check-dev-deps-versions-consistency.ps1 -FailOnWarn
  # Strogi rezim: exit 1 ako bilo koja od 5 ključnih dev-deps ima MAJOR mismatch.

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 96 = ovaj skript; ukupno 39 koraka Talas 65-192).
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

Write-Host '== check-dev-deps-versions-consistency.ps1 - devDependencies MAJOR doslednost preko 3 Node paketa (informativan) ==' -ForegroundColor Cyan
Write-Host ("   FailOnWarn: {0}" -f $FailOnWarn) -ForegroundColor DarkGray
Write-Host ("   PackageRoots ({0} fajla): {1}" -f $PackageRoots.Count, ($PackageRoots -join ', ')) -ForegroundColor DarkGray

# --- Definicija ključnih dev-deps + severity ---
# Severity: WARN = obavezna konzistentnost (kompletira ~95% lint/compile output rizika)
#           INFO = opcionalna konzistentnost (samo paketi koji imaju)
$keyDeps = @(
  @{ Name = 'typescript'; Severity = 'WARN'; Description = 'TS major verzija - razlicite verzije = razlicit type system feature set (npr. TS4 vs TS5)' }
  @{ Name = 'eslint'; Severity = 'WARN'; Description = 'ESLint major verzija - razlicite verzije = razlicita default pravila (npr. ESLint 8 vs 9 flat config)' }
  @{ Name = '@types/node'; Severity = 'WARN'; Description = '@types/node major mora odgovarati Node major-u (npr. @types/node@20 za Node 20 LTS)' }
  @{ Name = '@typescript-eslint/parser'; Severity = 'WARN'; Description = 'TS-ESLint parser major - razlicite verzije = razlicit parsing TS koda' }
  @{ Name = '@typescript-eslint/eslint-plugin'; Severity = 'WARN'; Description = 'TS-ESLint plugin major - mora se sinhronizovati sa parser-om (peer-dep matrica)' }
  @{ Name = 'prettier'; Severity = 'INFO'; Description = 'Prettier major (samo paketi koji imaju) - razlicite verzije = razlicit format output (Prettier 2 vs 3 default)' }
)

# --- Helper: ekstraktuj MAJOR verziju iz semver string-a ---
function Get-MajorVersion {
  param([string]$VersionString)
  if (-not $VersionString) { return $null }
  if ($VersionString -match '^[\^~]?(\d+)') {
    return [int]$Matches[1]
  }
  return $null
}

# --- Helper: parsiraj package.json i ekstraktuj devDeps ---
function Get-PackageDevDeps {
  param(
    [string]$RelPath,
    [string]$AbsPath
  )
  $info = [pscustomobject]@{
    Package = $RelPath
    Exists = (Test-Path $AbsPath)
    PackageName = $null
    DevDeps = @{}
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
  if ($json.PSObject.Properties.Name -contains 'devDependencies' -and $null -ne $json.devDependencies) {
    foreach ($prop in $json.devDependencies.PSObject.Properties) {
      $info.DevDeps[$prop.Name] = [string]$prop.Value
    }
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
  $info = Get-PackageDevDeps -RelPath $rel -AbsPath $abs
  $packages.Add($info) | Out-Null
}

# --- Validacija: za svaku ključnu dev-dep, ekstraktuj MAJOR preko paketa i proveri konzistentnost ---
$depMatrix = New-Object 'System.Collections.Generic.List[object]'
foreach ($dep in $keyDeps) {
  $perPackageMajors = @{}
  $perPackageVersions = @{}
  foreach ($pkg in $packages) {
    if ($pkg.DevDeps.ContainsKey($dep.Name)) {
      $ver = $pkg.DevDeps[$dep.Name]
      $major = Get-MajorVersion -VersionString $ver
      $perPackageMajors[$pkg.Package] = $major
      $perPackageVersions[$pkg.Package] = $ver
    } else {
      $perPackageMajors[$pkg.Package] = $null
      $perPackageVersions[$pkg.Package] = $null
    }
  }

  $depMatrix.Add([pscustomobject]@{
    Dep = $dep.Name
    Severity = $dep.Severity
    PerPackageMajors = $perPackageMajors
    PerPackageVersions = $perPackageVersions
    Description = $dep.Description
  }) | Out-Null

  # --- Mismatch analiza ---
  # Skupi sve nenula MAJOR verzije
  $majorsList = @($perPackageMajors.Values | Where-Object { $null -ne $_ })
  $uniqueMajors = @($majorsList | Select-Object -Unique)

  if ($majorsList.Count -eq 0) {
    # Niko nema dependency
    if ($dep.Severity -eq 'WARN') {
      $findings.Add([pscustomobject]@{
        Dep = $dep.Name
        Severity = 'INFO'
        Code = 'ABSENT-EVERYWHERE'
        Detail = ("{0} ne postoji ni u jednom paketu (mozda legitimno - npr. omnigroup-web koristi tsc preko Next, ali audit-uje se kao INFO)" -f $dep.Name)
      }) | Out-Null
    }
    continue
  }

  if ($majorsList.Count -lt $packages.Count) {
    # Postoji u nekim, ali ne u svim — ovo je legitimno za INFO dep (prettier samo Nest), ali za WARN deps treba zabeležiti
    if ($dep.Severity -eq 'WARN') {
      # Spise koji paketi nemaju
      $missingPkgs = @($perPackageMajors.GetEnumerator() | Where-Object { $null -eq $_.Value } | ForEach-Object { $_.Key })
      $haveStr = ($perPackageMajors.GetEnumerator() | Where-Object { $null -ne $_.Value } | ForEach-Object { ("{0}@{1}" -f $_.Key, $_.Value) }) -join ', '
      $findings.Add([pscustomobject]@{
        Dep = $dep.Name
        Severity = 'INFO'
        Code = 'PARTIAL-COVERAGE'
        Detail = ("{0} postoji samo u nekim paketima: imaju [{1}], nemaju [{2}]" -f $dep.Name, $haveStr, ($missingPkgs -join ', '))
      }) | Out-Null
    }
  }

  if ($uniqueMajors.Count -gt 1) {
    # Postoji MAJOR mismatch
    $detailParts = @()
    foreach ($pkg in $packages) {
      $major = $perPackageMajors[$pkg.Package]
      $ver = $perPackageVersions[$pkg.Package]
      if ($null -ne $major) {
        $detailParts += ("{0}: ^{1}.x (`{2}`)" -f $pkg.Package, $major, $ver)
      }
    }
    $findings.Add([pscustomobject]@{
      Dep = $dep.Name
      Severity = $dep.Severity
      Code = 'MAJOR-MISMATCH'
      Detail = ("{0} MAJOR mismatch preko paketa: {1} - {2}" -f $dep.Name, ($detailParts -join ' | '), $dep.Description)
    }) | Out-Null
  }
}

# --- Sumarni izveštaj ---
$warns = @($findings | Where-Object { $_.Severity -eq 'WARN' })
$infos = @($findings | Where-Object { $_.Severity -eq 'INFO' })

Write-Host ''
Write-Host '== devDependencies MAJOR doslednost rezime ==' -ForegroundColor Cyan
Write-Host ("  Node paketa skenirano:        {0}" -f $packages.Count)
Write-Host ("  Kljucnih dev-deps proverljivo: {0}" -f $keyDeps.Count)
Write-Host ("  WARN (lint/compile drift):    {0}" -f $warns.Count)
Write-Host ("  INFO (informativno):          {0}" -f $infos.Count)

# --- Tabela dep matrice (po dep-u prikazi MAJOR po paketu) ---
Write-Host ''
Write-Host '== Tabela dev-deps MAJOR po paketu ==' -ForegroundColor Cyan
$depMatrix |
  Select-Object @{N='dev-dep';E={$_.Dep}}, @{N='Severity';E={$_.Severity}}, @{N='omnigroup-web';E={
    $v = $_.PerPackageMajors['apps/omnigroup-web/package.json']
    if ($null -eq $v) { '(none)' } else { ("^{0}.x" -f $v) }
  }}, @{N='atina-platform';E={
    $v = $_.PerPackageMajors['atina-platform/atina/package.json']
    if ($null -eq $v) { '(none)' } else { ("^{0}.x" -f $v) }
  }}, @{N='atina-system';E={
    $v = $_.PerPackageMajors['atina-system/package.json']
    if ($null -eq $v) { '(none)' } else { ("^{0}.x" -f $v) }
  }} |
  Format-Table -AutoSize | Out-String | Write-Host

# --- Detalji WARN + INFO ---
if ($findings.Count -gt 0) {
  Write-Host '== Detalji nalaza (WARN prvo, INFO posle) ==' -ForegroundColor Cyan
  $sorted = $findings | Sort-Object @{Expression='Severity'; Descending=$false}, Dep, Code
  $sorted | Select-Object -First $MaxOutput | ForEach-Object {
    $color = if ($_.Severity -eq 'WARN') { 'Yellow' } else { 'DarkGray' }
    Write-Host ("  [{0}] {1} :: {2}" -f $_.Severity, $_.Dep, $_.Code) -ForegroundColor $color
    Write-Host ("    {0}" -f $_.Detail) -ForegroundColor DarkGray
  }
}

Write-Host ''
Write-Host 'Napomene:' -ForegroundColor DarkGray
Write-Host '  - Komplementaran sa Talas 79 (`check-package-json-consistency.ps1` metapodaci) i Talas 94 (`check-package-scripts-consistency.ps1` scripts:); zajedno cine 3-slojni `package.json` audit.'
Write-Host '  - MAJOR mismatch je realan rizik za reproduktibilnost lint/compile output-a; vlasnik akcija opciono - sinhronizovati MAJOR preko paketa.'
Write-Host '  - Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md).'
Write-Host '  - Smoke (HTTP) i bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).'
Write-Host '  - Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md (LATEST verify Val 355; smoke Val 351).'
Write-Host '  - Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md i docs/NIVO-1-DRYRUN-LOG.md.'

if ($FailOnWarn -and $warns.Count -gt 0) {
  exit 1
}
exit 0
