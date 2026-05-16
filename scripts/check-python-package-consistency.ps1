<#
.SYNOPSIS
  `requirements.txt` doslednost preko 3 Python lokacija (root + sistem_naplate + tools/youtube-pipeline) (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 101: **prvi audit Python sloja** — paralela Talas 79 + 94 + 96 + 98 (Node `package.json` + scripts + dev-deps + lock); pre Talas 101 sva 4 sloja `package.json` audit-a su pokrivala samo Node pakete, dok je Python kod (root forge/atina/astra + sistem_naplate + tools/youtube-pipeline) ostao bez automatizovanog skenera za pinning convention, shared dependency version drift, i pytest.ini presence. Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa skenira **3 Python lokacije** i validira **7 strukturalnih invarijanti** za Python pakete:

  - **Root** (`requirements.txt`) — Python `forge` / `atina` / `astra` stack (Flask + Gunicorn + fpdf2 + requests + pytest); povezan sa `pytest.ini` u korenu i `tests/` direktorijum.
  - **`sistem_naplate/`** (`requirements.txt`) — Standalone billing skripte (fpdf2 + requests).
  - **`tools/youtube-pipeline/`** (`requirements.txt`) — Celery worker za YouTube pipeline (celery + redis + moviepy + ffmpeg-python + Pillow + numpy + tqdm).

  **7 strukturalnih invarijanti:**

  1. **`requirements.txt` postoji** (Required-WARN) — Python paket bez `requirements.txt` ne može garantovati reproduktibilan `pip install`.
  2. **`requirements.txt` non-empty + bar 1 dependency** (Required-WARN) — prazan fajl je ekvivalentan ne-postojanju; minimum 1 valid `name==version` ili `name>=version` linija.
  3. **Pinning convention konzistencija** (Optional-INFO) — paket treba dosledno koristiti **`==` exact** (najbezbednije za production / CI) ili **`>=` floor** (najfleksibilnije za library); **mixed pinning u istom fajlu** podiže INFO. Cross-paket mismatch (jedan paket `==`, drugi `>=`) takođe je INFO za vlasnika.
  4. **Shared dependency version drift preko paketa** (Optional-INFO; **kritičan signal**) — ako `requests` (ili `fpdf2`, ili druge zajedničke biblioteke) postoji u 2+ Python paketa sa različitim verzijama, vlasnik dobija konkretan signal o **transitive dependency drift-u** koji može izazvati subtilne bugove pri zajedničkom deploy-u (npr. monorepo CI build sva 3 paketa istovremeno).
  5. **`pytest.ini` postoji za pakete sa testovima** (Optional-INFO) — pakete sa `pytest` u `requirements.txt` ili `tests/` direktorijumom treba imati `pytest.ini` / `setup.cfg` / `pyproject.toml` sa `[pytest]` blokom za test discovery konfiguraciju.
  6. **`tests/` direktorij postoji ako paket ima `pytest`** (Optional-INFO) — paket sa `pytest` dependency-em treba imati `tests/` direktorij za test discovery.
  7. **`requirements-dev.txt` ili separate dev deps** (Optional-INFO) — production / dev separation preko `requirements-dev.txt` (sa `-r requirements.txt`) je Python ekvivalent `dependencies` vs `devDependencies` u `package.json`-u; bez ovog, dev tools poput `pytest` se instaliraju u production.

  **Per-paket parsing**: linijski regex `^([a-zA-Z0-9_-]+)([<>=!~]+)([0-9a-zA-Z\.\-]+)` za package=version detekciju; preskače komentare (`#`) i prazne linije; tolerantan na `name`, `name==1.0.0`, `name>=1.0`, `name~=1.0`, `name<=1.0` formate. Ne validira semantiku (samo strukturu) — pip resolver odlučuje stvarne verzije.

  **Tabela poređenja sa Node strukturalnim audit slojevima**:

  | Audit | Talas | Sloj | Fokus |
  |-------|-------|------|-------|
  | `check-package-json-consistency.ps1` | 79 | Node — `package.json` metapodaci | `engines.node`, `license`, `private` |
  | `check-package-scripts-consistency.ps1` | 94 | Node — `package.json` `scripts:` | test, lint, build, start, dev, format |
  | `check-dev-deps-versions-consistency.ps1` | 96 | Node — `package.json` `devDependencies` MAJOR | typescript, eslint, @types/node, TS-ESLint, prettier |
  | `check-package-lock-presence.ps1` | 98 | Node — lock fajlovi | `package-lock.json` / `pnpm-lock.yaml` / `yarn.lock` |
  | `check-python-package-consistency.ps1` (ovaj) | 101 | Python — `requirements.txt` | Pinning convention, shared dep drift, pytest.ini, tests/, requirements-dev.txt |

  Talas 79 + 94 + 96 + 98 + 101 zajedno pokrivaju **monorepo dependency management u 5 audit slojeva** preko Node + Python paketa.

  Read-only audit: ne menja fajlove. **Nije** deo CI mirror-a (`verify-monorepo.ps1` job **`python`** / required check **`Python (Doslednost dok + pytest)`** — `docs/GIT-BRANCH-PROTECTION.md`). Dopuna pre-PR pregleda; smoke (HTTP) i bundled `npm run smoke:all`: `scripts/smoke-stack.ps1` + `atina-platform/atina/docs/operations/release-gate-checklist.md` (*Local notes — Smoke tests*).

.PARAMETER FailOnWarn
  Vraća exit 1 ako bilo koji od 7 strukturalnih invarijanti prijavi WARN. Bez ove opcije, uvek vraća 0 (skripta je informativna).

.PARAMETER MaxOutput
  Maksimalan broj redova u Detalji sekciji. Default 200.

.PARAMETER PythonRoots
  Lista relativnih putanja do Python paketa. Default je 3 lokacije monorepa. Parametrizovan radi testiranja.

.EXAMPLE
  .\scripts\check-python-package-consistency.ps1
  # Default: skenira 3 Python paketa, prijavljuje WARN/INFO nalaze, exit 0 uvek.

.EXAMPLE
  .\scripts\check-python-package-consistency.ps1 -FailOnWarn
  # Strogi rezim: exit 1 ako bilo koji invariant fail-uje.

.EXAMPLE
  .\scripts\check-python-package-consistency.ps1 -PythonRoots @('.', 'sistem_naplate')
  # Custom subset za testiranje (samo 2 paketa).

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 101 = ovaj skript; ukupno 39 koraka Talas 65-192).
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
  [string[]]$PythonRoots = @(
    '.',
    'sistem_naplate',
    'tools/youtube-pipeline'
  )
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

Write-Host '== check-python-package-consistency.ps1 - Python requirements.txt doslednost (informativan) ==' -ForegroundColor Cyan
Write-Host ("   FailOnWarn: {0}" -f $FailOnWarn) -ForegroundColor DarkGray
Write-Host ("   PythonRoots: {0}" -f $PythonRoots.Count) -ForegroundColor DarkGray

# --- Helper: parsiraj requirements.txt ---
function Get-RequirementsAnalysis {
  param([string]$AbsPath)
  $result = [pscustomobject]@{
    Exists       = $false
    NonEmpty     = $false
    DepCount     = 0
    Dependencies = New-Object 'System.Collections.Generic.List[object]'
    PinningExact = 0  # ==
    PinningFloor = 0  # >=
    PinningTilde = 0  # ~=
    PinningOther = 0  # <, <=, >, !=, no-version
    HasMixed     = $false
  }
  if (-not (Test-Path $AbsPath)) { return $result }
  $result.Exists = $true
  $lines = Get-Content -LiteralPath $AbsPath -Encoding UTF8 -ErrorAction SilentlyContinue
  if (-not $lines -or $lines.Count -eq 0) { return $result }

  foreach ($line in $lines) {
    $trim = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($trim) -or $trim.StartsWith('#')) { continue }
    # Match: name (without version), name==1.0, name>=1.0, name~=1.0, name<=1.0, name<1.0, name!=1.0
    if ($trim -match '^([a-zA-Z0-9][a-zA-Z0-9_\-\.]*)\s*([<>=!~]+)?\s*([0-9a-zA-Z\.\-_]+)?') {
      $depName = $Matches[1].ToLower()
      $op      = if ($Matches[2]) { $Matches[2] } else { '' }
      $ver     = if ($Matches[3]) { $Matches[3] } else { '' }
      [void]$result.Dependencies.Add([pscustomobject]@{
        Name = $depName
        Op   = $op
        Ver  = $ver
        Raw  = $trim
      })
      $result.DepCount++
      switch -Regex ($op) {
        '^==$'      { $result.PinningExact++; break }
        '^>=$'      { $result.PinningFloor++; break }
        '^~=$'      { $result.PinningTilde++; break }
        default     { if ($op) { $result.PinningOther++ } else { $result.PinningOther++ } }
      }
    }
  }

  $result.NonEmpty = ($result.DepCount -gt 0)
  # Mixed pinning detection (sa bar 1 == i bar 1 >=)
  $nonZero = 0
  foreach ($c in @($result.PinningExact, $result.PinningFloor, $result.PinningTilde)) {
    if ($c -gt 0) { $nonZero++ }
  }
  $result.HasMixed = ($nonZero -gt 1)

  return $result
}

# --- Skeniraj 3 Python lokacije ---
$results = New-Object 'System.Collections.Generic.List[object]'
$findings = New-Object 'System.Collections.Generic.List[object]'
$allDepsByName = @{}  # name -> list of (Path, Op, Ver)

foreach ($relPath in $PythonRoots) {
  $absPath = Join-Path $repoRoot $relPath
  $reqPath = Join-Path $absPath 'requirements.txt'
  $reqDevPath = Join-Path $absPath 'requirements-dev.txt'
  $pytestIniPath = Join-Path $absPath 'pytest.ini'
  $testsDir = Join-Path $absPath 'tests'

  if (-not (Test-Path $reqPath)) {
    $findings.Add([pscustomobject]@{
      File     = "$relPath/requirements.txt"
      Severity = 'WARN'
      Code     = 'REQUIREMENTS-MISSING'
      Detail   = ("Python paket nema requirements.txt - pip install ne moze garantovati reproduktibilan build")
    }) | Out-Null
    continue
  }

  $analysis = Get-RequirementsAnalysis -AbsPath $reqPath
  $hasPytest = @($analysis.Dependencies | Where-Object { $_.Name -eq 'pytest' }).Count -gt 0
  $hasPytestIni = Test-Path $pytestIniPath
  $hasTestsDir = Test-Path $testsDir
  $hasReqDev = Test-Path $reqDevPath

  $entry = [pscustomobject]@{
    Path           = $relPath
    DepCount       = $analysis.DepCount
    PinningExact   = $analysis.PinningExact
    PinningFloor   = $analysis.PinningFloor
    PinningTilde   = $analysis.PinningTilde
    PinningOther   = $analysis.PinningOther
    HasMixed       = $analysis.HasMixed
    HasPytestDep   = $hasPytest
    HasPytestIni   = $hasPytestIni
    HasTestsDir    = $hasTestsDir
    HasReqDev      = $hasReqDev
  }

  # Akumuliraj zajedničke dep-ove preko paketa
  foreach ($dep in $analysis.Dependencies) {
    if (-not $allDepsByName.ContainsKey($dep.Name)) {
      $allDepsByName[$dep.Name] = New-Object 'System.Collections.Generic.List[object]'
    }
    $allDepsByName[$dep.Name].Add([pscustomobject]@{
      Path = $relPath
      Op   = $dep.Op
      Ver  = $dep.Ver
      Raw  = $dep.Raw
    }) | Out-Null
  }

  # Invariant 2: non-empty + bar 1 dep
  if (-not $analysis.NonEmpty) {
    $findings.Add([pscustomobject]@{
      File     = "$relPath/requirements.txt"
      Severity = 'WARN'
      Code     = 'REQUIREMENTS-EMPTY'
      Detail   = "requirements.txt je prazan ili samo komentari - ekvivalentno ne-postojanju"
    }) | Out-Null
  }

  # Invariant 3a: mixed pinning unutar fajla
  if ($analysis.HasMixed) {
    $findings.Add([pscustomobject]@{
      File     = "$relPath/requirements.txt"
      Severity = 'INFO'
      Code     = 'MIXED-PINNING'
      Detail   = ("Mixed pinning: {0}x '==', {1}x '>=', {2}x '~=' - dosledno koristiti jedan operator za jasnu reproduktibilnost" -f $analysis.PinningExact, $analysis.PinningFloor, $analysis.PinningTilde)
    }) | Out-Null
  }

  # Invariant 5: pytest.ini za pakete sa pytest dep-om ili tests/ dir
  if (($hasPytest -or $hasTestsDir) -and -not $hasPytestIni) {
    # Specijalno: root paket koristi pytest.ini u korenu - to je validno
    if ($relPath -ne '.' -or -not (Test-Path (Join-Path $repoRoot 'pytest.ini'))) {
      $findings.Add([pscustomobject]@{
        File     = "$relPath/pytest.ini"
        Severity = 'INFO'
        Code     = 'NO-PYTEST-INI'
        Detail   = "Python paket sa 'pytest' dep-om ili tests/ dir-om bez pytest.ini - test discovery konfiguracija nedostaje"
      }) | Out-Null
    }
  }

  # Invariant 6: tests/ dir za pakete sa pytest dep-om
  if ($hasPytest -and -not $hasTestsDir) {
    $findings.Add([pscustomobject]@{
      File     = "$relPath/tests/"
      Severity = 'INFO'
      Code     = 'NO-TESTS-DIR'
      Detail   = "Python paket ima 'pytest' dependency ali nema tests/ dir-a - pytest nece imati sta da pokrene"
    }) | Out-Null
  }

  # Invariant 7: requirements-dev.txt za production / dev separation
  if ($hasPytest -and -not $hasReqDev) {
    $findings.Add([pscustomobject]@{
      File     = "$relPath/requirements-dev.txt"
      Severity = 'INFO'
      Code     = 'NO-REQUIREMENTS-DEV'
      Detail   = "Python paket sa 'pytest' u requirements.txt - razmotri requirements-dev.txt za production / dev separation (pytest se inace instalira u production)"
    }) | Out-Null
  }

  $results.Add($entry) | Out-Null
}

# Invariant 4: shared dependency version drift preko paketa
foreach ($depName in $allDepsByName.Keys) {
  $occurrences = $allDepsByName[$depName]
  if ($occurrences.Count -lt 2) { continue }
  $uniqueVersions = $occurrences | ForEach-Object { "$($_.Op)$($_.Ver)" } | Select-Object -Unique
  if ($uniqueVersions.Count -gt 1) {
    $detailParts = @()
    foreach ($occ in $occurrences) {
      $detailParts += ("{0}={1}{2}" -f $occ.Path, $occ.Op, $occ.Ver)
    }
    $findings.Add([pscustomobject]@{
      File     = $depName
      Severity = 'INFO'
      Code     = 'SHARED-DEP-VERSION-DRIFT'
      Detail   = ("'{0}' u {1} paketa sa razlicitim verzijama: {2} - razmotri sinhronizaciju" -f $depName, $occurrences.Count, ($detailParts -join '; '))
    }) | Out-Null
  }
}

# Cross-paket pinning convention check
$exactOnlyPkgs = @($results | Where-Object { $_.PinningExact -gt 0 -and $_.PinningFloor -eq 0 -and $_.PinningTilde -eq 0 })
$floorOnlyPkgs = @($results | Where-Object { $_.PinningFloor -gt 0 -and $_.PinningExact -eq 0 -and $_.PinningTilde -eq 0 })
if ($exactOnlyPkgs.Count -gt 0 -and $floorOnlyPkgs.Count -gt 0) {
  $exactPaths = ($exactOnlyPkgs | ForEach-Object { $_.Path }) -join ', '
  $floorPaths = ($floorOnlyPkgs | ForEach-Object { $_.Path }) -join ', '
  $findings.Add([pscustomobject]@{
    File     = '(cross-paket)'
    Severity = 'INFO'
    Code     = 'CROSS-PKG-PINNING-MISMATCH'
    Detail   = ("Pinning convention drift: '==' samo u [{0}], '>=' samo u [{1}] - razmotri konzistentan stil za sva 3 paketa (== production-safe, >= library-friendly)" -f $exactPaths, $floorPaths)
  }) | Out-Null
}

# --- Sumarni izveštaj ---
$warns = @($findings | Where-Object { $_.Severity -eq 'WARN' })
$infos = @($findings | Where-Object { $_.Severity -eq 'INFO' })

Write-Host ''
Write-Host '== Python paket doslednost rezime ==' -ForegroundColor Cyan
Write-Host ("  Python paketa skenirano:      {0}" -f $results.Count)
Write-Host ("  Dependencies ukupno:          {0}" -f (($results | Measure-Object -Property DepCount -Sum).Sum))
Write-Host ("  WARN (Python-rizik):          {0}" -f $warns.Count)
Write-Host ("  INFO (best practice):         {0}" -f $infos.Count)

# --- Tabela ---
Write-Host ''
Write-Host '== Tabela Python paketa ==' -ForegroundColor Cyan
$results |
  Select-Object Path, DepCount, @{N='Exact';E={$_.PinningExact}}, @{N='Floor';E={$_.PinningFloor}}, @{N='Tilde';E={$_.PinningTilde}}, @{N='Mixed';E={ if ($_.HasMixed) { 'YES' } else { '-' } }}, @{N='Pytest';E={ if ($_.HasPytestDep) { 'Y' } else { '-' } }}, @{N='PytestIni';E={ if ($_.HasPytestIni) { 'Y' } else { '-' } }}, @{N='Tests/';E={ if ($_.HasTestsDir) { 'Y' } else { '-' } }}, @{N='ReqDev';E={ if ($_.HasReqDev) { 'Y' } else { '-' } }} |
  Format-Table -AutoSize | Out-String | Write-Host

# --- Detalji WARN + INFO ---
if ($findings.Count -gt 0) {
  Write-Host '== Detalji nalaza (WARN prvo, INFO posle) ==' -ForegroundColor Cyan
  $sorted = $findings | Sort-Object @{Expression='Severity'; Descending=$false}, File, Code
  $sorted | Select-Object -First $MaxOutput | ForEach-Object {
    $color = if ($_.Severity -eq 'WARN') { 'Yellow' } else { 'DarkGray' }
    Write-Host ("  [{0}] {1} :: {2}" -f $_.Severity, $_.File, $_.Code) -ForegroundColor $color
    Write-Host ("    {0}" -f $_.Detail) -ForegroundColor DarkGray
  }
}

Write-Host ''
Write-Host 'Napomene:' -ForegroundColor DarkGray
Write-Host '  - Talas 79 + 94 + 96 + 98 + 101 zajedno pokrivaju monorepo dependency management u 5 audit slojeva preko Node + Python paketa.'
Write-Host '  - Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md).'
Write-Host '  - Smoke (HTTP) i bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).'
Write-Host '  - Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md (LATEST verify Val 355; smoke Val 351).'
Write-Host '  - Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md i docs/NIVO-1-DRYRUN-LOG.md.'

if ($FailOnWarn -and $warns.Count -gt 0) {
  exit 1
}
exit 0
