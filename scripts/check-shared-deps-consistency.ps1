<#
.SYNOPSIS
  Shared `dependencies` (regular, ne devDependencies) drift detekcija preko 3 Node paketa (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 106: **paralela Talas 101 (Python `requirements.txt` shared deps drift) za Node ekosistem**; **dopuna Talas 96** koji pokriva samo `devDependencies` MAJOR — Talas 106 dopunjava sa `dependencies` (runtime deps koje idu u prod build) sa preciznom klasifikacijom drift-a (MAJOR / MINOR / PATCH); zajedno daju **monorepo dependency management u 7 audit slojeva** (Talas 79+94+96+98+101+103+106) preko Node + Python paketa. Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa skenira **3 Node paketa** (apps/omnigroup-web + atina-platform/atina + atina-system) i validira **5 strukturalnih invarijanti** za shared `dependencies` (regular, runtime) preko paketa:

  - **`apps/omnigroup-web/`** (Next 14 + Tailwind) — runtime deps: framer-motion, lucide-react, next, react, react-dom (5 deps).
  - **`atina-platform/atina/`** (Express + Forge SaaS) — runtime deps: 23 deps (axios, bcryptjs, bull, compression, cors, dotenv, express, helmet, jsonwebtoken, morgan, nodemailer, pg, redis, sqlite3, stripe, swagger-ui-express, uuid, winston, zod, ...).
  - **`atina-system/`** (NestJS) — runtime deps: 23 deps (@nestjs/*, bcrypt, bullmq, class-transformer, class-validator, dotenv, helmet, ioredis, passport, pg, reflect-metadata, rxjs, typeorm, uuid, ...).

  **5 strukturalnih invarijanti:**

  1. **Shared dep MAJOR drift** (Required-WARN) — kad je dep prisutan u 2+ paketa sa različitim MAJOR-em (npr. `uuid ^9.0.0` vs `uuid ^13.0.0`); v9 vs v13 može imati breaking API changes — `uuid.v4()` API je stabilan ali default export se mogao menjati. **Realan deploy-rizik signal.**
  2. **Shared dep MINOR drift** (Optional-INFO) — kad je dep u 2+ paketa sa istim MAJOR ali različitim MINOR-em (npr. `pg ^8.11.3` vs `pg ^8.20.0`); v8.11 vs v8.20 može imati nove feature-e ali bez breaking changes — vredno informativnog signala da bi vlasnik mogao sinhronizovati.
  3. **Shared dep PATCH drift** (Optional-INFO) — kad je dep u 2+ paketa sa istim MAJOR.MINOR ali različitim PATCH-em (npr. `dotenv ^16.3.1` vs `dotenv ^16.4.7`); patch je sigurniji ali svejedno lepo videti drift.
  4. **Shared dep prefix mismatch** (Optional-INFO) — kad je dep u 2+ paketa sa različitim semver prefiksom (`^` vs `~` vs exact); `^` dozvoljava MINOR upgrade, `~` samo PATCH, exact pin nijedan; mismatch znači različite update strategije preko paketa.
  5. **Reproducibility statistika** (informativna sumarna tabela) — broj per-paket `dependencies` + ukupni broj jedinstvenih deps + broj shared deps + breakdown drift po kategoriji.

  **Per-paket parsing**: native PS5.1 `ConvertFrom-Json` na `package.json` `dependencies` bloku (regularni runtime deps); ne čita `devDependencies` (Talas 96 pokriva to). **Cross-paket aggregation**: `Group-Object` po dep-name-u, filter na `Count >= 2`, klasifikacija drift-a kroz regex `^[\^~]?(\d+)\.(\d+)\.(\d+)` (extract MAJOR, MINOR, PATCH).

  **Tabela poređenja sa drugim dependency management audit slojevima**:

  | Audit | Talas | Sloj | Fokus |
  |-------|-------|------|-------|
  | `check-package-json-consistency.ps1` | 79 | Node metapodaci | engines.node, license, private |
  | `check-package-scripts-consistency.ps1` | 94 | Node scripts | test/lint/build/start/dev/format |
  | `check-dev-deps-versions-consistency.ps1` | 96 | Node devDependencies MAJOR | typescript, eslint, @types/node, @typescript-eslint/parser+eslint-plugin, prettier |
  | `check-package-lock-presence.ps1` | 98 | Node lock fajlovi | package-lock.json presence + reproducibility |
  | `check-python-package-consistency.ps1` | 101 | Python deps | requirements.txt pinning, shared dep drift |
  | `check-pytest-config-consistency.ps1` | 103 | Python testing config | pytest.ini / pyproject.toml [tool.pytest] |
  | `check-shared-deps-consistency.ps1` (ovaj) | 106 | Node `dependencies` runtime drift | shared dep MAJOR / MINOR / PATCH / prefix drift |

  **Talas 79 + 94 + 96 + 98 + 101 + 103 + 106** zajedno daju **monorepo dependency + config management u 7 audit slojeva** preko Node + Python paketa.

  **Cross-check sa Talas 101 (Python paralela)**: Python audit je već detektovao `requests` MAJOR drift preko 3 paketa + `fpdf2` drift preko 2 paketa; Node audit (Talas 106) sad pokriva istu vrstu signala za Node ekosistem.

  Read-only audit: ne menja fajlove. **Nije** deo CI mirror-a (`verify-monorepo.ps1` job **`python`** / required check **`Python (Doslednost dok + pytest)`** — `docs/GIT-BRANCH-PROTECTION.md`). Dopuna pre-PR pregleda; smoke (HTTP) i bundled `npm run smoke:all`: `scripts/smoke-stack.ps1` + `atina-platform/atina/docs/operations/release-gate-checklist.md` (*Local notes — Smoke tests*).

.PARAMETER FailOnWarn
  Vraća exit 1 ako bilo koji od 5 strukturalnih invarijanti prijavi WARN. Bez ove opcije, uvek vraća 0 (skripta je informativna).

.PARAMETER MaxOutput
  Maksimalan broj redova u Detalji sekciji. Default 200.

.PARAMETER NodePaths
  Lista relativnih putanja do Node paketa. Default je 3 paketa monorepa. Parametrizovan radi testiranja.

.EXAMPLE
  .\scripts\check-shared-deps-consistency.ps1
  # Default: skenira 3 Node paketa, prijavljuje WARN/INFO nalaze, exit 0 uvek.

.EXAMPLE
  .\scripts\check-shared-deps-consistency.ps1 -FailOnWarn
  # Strogi rezim: exit 1 ako bilo koji invariant fail-uje.

.EXAMPLE
  .\scripts\check-shared-deps-consistency.ps1 -NodePaths @('atina-platform/atina', 'atina-system')
  # Custom subset za testiranje (samo 2 Express + Nest paketa).

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 106 = ovaj skript; ukupno 39 koraka Talas 65-192).
  Pun verify (CI mirror): `scripts/verify-monorepo.ps1` (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — `docs/GIT-BRANCH-PROTECTION.md`; pun mirror uključuje `apps/omnigroup-web` build osim sa `-SkipOmnigroupWeb`).
  Smoke (HTTP) i bundled `npm run smoke:all`: `scripts/smoke-stack.ps1` + `atina-platform/atina/docs/operations/release-gate-checklist.md` (*Local notes — Smoke tests*).
  Vlasnik dashboard: `docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md`.
  Vlasnik akcije konsolidovane: `docs/OWNER-ACTION-CHECKLIST.md` (Talas 102; Talas 106 dodaje P1-H za `uuid` MAJOR drift v9 vs v13).
  Monorepo evidencija (indeks + dry-run): `docs/EVIDENCE-INDEX.md` i `docs/NIVO-1-DRYRUN-LOG.md`.
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

Write-Host "== check-shared-deps-consistency.ps1 - Shared dependencies runtime drift (Talas 106) ==" -ForegroundColor Cyan
Write-Host "   FailOnWarn: $FailOnWarn"
Write-Host ""

# --- Helper: parsira semver string u MAJOR/MINOR/PATCH komponente ---

function Get-SemverComponents {
  param([string]$Version)

  $result = [pscustomobject]@{
    Original = $Version
    Prefix   = ''
    Major    = $null
    Minor    = $null
    Patch    = $null
    Valid    = $false
  }

  if ($Version -match '^([\^~])?(\d+)\.(\d+)\.(\d+)') {
    $result.Prefix = if ($Matches[1]) { $Matches[1] } else { '' }
    $result.Major  = [int]$Matches[2]
    $result.Minor  = [int]$Matches[3]
    $result.Patch  = [int]$Matches[4]
    $result.Valid  = $true
  } elseif ($Version -match '^([\^~])?(\d+)\.(\d+)') {
    $result.Prefix = if ($Matches[1]) { $Matches[1] } else { '' }
    $result.Major  = [int]$Matches[2]
    $result.Minor  = [int]$Matches[3]
    $result.Patch  = 0
    $result.Valid  = $true
  } elseif ($Version -match '^([\^~])?(\d+)') {
    $result.Prefix = if ($Matches[1]) { $Matches[1] } else { '' }
    $result.Major  = [int]$Matches[2]
    $result.Minor  = 0
    $result.Patch  = 0
    $result.Valid  = $true
  }

  return $result
}

# --- Helper: per-paket runtime dependencies analiza ---

function Get-PackageDependencies {
  param(
    [Parameter(Mandatory)] [string]$RootPath
  )

  $result = [pscustomobject]@{
    Root         = $RootPath
    HasPackageJson = $false
    Dependencies = @{}
    DepsCount    = 0
    Errors       = @()
  }

  if (-not (Test-Path $RootPath -PathType Container)) {
    $result.Errors += "Paket direktorijum ne postoji: $RootPath"
    return $result
  }

  $pkgPath = Join-Path $RootPath 'package.json'
  if (-not (Test-Path $pkgPath -PathType Leaf)) {
    $result.Errors += "package.json ne postoji: $pkgPath"
    return $result
  }

  $result.HasPackageJson = $true

  try {
    $pkg = Get-Content $pkgPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($pkg.dependencies) {
      foreach ($prop in $pkg.dependencies.PSObject.Properties) {
        $result.Dependencies[$prop.Name] = "$($prop.Value)"
      }
      $result.DepsCount = $result.Dependencies.Count
    }
  } catch {
    $result.Errors += "package.json parsing fail: $_"
  }

  return $result
}

# --- Glavna petlja ---

$findings = [System.Collections.Generic.List[pscustomobject]]::new()
$packageInfo = [System.Collections.Generic.List[pscustomobject]]::new()
$allDepsByName = @{}  # ime -> array of { Root, Version }

foreach ($pkgPath in $NodePaths) {
  $analysis = Get-PackageDependencies -RootPath $pkgPath
  $packageInfo.Add($analysis) | Out-Null

  if ($analysis.Errors.Count -gt 0) {
    foreach ($err in $analysis.Errors) {
      $findings.Add([pscustomobject]@{
        Root     = $pkgPath
        Severity = 'WARN'
        Code     = 'PARSE-ERROR'
        Message  = $err
      }) | Out-Null
    }
    continue
  }

  foreach ($depName in $analysis.Dependencies.Keys) {
    $version = $analysis.Dependencies[$depName]
    if (-not $allDepsByName.ContainsKey($depName)) {
      $allDepsByName[$depName] = @()
    }
    $allDepsByName[$depName] += [pscustomobject]@{
      Root    = $pkgPath
      Version = $version
    }
  }
}

# --- Cross-paket drift detection ---

$sharedDepsCount = 0
$majorDrift = 0
$minorDrift = 0
$patchDrift = 0
$prefixDrift = 0
$exactMatch = 0

foreach ($depName in ($allDepsByName.Keys | Sort-Object)) {
  $occurrences = $allDepsByName[$depName]
  if ($occurrences.Count -lt 2) { continue }

  $sharedDepsCount++

  $components = $occurrences | ForEach-Object {
    $semver = Get-SemverComponents -Version $_.Version
    [pscustomobject]@{
      Root    = $_.Root
      Version = $_.Version
      Semver  = $semver
    }
  }

  $majors  = @($components | Where-Object { $_.Semver.Valid } | ForEach-Object { $_.Semver.Major } | Select-Object -Unique)
  $minors  = @($components | Where-Object { $_.Semver.Valid } | ForEach-Object { "$($_.Semver.Major).$($_.Semver.Minor)" } | Select-Object -Unique)
  $patches = @($components | Where-Object { $_.Semver.Valid } | ForEach-Object { "$($_.Semver.Major).$($_.Semver.Minor).$($_.Semver.Patch)" } | Select-Object -Unique)
  $prefixes = @($components | Where-Object { $_.Semver.Valid } | ForEach-Object { $_.Semver.Prefix } | Select-Object -Unique)

  $detail = ($components | ForEach-Object { "$($_.Root)=$($_.Version)" }) -join ', '

  if ($majors.Count -gt 1) {
    $majorDrift++
    $findings.Add([pscustomobject]@{
      Root     = '(cross-package)'
      Severity = 'WARN'
      Code     = 'SHARED-DEP-MAJOR-DRIFT'
      Message  = "$depName MAJOR drift: $detail"
    }) | Out-Null
  } elseif ($minors.Count -gt 1) {
    $minorDrift++
    $findings.Add([pscustomobject]@{
      Root     = '(cross-package)'
      Severity = 'INFO'
      Code     = 'SHARED-DEP-MINOR-DRIFT'
      Message  = "$depName MINOR drift: $detail"
    }) | Out-Null
  } elseif ($patches.Count -gt 1) {
    $patchDrift++
    $findings.Add([pscustomobject]@{
      Root     = '(cross-package)'
      Severity = 'INFO'
      Code     = 'SHARED-DEP-PATCH-DRIFT'
      Message  = "$depName PATCH drift: $detail"
    }) | Out-Null
  } elseif ($prefixes.Count -gt 1) {
    $prefixDrift++
    $findings.Add([pscustomobject]@{
      Root     = '(cross-package)'
      Severity = 'INFO'
      Code     = 'SHARED-DEP-PREFIX-MISMATCH'
      Message  = "$depName prefix drift: $detail"
    }) | Out-Null
  } else {
    $exactMatch++
  }
}

# --- Sumarna tabela ---

Write-Host ""
Write-Host "== Per-paket dependencies analiza ==" -ForegroundColor Yellow
$summaryRows = foreach ($info in $packageInfo) {
  [pscustomobject]@{
    Root          = $info.Root
    'PackageJson' = if ($info.HasPackageJson) { 'Yes' } else { '-' }
    'DepsCount'   = $info.DepsCount
  }
}
$summaryRows | Format-Table -AutoSize | Out-String | Write-Host

$totalUniqueDeps = $allDepsByName.Keys.Count

Write-Host "Cross-paket statistika:" -ForegroundColor Yellow
Write-Host ("  Jedinstvenih dep-ova ukupno:    {0}" -f $totalUniqueDeps)
Write-Host ("  Shared dep-ova (u 2+ paketa):   {0}" -f $sharedDepsCount)
Write-Host ("    - Exact match (sve verzije):  {0}" -f $exactMatch)
Write-Host ("    - MAJOR drift (WARN):         {0}" -f $majorDrift)
Write-Host ("    - MINOR drift (INFO):         {0}" -f $minorDrift)
Write-Host ("    - PATCH drift (INFO):         {0}" -f $patchDrift)
Write-Host ("    - Prefix mismatch (INFO):     {0}" -f $prefixDrift)
Write-Host ""

# --- Findings ---

$warnFindings = @($findings | Where-Object { $_.Severity -eq 'WARN' })
$infoFindings = @($findings | Where-Object { $_.Severity -eq 'INFO' })

Write-Host "== Findings ==" -ForegroundColor Yellow
Write-Host "  WARN (deploy-rizik):      $($warnFindings.Count)"
Write-Host "  INFO (best practice):     $($infoFindings.Count)"
Write-Host ""

if ($findings.Count -gt 0) {
  Write-Host "== Detalji ==" -ForegroundColor Yellow
  $shown = 0
  foreach ($f in $findings) {
    if ($shown -ge $MaxOutput) { Write-Host "  ... (presečeno na $MaxOutput, koristite -MaxOutput za više)"; break }
    $color = if ($f.Severity -eq 'WARN') { 'Red' } else { 'DarkGray' }
    Write-Host ("  [{0,-4}] {1,-30} {2}" -f $f.Severity, $f.Code, $f.Message) -ForegroundColor $color
    $shown++
  }
}

Write-Host ""
Write-Host "Napomene:" -ForegroundColor DarkGray
Write-Host "  - Talas 106 paralela Talas 101 (Python) za Node ekosistem; dopuna Talas 96 (devDeps MAJOR)."
Write-Host "  - Talas 79+94+96+98+101+103+106 zajedno daju monorepo dependency management u 7 audit slojeva."
Write-Host "  - run-all-audits.ps1: 39 koraka (37 read-only + TODO + npm); single entry point."
Write-Host "  - Vlasnik akcije konsolidovane: docs/OWNER-ACTION-CHECKLIST.md (P0/P1/P2/P3 prioritetizacija)."

# --- Exit code ---

if ($FailOnWarn -and $warnFindings.Count -gt 0) {
  Write-Host ""
  Write-Host "FAIL: $($warnFindings.Count) WARN nalaza pronađeno (FailOnWarn rezim)" -ForegroundColor Red
  exit 1
}

exit 0
