<#
.SYNOPSIS
  `.gitignore` doslednost preko 3 Node paketa + root (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 92: dopunjuje monorepo-wide structural consistency domen u **VCS-hygiene sloj** posle Talas 79 (`package.json`), Talas 80 (workflow YAML + `.nvmrc`), Talas 81 (README presence), Talas 87 (`tsconfig.json`) i Talas 91 (ESLint config). Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa parsira 4 `.gitignore` fajla (root + 3 paket-level: `apps/omnigroup-web/.gitignore` Next, `atina-platform/atina/.gitignore` Node lib, `atina-system/.gitignore` NestJS) i validira 6 strukturalnih invarijanti:

  1. **`node_modules` ignore-uje** (WARN): obavezan svuda — bez ovog `node_modules` se commit-uje. Tolerantan na `node_modules/`, `/node_modules`, `node_modules` (sva 3 oblika su validna).
  2. **Coverage direktorij ignore-uje** (WARN): `coverage/` ili `/coverage` — testovi generišu, ne sme u repo.
  3. **`.env` secrets ignore-uje** (WARN): bar jedan od `.env`, `.env*`, `.env.local`, `*.env` — security gate, sprečava slučajni commit secrets-a. **Posebna provera**: paket koji ima samo `.env*.local` (npr. omnigroup-web) **bez** punog `.env` ili `.env*` glob-a se klasifikuje kao WARN jer `.env` (bez `.local` sufiksa) može biti commit-ovan.
  4. **Build artifact ignore-uje** (WARN): bar jedan od `dist`, `dist/`, `/dist`, `.next`, `.next/`, `/.next`, `build`, `/build`, `out`, `/out` — ovi direktorijumi su build output, ne sme u repo. Per-paket: Next paket (`omnigroup-web`) ima `.next`/`out`/`build`, Node lib + Nest imaju `dist`.
  5. **Log-ovi ignore-uju** (INFO): bar jedan od `*.log`, `logs/`, `npm-debug.log*` — runtime log-ovi ne sme u repo. Manje strogo (INFO) jer mnoge skripte log-uju u `tmp/` (root .gitignore već to pokriva).
  6. **OS files ignore-uju** (INFO): bar jedan od `.DS_Store`, `Thumbs.db`, `desktop.ini` — macOS / Windows artifacti. INFO jer ne sadrži secrets, samo zauzimaju mesto.

  **Parsing strategija:**

  - `Get-Content -Encoding UTF8` čita sve linije.
  - Tokenizacija: trim whitespace, ignoriši prazne linije i `#` komentare.
  - Validacija po patternu (substring matching + glob equivalents).

  Read-only audit: ne menja fajlove. **Nije** deo CI mirror-a (`verify-monorepo.ps1` job **`python`** / required check **`Python (Doslednost dok + pytest)`** — `docs/GIT-BRANCH-PROTECTION.md`) i ne menja njegov scope. Dopuna pre-PR pregleda; smoke (HTTP) i bundled `npm run smoke:all`: `scripts/smoke-stack.ps1` + `atina-platform/atina/docs/operations/release-gate-checklist.md` (*Local notes — Smoke tests*).

.PARAMETER FailOnWarn
  Vraća exit 1 ako bilo koji paket ima WARN nalaz (`node_modules` / `coverage` / `.env` / build artifact nedostaju). Bez ove opcije, uvek vraća 0 (skripta je informativna).

.PARAMETER MaxOutput
  Maksimalan broj redova u Detalji sekciji. Default 200.

.PARAMETER GitignorePaths
  Lista relativnih putanja do `.gitignore` fajlova koji se proveravaju. Default 4 putanje: root + 3 paketa. Parametrizovan radi ekstenzibilnosti — ako se doda 4. Node paket sa svojim `.gitignore`-om, vlasnik može proširiti listu bez izmene koda.

.EXAMPLE
  .\scripts\check-gitignore-consistency.ps1
  # Default: skenira 4 .gitignore fajla, prijavljuje WARN/INFO nalaze, exit 0 uvek.

.EXAMPLE
  .\scripts\check-gitignore-consistency.ps1 -FailOnWarn
  # Strogi rezim: exit 1 ako bilo koji paket ima WARN (nedostaju ključni ignore patterni).

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 92 = ovaj skript; ukupno 39 koraka Talas 65-192).
  Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md; pun mirror uključuje apps/omnigroup-web build osim sa -SkipOmnigroupWeb).
  Smoke (HTTP) + Atina bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).
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
  [string[]]$GitignorePaths = @(
    '.gitignore',
    'apps/omnigroup-web/.gitignore',
    'atina-platform/atina/.gitignore',
    'atina-system/.gitignore'
  )
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

Write-Host '== check-gitignore-consistency.ps1 - .gitignore doslednost preko 3 Node paketa + root (informativan) ==' -ForegroundColor Cyan
Write-Host ("   FailOnWarn: {0}" -f $FailOnWarn) -ForegroundColor DarkGray
Write-Host ("   GitignorePaths ({0} fajla): {1}" -f $GitignorePaths.Count, ($GitignorePaths -join ', ')) -ForegroundColor DarkGray

# --- Helper: ucitaj .gitignore fajl, vrati listu pattern-a (bez komentara / praznih linija) ---
function Get-GitignorePatterns {
  param(
    [string]$AbsPath
  )
  if (-not (Test-Path $AbsPath)) {
    return @()
  }
  $lines = Get-Content -LiteralPath $AbsPath -Encoding UTF8
  $patterns = @()
  foreach ($line in $lines) {
    $trim = $line.Trim()
    if ($trim -eq '') { continue }
    if ($trim.StartsWith('#')) { continue }
    $patterns += ,$trim
  }
  return $patterns
}

# --- Helper: proveri da li bilo koji pattern matchuje listu kandidata (substring + glob equivalents) ---
function Test-IgnoreCovered {
  param(
    [string[]]$Patterns,
    [string[]]$Candidates
  )
  foreach ($p in $Patterns) {
    foreach ($cand in $Candidates) {
      if ($p -eq $cand) { return $true }
      # Tolerantan: pattern moze imati prefix `/` ili sufiks `/` ili oba
      $pNorm = $p.TrimStart('/').TrimEnd('/')
      $cNorm = $cand.TrimStart('/').TrimEnd('/')
      if ($pNorm -eq $cNorm -and $pNorm -ne '') { return $true }
    }
  }
  return $false
}

# --- Helper: proveri da li ima `.env` security ignore (sa specijalnim slucajem za samo `.env*.local`) ---
function Test-EnvSecretsIgnored {
  param(
    [string[]]$Patterns
  )
  $info = [pscustomobject]@{
    Covered = $false
    OnlyLocalSuffix = $false
  }
  $hasFullEnv = $false
  $hasOnlyLocalSuffix = $false
  foreach ($p in $Patterns) {
    $trim = $p.Trim()
    # Pun `.env` (sam, bez sufiksa)
    if ($trim -eq '.env') { $hasFullEnv = $true; continue }
    # `.env*` glob - pokriva sve env fajlove
    if ($trim -eq '.env*') { $hasFullEnv = $true; continue }
    if ($trim -eq '*.env') { $hasFullEnv = $true; continue }
    # `.env*.local` - samo lokalni override-ovi, ne pun `.env`
    if ($trim -eq '.env*.local' -or $trim -eq '.env.local' -or $trim -eq '.env.*.local') {
      $hasOnlyLocalSuffix = $true
    }
  }
  $info.Covered = $hasFullEnv
  $info.OnlyLocalSuffix = ($hasOnlyLocalSuffix -and -not $hasFullEnv)
  return $info
}

# --- Skeniraj 4 .gitignore fajla ---
$packages = New-Object 'System.Collections.Generic.List[object]'
$findings = New-Object 'System.Collections.Generic.List[object]'

foreach ($rel in $GitignorePaths) {
  $abs = Join-Path $repoRoot $rel
  if (-not (Test-Path $abs)) {
    $findings.Add([pscustomobject]@{
      Package = $rel
      Severity = 'WARN'
      Code = 'MISSING-GITIGNORE'
      Detail = '.gitignore fajl ne postoji'
    }) | Out-Null
    continue
  }
  $patterns = Get-GitignorePatterns -AbsPath $abs

  $isRoot = ($rel -eq '.gitignore')
  $isNext = ($rel -match 'omnigroup-web')

  $info = [pscustomobject]@{
    Package = $rel
    IsRoot = $isRoot
    IsNext = $isNext
    PatternCount = $patterns.Count
    HasNodeModules = (Test-IgnoreCovered -Patterns $patterns -Candidates @('node_modules', 'node_modules/', '/node_modules'))
    HasCoverage = (Test-IgnoreCovered -Patterns $patterns -Candidates @('coverage', 'coverage/', '/coverage'))
    HasEnvFull = $false
    EnvOnlyLocalSuffix = $false
    HasBuildArtifact = $false
    HasLogIgnore = (Test-IgnoreCovered -Patterns $patterns -Candidates @('*.log', 'logs/', 'logs', 'npm-debug.log*'))
    HasOsFiles = (Test-IgnoreCovered -Patterns $patterns -Candidates @('.DS_Store', 'Thumbs.db', 'desktop.ini'))
  }
  $envCheck = Test-EnvSecretsIgnored -Patterns $patterns
  $info.HasEnvFull = $envCheck.Covered
  $info.EnvOnlyLocalSuffix = $envCheck.OnlyLocalSuffix

  # Build artifact zavisi od paketa - Next ima .next/out/build, Node lib + Nest imaju dist
  if ($isNext) {
    $info.HasBuildArtifact = (Test-IgnoreCovered -Patterns $patterns -Candidates @('.next', '.next/', '/.next', '/.next/', 'out', 'out/', '/out', '/out/', 'build', 'build/', '/build'))
  } elseif ($isRoot) {
    # Root .gitignore ne mora imati build artifact (paketi rade)
    $info.HasBuildArtifact = $true
  } else {
    $info.HasBuildArtifact = (Test-IgnoreCovered -Patterns $patterns -Candidates @('dist', 'dist/', '/dist'))
  }

  $packages.Add($info) | Out-Null
}

# --- Validacija + nalazi (po paketu) ---
foreach ($pkg in $packages) {
  if ($pkg.IsRoot) {
    # Root .gitignore: pravila su informativna; root ima `tmp/`, OS-wide pravila
    if (-not $pkg.HasNodeModules) {
      $findings.Add([pscustomobject]@{
        Package = $pkg.Package
        Severity = 'INFO'
        Code = 'ROOT-NO-NODE-MODULES'
        Detail = 'root .gitignore nema node_modules - paket-level .gitignore pokrivaju (sva 3)'
      }) | Out-Null
    }
    continue
  }

  # Paket-level .gitignore: 6 invarijanti
  if (-not $pkg.HasNodeModules) {
    $findings.Add([pscustomobject]@{
      Package = $pkg.Package
      Severity = 'WARN'
      Code = 'NO-NODE-MODULES'
      Detail = 'node_modules nije ignorisan - rizik od commit-ovanja celog node_modules direktorijuma'
    }) | Out-Null
  }
  if (-not $pkg.HasCoverage) {
    $findings.Add([pscustomobject]@{
      Package = $pkg.Package
      Severity = 'WARN'
      Code = 'NO-COVERAGE'
      Detail = 'coverage direktorij nije ignorisan - test coverage izlazi mogu biti commit-ovani'
    }) | Out-Null
  }
  if (-not $pkg.HasEnvFull) {
    if ($pkg.EnvOnlyLocalSuffix) {
      $findings.Add([pscustomobject]@{
        Package = $pkg.Package
        Severity = 'WARN'
        Code = 'ENV-ONLY-LOCAL-SUFFIX'
        Detail = '.gitignore ima samo .env*.local glob - pun .env (bez .local sufiksa) moze biti commit-ovan; security risk'
      }) | Out-Null
    } else {
      $findings.Add([pscustomobject]@{
        Package = $pkg.Package
        Severity = 'WARN'
        Code = 'NO-ENV'
        Detail = '.env nije ignorisan - secrets mogu biti commit-ovani; security risk'
      }) | Out-Null
    }
  }
  if (-not $pkg.HasBuildArtifact) {
    $expected = if ($pkg.IsNext) { '.next / out / build' } else { 'dist' }
    $findings.Add([pscustomobject]@{
      Package = $pkg.Package
      Severity = 'WARN'
      Code = 'NO-BUILD-ARTIFACT'
      Detail = ("build artifact direktorij nije ignorisan ({0}) - build izlaz moze biti commit-ovan" -f $expected)
    }) | Out-Null
  }
  if (-not $pkg.HasLogIgnore) {
    $findings.Add([pscustomobject]@{
      Package = $pkg.Package
      Severity = 'INFO'
      Code = 'NO-LOG-IGNORE'
      Detail = '*.log / logs/ / npm-debug.log* nisu ignorisani - runtime logovi mogu biti commit-ovani (manje kritican signal)'
    }) | Out-Null
  }
  if (-not $pkg.HasOsFiles) {
    $findings.Add([pscustomobject]@{
      Package = $pkg.Package
      Severity = 'INFO'
      Code = 'NO-OS-FILES'
      Detail = '.DS_Store / Thumbs.db nisu ignorisani - OS artifacti mogu biti commit-ovani (kosmetski signal)'
    }) | Out-Null
  }
}

# --- Sumarni izveštaj ---
$warns = @($findings | Where-Object { $_.Severity -eq 'WARN' })
$infos = @($findings | Where-Object { $_.Severity -eq 'INFO' })

Write-Host ''
Write-Host '== .gitignore doslednost rezime ==' -ForegroundColor Cyan
Write-Host ("  .gitignore fajla skenirano:  {0}" -f $packages.Count)
Write-Host ("  WARN (security / build risk): {0}" -f $warns.Count)
Write-Host ("  INFO (informativno):          {0}" -f $infos.Count)

# --- Tabela paketa ---
Write-Host ''
Write-Host '== Tabela paketa ==' -ForegroundColor Cyan
$packages |
  Select-Object @{N='Paket';E={$_.Package}}, @{N='Patterns';E={$_.PatternCount}}, @{N='node_modules';E={$_.HasNodeModules}}, @{N='coverage';E={$_.HasCoverage}}, @{N='env';E={if ($_.IsRoot) { 'n/a' } elseif ($_.HasEnvFull) { 'OK' } elseif ($_.EnvOnlyLocalSuffix) { 'WARN-LOCAL' } else { 'WARN-NONE' }}}, @{N='build';E={if ($_.IsRoot) { 'n/a' } elseif ($_.HasBuildArtifact) { 'OK' } else { 'WARN' }}}, @{N='log';E={$_.HasLogIgnore}}, @{N='OS';E={$_.HasOsFiles}} |
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
Write-Host '  - Komplementarni audit-i strukturalne doslednosti: package.json (Talas 79), workflow YAML (Talas 80), README (Talas 81), tsconfig.json (Talas 87), ESLint config (Talas 91).'
Write-Host '  - run-all-audits.ps1: 39 koraka (37 read-only + TODO + npm); single entry point.'
Write-Host '  - Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md).'
Write-Host '  - Smoke (HTTP) i bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).'
Write-Host '  - Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md (LATEST verify Val 355; smoke Val 351).'
Write-Host '  - Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md i docs/NIVO-1-DRYRUN-LOG.md.'

if ($FailOnWarn -and $warns.Count -gt 0) {
  exit 1
}
exit 0
