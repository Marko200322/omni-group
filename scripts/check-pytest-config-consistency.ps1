<#
.SYNOPSIS
  Python testing config doslednost preko 3 Python lokacija (root + sistem_naplate + tools/youtube-pipeline) (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 103: **drugi audit Python sloja** posle Talas 101 (Python `requirements.txt` strukturalna doslednost) — paralela Talas 87 (`tsconfig.json` doslednost) za TS sloj. Pre Talas 103, Talas 101 je samo prijavljivao `NO-PYTEST-INI` kao INFO bez detaljne validacije; Talas 103 audituje **6 strukturalnih invarijanti** za testing config sa eksplicitnim Required-WARN nivoima ako paket ima `tests/` ali nema nikakvu konfiguraciju. Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa skenira **3 Python lokacije** i validira **6 strukturalnih invarijanti** za pytest testing config:

  - **Root** (`pytest.ini` + `tests/` + `pytest==8.3.5` u `requirements.txt`) — Python `forge` / `atina` / `astra` stack (Flask + Gunicorn + fpdf2 + requests + pytest); povezan sa `tests/` direktorijumom.
  - **`sistem_naplate/`** (nema `pytest.ini`, ima `tests/` + `tests/conftest.py`) — Standalone billing skripte (fpdf2 + requests); `pytest` dep nije eksplicitno u `requirements.txt` (oslanja se na root install).
  - **`tools/youtube-pipeline/`** (nema `pytest.ini`, nema `tests/`) — Celery worker za YouTube pipeline (celery + redis + moviepy); nema `pytest` dep niti tests dir.

  **6 strukturalnih invarijanti:**

  1. **Testing config postoji ako `tests/` direktorij postoji** (Required-WARN) — paket sa `tests/` dir treba imati **bar jedan** od: `pytest.ini`, `pyproject.toml` sa `[tool.pytest.ini_options]`, ili `setup.cfg` sa `[tool:pytest]` sekcijom; bez konfiguracije, `pytest` test discovery koristi defaults što može propustiti edge cases (npr. testpaths ne pokriva nested dir, pythonpath ne dodaje `src/`).
  2. **`pytest` dep u `requirements.txt` ako paket ima `tests/`** (Optional-INFO) — paket sa `tests/` direktorijumom treba eksplicitno deklarisati `pytest` u `requirements.txt` ili `requirements-dev.txt` (može biti inherit-ovan iz parent install, ali eksplicitno je preglednije za onboarding novog developera).
  3. **`testpaths` definisan u testing config-u** (Optional-INFO) — bez `testpaths`, pytest skenira ceo paket što može uhvatiti nedeterminističke direktorijume (build artefakti, virtualenv); definisanje `testpaths = tests` ubrzava discovery i ekspliciatno uokviruje.
  4. **`pythonpath` definisan ako paket koristi `src/` strukturu** (Optional-INFO) — paket koji ima `src/` dir kao import root treba `pythonpath = src` u `pytest.ini`; bez toga, `from mymodule import ...` u testovima fail-uje sa `ModuleNotFoundError`.
  5. **`addopts` definisan za enhanced setup** (Optional-INFO) — `--strict-markers` (sprečava typo u `@pytest.mark.foo`), `-ra` (kratak summary svih non-pass test-ova), `--cov` (coverage report) — common best practice za production-ready Python projekte.
  6. **`tests/` direktorij postoji ako paket ima `pytest` dep** (Optional-INFO) — recipročan check sa invariantom 2; paket koji deklariše `pytest` ali nema `tests/` dir je dead-dependency signal.

  **Per-paket parsing**: regex za `pytest.ini` (`^\[pytest\]`), `setup.cfg` (`^\[tool:pytest\]`), i `pyproject.toml` (`^\[tool\.pytest\.ini_options\]`); ekstrakcija `testpaths`, `pythonpath`, `addopts` preko key=value regex-a. Ne izvršava `pytest --collect-only` (to bi zahtevalo Python interpreter); samo statička validacija.

  **Tabela poređenja sa drugim Python + Node audit slojevima**:

  | Audit | Talas | Sloj | Fokus |
  |-------|-------|------|-------|
  | `check-tsconfig-consistency.ps1` | 87 | TypeScript | `tsconfig.json` (`strict`, `target`, `skipLibCheck`, `esModuleInterop`) |
  | `check-eslint-consistency.ps1` | 91 | Node — lint config | `.eslintrc.*` (root, parser, plugin) |
  | `check-python-package-consistency.ps1` | 101 | Python — `requirements.txt` | Pinning convention, shared dep drift, pytest.ini presence (INFO) |
  | `check-pytest-config-consistency.ps1` (ovaj) | 103 | Python — testing config | pytest.ini / pyproject.toml [tool.pytest] / setup.cfg [tool:pytest] presence + zdravlje |

  Talas 87 + 91 (TS/lint config) + Talas 101 + 103 (Python deps + testing config) zajedno pokrivaju **structural config audit u 4 sloja**.

  **Talas 79 + 94 + 96 + 98 + 101 + 103** zajedno pokrivaju **monorepo dependency + config management u 6 audit slojeva** preko Node + Python paketa.

  Read-only audit: ne menja fajlove. **Nije** deo CI mirror-a (`verify-monorepo.ps1` job **`python`** / required check **`Python (Doslednost dok + pytest)`** — `docs/GIT-BRANCH-PROTECTION.md`). Dopuna pre-PR pregleda; smoke (HTTP) i bundled `npm run smoke:all`: `scripts/smoke-stack.ps1` + `atina-platform/atina/docs/operations/release-gate-checklist.md` (*Local notes — Smoke tests*).

.PARAMETER FailOnWarn
  Vraća exit 1 ako bilo koji od 6 strukturalnih invarijanti prijavi WARN. Bez ove opcije, uvek vraća 0 (skripta je informativna).

.PARAMETER MaxOutput
  Maksimalan broj redova u Detalji sekciji. Default 200.

.PARAMETER PythonRoots
  Lista relativnih putanja do Python paketa. Default je 3 lokacije monorepa. Parametrizovan radi testiranja.

.EXAMPLE
  .\scripts\check-pytest-config-consistency.ps1
  # Default: skenira 3 Python paketa, prijavljuje WARN/INFO nalaze, exit 0 uvek.

.EXAMPLE
  .\scripts\check-pytest-config-consistency.ps1 -FailOnWarn
  # Strogi rezim: exit 1 ako bilo koji invariant fail-uje.

.EXAMPLE
  .\scripts\check-pytest-config-consistency.ps1 -PythonRoots @('.', 'sistem_naplate')
  # Custom subset za testiranje (samo 2 paketa).

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 103 = ovaj skript; ukupno 39 koraka Talas 65-192).
  Pun verify (CI mirror): `scripts/verify-monorepo.ps1` (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — `docs/GIT-BRANCH-PROTECTION.md`; pun mirror uključuje `apps/omnigroup-web` build osim sa `-SkipOmnigroupWeb`).
  Smoke (HTTP) i bundled `npm run smoke:all`: `scripts/smoke-stack.ps1` + `atina-platform/atina/docs/operations/release-gate-checklist.md` (*Local notes — Smoke tests*).
  Vlasnik dashboard: `docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md`.
  Vlasnik akcije konsolidovane: `docs/OWNER-ACTION-CHECKLIST.md` (Talas 102, P0/P1/P2/P3 prioritetizacija svih 11 realnih WARN signala).
  Monorepo evidencija (indeks + dry-run): `docs/EVIDENCE-INDEX.md` i `docs/NIVO-1-DRYRUN-LOG.md`.
#>
#Requires -Version 5.1

[CmdletBinding()]
param(
  [switch]$FailOnWarn,
  [int]$MaxOutput = 200,
  [string[]]$PythonRoots = @(
    '.',
    'sistem_naplate',
    'tools/youtube-pipeline'
  )
)

$ErrorActionPreference = 'Stop'

Write-Host "== check-pytest-config-consistency.ps1 - Python testing config doslednost (Talas 103) ==" -ForegroundColor Cyan
Write-Host "   FailOnWarn: $FailOnWarn"
Write-Host ""

# --- Helper: parsira pytest.ini / setup.cfg / pyproject.toml ---

function Get-PytestConfigAnalysis {
  param(
    [Parameter(Mandatory)] [string]$RootPath
  )

  $result = [pscustomobject]@{
    Root            = $RootPath
    HasTestsDir     = $false
    HasConftest     = $false
    HasPytestIni    = $false
    HasSetupCfg     = $false
    HasPyprojectToml= $false
    ConfigSource    = $null   # 'pytest.ini' | 'setup.cfg' | 'pyproject.toml' | $null
    ConfigPath      = $null
    HasTestpaths    = $false
    HasPythonpath   = $false
    HasAddopts      = $false
    HasMarkers      = $false
    HasPytestDep    = $false
    HasSrcDir       = $false
    Errors          = @()
  }

  if (-not (Test-Path $RootPath -PathType Container)) {
    $result.Errors += "Root direktorijum ne postoji: $RootPath"
    return $result
  }

  # tests/ dir
  $testsPath = Join-Path $RootPath 'tests'
  if (Test-Path $testsPath -PathType Container) {
    $result.HasTestsDir = $true
    $conftestPath = Join-Path $testsPath 'conftest.py'
    if (Test-Path $conftestPath -PathType Leaf) { $result.HasConftest = $true }
  }

  # src/ dir (heuristika za pythonpath)
  $srcPath = Join-Path $RootPath 'src'
  if (Test-Path $srcPath -PathType Container) {
    $result.HasSrcDir = $true
  }

  # pytest.ini
  $iniPath = Join-Path $RootPath 'pytest.ini'
  if (Test-Path $iniPath -PathType Leaf) {
    $result.HasPytestIni = $true
    $result.ConfigSource = 'pytest.ini'
    $result.ConfigPath = $iniPath
  }

  # setup.cfg
  $cfgPath = Join-Path $RootPath 'setup.cfg'
  if (Test-Path $cfgPath -PathType Leaf) {
    $result.HasSetupCfg = $true
    if (-not $result.ConfigSource) {
      $cfgRaw = Get-Content $cfgPath -Raw -Encoding UTF8
      if ($cfgRaw -match '(?m)^\[tool:pytest\]') {
        $result.ConfigSource = 'setup.cfg'
        $result.ConfigPath = $cfgPath
      }
    }
  }

  # pyproject.toml
  $tomlPath = Join-Path $RootPath 'pyproject.toml'
  if (Test-Path $tomlPath -PathType Leaf) {
    $result.HasPyprojectToml = $true
    if (-not $result.ConfigSource) {
      $tomlRaw = Get-Content $tomlPath -Raw -Encoding UTF8
      if ($tomlRaw -match '(?m)^\[tool\.pytest\.ini_options\]') {
        $result.ConfigSource = 'pyproject.toml'
        $result.ConfigPath = $tomlPath
      }
    }
  }

  # Parsiraj config (pytest.ini / setup.cfg / pyproject.toml)
  if ($result.ConfigSource -and $result.ConfigPath) {
    $cfgRaw = Get-Content $result.ConfigPath -Raw -Encoding UTF8

    # Lociraj odgovarajuću sekciju
    $sectionPattern = switch ($result.ConfigSource) {
      'pytest.ini'      { '(?ms)^\[pytest\][\r\n]+(.+?)(?=^\[|\Z)' }
      'setup.cfg'       { '(?ms)^\[tool:pytest\][\r\n]+(.+?)(?=^\[|\Z)' }
      'pyproject.toml'  { '(?ms)^\[tool\.pytest\.ini_options\][\r\n]+(.+?)(?=^\[|\Z)' }
    }

    if ($cfgRaw -match $sectionPattern) {
      $section = $Matches[1]
      if ($section -match '(?m)^\s*testpaths\s*=') { $result.HasTestpaths = $true }
      if ($section -match '(?m)^\s*pythonpath\s*=') { $result.HasPythonpath = $true }
      if ($section -match '(?m)^\s*addopts\s*=') { $result.HasAddopts = $true }
      if ($section -match '(?m)^\s*markers\s*=') { $result.HasMarkers = $true }
    }
  }

  # pytest dep u requirements.txt (može biti i requirements-dev.txt)
  foreach ($reqName in @('requirements.txt', 'requirements-dev.txt')) {
    $reqPath = Join-Path $RootPath $reqName
    if (Test-Path $reqPath -PathType Leaf) {
      $reqRaw = Get-Content $reqPath -Raw -Encoding UTF8
      if ($reqRaw -match '(?m)^\s*pytest\s*[<>=!~]') {
        $result.HasPytestDep = $true
        break
      }
    }
  }

  return $result
}

# --- Glavna petlja ---

$findings = [System.Collections.Generic.List[pscustomobject]]::new()
$packageInfo = [System.Collections.Generic.List[pscustomobject]]::new()

foreach ($pyRoot in $PythonRoots) {
  $analysis = Get-PytestConfigAnalysis -RootPath $pyRoot
  $packageInfo.Add($analysis) | Out-Null

  if ($analysis.Errors.Count -gt 0) {
    foreach ($err in $analysis.Errors) {
      $findings.Add([pscustomobject]@{
        Root     = $pyRoot
        Severity = 'WARN'
        Code     = 'ROOT-NOT-FOUND'
        Message  = $err
      }) | Out-Null
    }
    continue
  }

  $hasAnyConfig = $analysis.ConfigSource -ne $null

  # Invariant 1: Testing config postoji ako tests/ postoji (Required-WARN)
  if ($analysis.HasTestsDir -and -not $hasAnyConfig) {
    $findings.Add([pscustomobject]@{
      Root     = $pyRoot
      Severity = 'WARN'
      Code     = 'TESTS-WITHOUT-CONFIG'
      Message  = "tests/ direktorijum postoji ali nema pytest.ini / pyproject.toml [tool.pytest.ini_options] / setup.cfg [tool:pytest] - test discovery koristi defaults"
    }) | Out-Null
  }

  # Invariant 2: pytest dep u requirements ako paket ima tests/ (Optional-INFO)
  if ($analysis.HasTestsDir -and -not $analysis.HasPytestDep) {
    $findings.Add([pscustomobject]@{
      Root     = $pyRoot
      Severity = 'INFO'
      Code     = 'TESTS-WITHOUT-PYTEST-DEP'
      Message  = "tests/ direktorijum postoji ali pytest nije eksplicitno u requirements.txt / requirements-dev.txt (oslanja se na inherit ili global install)"
    }) | Out-Null
  }

  # Invariant 3: testpaths definisan (Optional-INFO)
  if ($hasAnyConfig -and -not $analysis.HasTestpaths) {
    $findings.Add([pscustomobject]@{
      Root     = $pyRoot
      Severity = 'INFO'
      Code     = 'NO-TESTPATHS'
      Message  = "$($analysis.ConfigSource) bez testpaths= - pytest skenira ceo paket umesto fokusiran tests/ dir"
    }) | Out-Null
  }

  # Invariant 4: pythonpath definisan ako paket ima src/ (Optional-INFO)
  if ($analysis.HasSrcDir -and $hasAnyConfig -and -not $analysis.HasPythonpath) {
    $findings.Add([pscustomobject]@{
      Root     = $pyRoot
      Severity = 'INFO'
      Code     = 'NO-PYTHONPATH-WITH-SRC'
      Message  = "src/ direktorij postoji ali $($analysis.ConfigSource) nema pythonpath= - 'from mymodule import ...' u testovima moze fail-ovati"
    }) | Out-Null
  }

  # Invariant 5: addopts za enhanced setup (Optional-INFO)
  if ($hasAnyConfig -and -not $analysis.HasAddopts) {
    $findings.Add([pscustomobject]@{
      Root     = $pyRoot
      Severity = 'INFO'
      Code     = 'NO-ADDOPTS'
      Message  = "$($analysis.ConfigSource) bez addopts= - razmotri --strict-markers / -ra / --cov za production-ready setup"
    }) | Out-Null
  }

  # Invariant 6: tests/ dir ako paket ima pytest dep (Optional-INFO)
  if ($analysis.HasPytestDep -and -not $analysis.HasTestsDir) {
    $findings.Add([pscustomobject]@{
      Root     = $pyRoot
      Severity = 'INFO'
      Code     = 'PYTEST-DEP-WITHOUT-TESTS'
      Message  = "pytest u requirements ali tests/ direktorij ne postoji - dead-dependency signal"
    }) | Out-Null
  }
}

# --- Sumarna tabela ---

Write-Host ""
Write-Host "== Per-paket pytest config analiza ==" -ForegroundColor Yellow
$summaryRows = foreach ($info in $packageInfo) {
  [pscustomobject]@{
    Root         = $info.Root
    'TestsDir'   = if ($info.HasTestsDir) { 'Yes' } else { '-' }
    'Conftest'   = if ($info.HasConftest) { 'Yes' } else { '-' }
    'Config'     = if ($info.ConfigSource) { $info.ConfigSource } else { '-' }
    'TestPaths'  = if ($info.HasTestpaths) { 'Yes' } else { '-' }
    'PythonPath' = if ($info.HasPythonpath) { 'Yes' } else { '-' }
    'Addopts'    = if ($info.HasAddopts) { 'Yes' } else { '-' }
    'PytestDep'  = if ($info.HasPytestDep) { 'Yes' } else { '-' }
    'SrcDir'     = if ($info.HasSrcDir) { 'Yes' } else { '-' }
  }
}
$summaryRows | Format-Table -AutoSize | Out-String | Write-Host

# --- Findings ---

$warnFindings = @($findings | Where-Object { $_.Severity -eq 'WARN' })
$infoFindings = @($findings | Where-Object { $_.Severity -eq 'INFO' })

Write-Host ""
Write-Host "== Findings ==" -ForegroundColor Yellow
Write-Host "  WARN (testing-rizik):     $($warnFindings.Count)"
Write-Host "  INFO (best practice):     $($infoFindings.Count)"
Write-Host ""

if ($findings.Count -gt 0) {
  Write-Host "== Detalji ==" -ForegroundColor Yellow
  $shown = 0
  foreach ($f in $findings) {
    if ($shown -ge $MaxOutput) { Write-Host "  ... (presečeno na $MaxOutput, koristite -MaxOutput za više)"; break }
    $color = if ($f.Severity -eq 'WARN') { 'Red' } else { 'DarkGray' }
    Write-Host ("  [{0,-4}] {1,-32} {2}: {3}" -f $f.Severity, $f.Code, $f.Root, $f.Message) -ForegroundColor $color
    $shown++
  }
}

Write-Host ""
Write-Host "Napomene:" -ForegroundColor DarkGray
Write-Host "  - Talas 103 dopuna Talas 101 (Python requirements.txt); zajedno daju 2-slojni Python audit (deps + testing config)."
Write-Host "  - Paralela Talas 87 (tsconfig.json) za Python; structural config audit u 4 sloja (TS + lint + Python deps + Python testing config)."
Write-Host "  - run-all-audits.ps1: 39 koraka (37 read-only + TODO + npm); single entry point."
Write-Host "  - Vlasnik akcije konsolidovane: docs/OWNER-ACTION-CHECKLIST.md (Talas 102, P0/P1/P2/P3 prioritetizacija)."

# --- Exit code ---

if ($FailOnWarn -and $warnFindings.Count -gt 0) {
  Write-Host ""
  Write-Host "FAIL: $($warnFindings.Count) WARN nalaza pronađeno (FailOnWarn rezim)" -ForegroundColor Red
  exit 1
}

exit 0
