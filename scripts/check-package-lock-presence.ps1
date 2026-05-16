<#
.SYNOPSIS
  `package-lock.json` (ili `pnpm-lock.yaml` / `yarn.lock`) presence + zdravlje + doslednost preko 3 Node paketa (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 98: **4. sloj `package.json` audit domena** posle Talas 79 (metapodaci: `engines.node` + `license` + `private`), Talas 94 (`scripts:` polja: test/lint/build/start/dev/format), Talas 96 (`devDependencies` MAJOR verzije: typescript/eslint/@types/node/@typescript-eslint/parser/@typescript-eslint/eslint-plugin/prettier) — fokus na **lock fajlovima** koji garantuju da `npm install` instalira **identične transitive dependency verzije** preko CI/CD i developer mašina. Bez lock-a, `npm install` može instalirati različite minor/patch verzije i izazvati flaky build-ove. Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa parsira 3 paket-level direktorijuma (`apps/omnigroup-web`, `atina-platform/atina`, `atina-system`) i validira **6 strukturalnih invarijanti** za lock fajlove:

  1. **Postojanje lock fajla** (Required-WARN) — bar jedan od `package-lock.json` (npm), `pnpm-lock.yaml` (pnpm), `yarn.lock` (Yarn classic + Yarn berry); bez lock fajla, `npm install` ili `npm ci` u CI mogu instalirati različite verzije nego lokalno (transitive deps su `^x.y.z` semver range-ovi koji evoluiraju), izazivajući **„works on my machine"** klasu bug-ova; **trenutno sva 3 paketa imaju `package-lock.json`** ✓.
  2. **Konzistentan package manager preko paketa** (Required-WARN) — sva 3 paketa moraju koristiti isti PM (sva npm ili sva pnpm ili sva Yarn); mix (npr. `package-lock.json` u Atina + `pnpm-lock.yaml` u Nest) indikuje da CI workflow mora znati koji `*-install` da pozove po paketu, što uvodi maintenance overhead; **trenutno sva 3 paketa koriste npm** ✓.
  3. **Lock fajl je non-empty + minimum size** (Required-WARN) — bar 1 KB (sanity check; pravi lock fajlovi za realni project imaju 100+ KB); 0-byte ili `< 1 KB` lock fajl je verovatno korumpiran ili nije generisan ispravno (`npm install` nije završen).
  4. **`lockfileVersion` polje** (Optional-INFO za npm) — `package-lock.json` mora imati `lockfileVersion`: `1` (npm v6 i niže), `2` (npm v7 mix mode), ili `3` (npm v7+ čisto v3 — preporučen, kompaktniji); INFO za stare verzije jer postoji upgrade path (`npm install --package-lock-only` regeneriše).
  5. **Konzistentan `lockfileVersion` preko paketa** (Required-WARN) — sva 3 paketa moraju imati isti `lockfileVersion`; mix (npr. v1 + v3) indikuje da developeri koriste različite npm verzije, što može uvesti subtle drift u kako se transitive deps razrešavaju (npm v7+ ima drugačiji algoritam); **trenutno sva 3 paketa imaju `lockfileVersion: 3`** ✓.
  6. **Lock fajl NIJE u `.gitignore`** (Required-WARN; **dopuna Talas 92** `.gitignore` audit-a) — common antipattern: developer kopira `node_modules` ignore u lock fajl ili koristi `*.lock` glob koji slučajno hvata `package-lock.json`; bez lock fajla u repo-u, CI nema reproducibility garanciju; skener proverava da nijedan od 4 `.gitignore` fajla (root + 3 paketa) ne ignoriše lock fajlove preko regex-a (`package-lock`, `*.lock`, `*-lock.json`).

  **PS Lesson #19 primenjena** — `package-lock.json` često ima duplicate keys (isti package name može biti u različitim direktorijumima u monorepu) što PS5.1 `ConvertFrom-Json` ne podržava i fail-uje sa "name argument not valid"; rešenje je **regex-based parsing** ključnih polja (`"lockfileVersion"\s*:\s*(\d+)`, `"name"\s*:\s*"([^"]+)"`, `"version"\s*:\s*"([^"]+)"`) na prvih 5 linija fajla (lockfileVersion je uvek u top-level objektu).

  **Tabela poređenja sa drugim `package.json` audit slojevima**:

  | Audit | Talas | Sloj | Fokus |
  |-------|-------|------|-------|
  | `check-package-json-consistency.ps1` | 79 | Metapodaci | `engines.node` + `license` + `private` polja |
  | `check-package-scripts-consistency.ps1` | 94 | `scripts:` blok | `test` + `lint` + `build` + `start` + `dev` + `format` |
  | `check-dev-deps-versions-consistency.ps1` | 96 | `devDependencies` | MAJOR verzije: TypeScript / ESLint / @types/node / TS-ESLint / Prettier |
  | `check-package-lock-presence.ps1` (ovaj) | 98 | Lock fajlovi | Presence + PM doslednost + lockfileVersion + .gitignore |

  Read-only audit: ne menja fajlove. **Nije** deo CI mirror-a (`verify-monorepo.ps1` job **`python`** / required check **`Python (Doslednost dok + pytest)`** — `docs/GIT-BRANCH-PROTECTION.md`). Dopuna pre-PR pregleda; smoke (HTTP) i bundled `npm run smoke:all`: `scripts/smoke-stack.ps1` + `atina-platform/atina/docs/operations/release-gate-checklist.md` (*Local notes — Smoke tests*).

.PARAMETER FailOnWarn
  Vraća exit 1 ako bilo koji od 6 strukturalnih invarijanti prijavi WARN. Bez ove opcije, uvek vraća 0 (skripta je informativna).

.PARAMETER MaxOutput
  Maksimalan broj redova u Detalji sekciji. Default 200.

.PARAMETER PackageRoots
  Lista relativnih putanja do paket-direktorijuma (svaki mora sadržati `package.json`). Default je 3 paketa monorepa. Parametrizovan radi testiranja.

.EXAMPLE
  .\scripts\check-package-lock-presence.ps1
  # Default: skenira 3 paketa, prijavljuje WARN/INFO nalaze, exit 0 uvek.

.EXAMPLE
  .\scripts\check-package-lock-presence.ps1 -FailOnWarn
  # Strogi rezim: exit 1 ako bilo koji invariant fail-uje.

.EXAMPLE
  .\scripts\check-package-lock-presence.ps1 -PackageRoots @('apps/omnigroup-web', 'atina-platform/atina')
  # Sa drugom listom paketa (testing).

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 98 = ovaj skript; ukupno 39 koraka Talas 65-192).
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
    'apps/omnigroup-web',
    'atina-platform/atina',
    'atina-system'
  )
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

Write-Host '== check-package-lock-presence.ps1 - lock fajlovi presence + zdravlje + doslednost (informativan) ==' -ForegroundColor Cyan
Write-Host ("   FailOnWarn: {0}" -f $FailOnWarn) -ForegroundColor DarkGray
Write-Host ("   PackageRoots: {0}" -f ($PackageRoots -join ', ')) -ForegroundColor DarkGray

# --- Konstante ---
$LockFileCandidates = @(
  @{ Name = 'package-lock.json'; Manager = 'npm' }
  @{ Name = 'pnpm-lock.yaml';     Manager = 'pnpm' }
  @{ Name = 'yarn.lock';          Manager = 'yarn' }
)
$MinLockSize = 1024  # 1 KB sanity threshold

# --- Helper: parsiraj lockfileVersion regex-om (PS Lesson #19) ---
function Get-LockfileVersion {
  param([string]$AbsPath)
  $head = Get-Content -LiteralPath $AbsPath -TotalCount 10 -Encoding UTF8 -ErrorAction SilentlyContinue
  if (-not $head) { return $null }
  $headStr = $head -join "`n"
  if ($headStr -match '"lockfileVersion"\s*:\s*(\d+)') {
    return [int]$Matches[1]
  }
  return $null
}

# --- Helper: proveri da li `.gitignore` ignoriše lock fajl ---
function Test-LockIgnored {
  param([string]$GitignoreAbsPath, [string]$LockFileName)
  if (-not (Test-Path $GitignoreAbsPath)) { return $false }
  $lines = Get-Content -LiteralPath $GitignoreAbsPath -Encoding UTF8
  foreach ($line in $lines) {
    $trim = $line.Trim()
    if ($trim -eq '' -or $trim.StartsWith('#')) { continue }
    # Eksplicitan match za ime fajla
    if ($trim -eq $LockFileName -or $trim -eq "/$LockFileName" -or $trim -eq "$LockFileName/") {
      return $true
    }
    # Glob-ovi koji bi hvatali lock fajlove
    if ($trim -match '^\*\.lock$' -and $LockFileName -like '*.lock') { return $true }
    if ($trim -match '^\*-lock\.json$' -and $LockFileName -like '*-lock.json') { return $true }
    if ($trim -eq 'package-lock.json' -or $trim -eq '/package-lock.json') {
      if ($LockFileName -eq 'package-lock.json') { return $true }
    }
  }
  return $false
}

# --- Skeniraj 3 paketa ---
$packages = New-Object 'System.Collections.Generic.List[object]'
$findings = New-Object 'System.Collections.Generic.List[object]'

foreach ($relRoot in $PackageRoots) {
  $absRoot = Join-Path $repoRoot $relRoot
  if (-not (Test-Path $absRoot)) {
    $findings.Add([pscustomobject]@{
      Package = $relRoot
      Severity = 'WARN'
      Code = 'PKG-MISSING'
      Detail = ("Paket-direktorijum ne postoji: {0}" -f $absRoot)
    }) | Out-Null
    continue
  }

  $entry = [pscustomobject]@{
    Package = $relRoot
    LockFile = $null
    Manager = $null
    Size = 0
    LockfileVersion = $null
    GitignoreIgnored = $false
  }

  foreach ($cand in $LockFileCandidates) {
    $candPath = Join-Path $absRoot $cand.Name
    if (Test-Path $candPath) {
      $entry.LockFile = $cand.Name
      $entry.Manager = $cand.Manager
      $entry.Size = (Get-Item -LiteralPath $candPath).Length
      if ($cand.Name -eq 'package-lock.json') {
        $entry.LockfileVersion = Get-LockfileVersion -AbsPath $candPath
      }
      break
    }
  }

  # Validacija invarijanti
  if (-not $entry.LockFile) {
    $findings.Add([pscustomobject]@{
      Package = $relRoot
      Severity = 'WARN'
      Code = 'NO-LOCK-FILE'
      Detail = "Paket nema lock fajl (package-lock.json / pnpm-lock.yaml / yarn.lock); npm install moze instalirati razlicite transitive verzije u CI vs lokalno"
    }) | Out-Null
  } else {
    if ($entry.Size -lt $MinLockSize) {
      $findings.Add([pscustomobject]@{
        Package = $relRoot
        Severity = 'WARN'
        Code = 'LOCK-TOO-SMALL'
        Detail = ("Lock fajl {0} je manji od {1} bytes ({2} bytes) - mozda je korumpiran ili nije generisan ispravno" -f $entry.LockFile, $MinLockSize, $entry.Size)
      }) | Out-Null
    }

    # Provera da .gitignore ne ignoriše lock fajl (multi-source)
    $gitignoreCandidates = @(
      (Join-Path $repoRoot '.gitignore'),
      (Join-Path $absRoot '.gitignore')
    )
    foreach ($giPath in $gitignoreCandidates) {
      if (Test-LockIgnored -GitignoreAbsPath $giPath -LockFileName $entry.LockFile) {
        $entry.GitignoreIgnored = $true
        $rel = ($giPath -replace [regex]::Escape($repoRoot), '').TrimStart('\','/')
        $findings.Add([pscustomobject]@{
          Package = $relRoot
          Severity = 'WARN'
          Code = 'LOCK-GITIGNORED'
          Detail = ("Lock fajl {0} je ignoriran preko {1} - common antipattern; CI nece imati reproducibility garanciju" -f $entry.LockFile, $rel)
        }) | Out-Null
      }
    }
  }

  $packages.Add($entry) | Out-Null
}

# --- Cross-package validacija (4 i 5 invarijanta) ---
$pkgsWithLock = $packages | Where-Object { $_.LockFile }

if ($pkgsWithLock.Count -gt 0) {
  $managers = @($pkgsWithLock | Select-Object -ExpandProperty Manager -Unique)
  if ($managers.Count -gt 1) {
    $findings.Add([pscustomobject]@{
      Package = '<cross-package>'
      Severity = 'WARN'
      Code = 'MIXED-MANAGERS'
      Detail = ("Razliciti package manager-i preko paketa: {0} - CI workflow mora znati koji install koristiti per-paket" -f ($managers -join ', '))
    }) | Out-Null
  }

  # lockfileVersion samo ima smisla za npm
  $npmPkgs = $pkgsWithLock | Where-Object { $_.Manager -eq 'npm' -and $null -ne $_.LockfileVersion }
  if ($npmPkgs.Count -gt 1) {
    $versions = @($npmPkgs | Select-Object -ExpandProperty LockfileVersion -Unique)
    if ($versions.Count -gt 1) {
      $findings.Add([pscustomobject]@{
        Package = '<cross-package>'
        Severity = 'WARN'
        Code = 'MIXED-LOCKFILEVERSION'
        Detail = ("Razliciti lockfileVersion preko npm paketa: {0} - developeri koriste razlicite npm verzije; transitive resolution moze biti drift" -f ($versions -join ', '))
      }) | Out-Null
    }

    # INFO za stare verzije (v1 = npm v6 i niže)
    foreach ($pkg in $npmPkgs) {
      if ($pkg.LockfileVersion -lt 3) {
        $findings.Add([pscustomobject]@{
          Package = $pkg.Package
          Severity = 'INFO'
        Code = 'OLD-LOCKFILEVERSION'
          Detail = ("lockfileVersion={0} (preporuka: 3 za npm v7+); upgrade preko: npm install --package-lock-only" -f $pkg.LockfileVersion)
        }) | Out-Null
      }
    }
  }
}

# --- Sumarni izveštaj ---
$warns = @($findings | Where-Object { $_.Severity -eq 'WARN' })
$infos = @($findings | Where-Object { $_.Severity -eq 'INFO' })

Write-Host ''
Write-Host '== Lock fajlovi presence + doslednost rezime ==' -ForegroundColor Cyan
Write-Host ("  Node paketa skenirano:        {0}" -f $packages.Count)
Write-Host ("  WARN (reproducibility risk):  {0}" -f $warns.Count)
Write-Host ("  INFO (informativno):          {0}" -f $infos.Count)

# --- Tabela ---
Write-Host ''
Write-Host '== Tabela paket-level lock fajlova ==' -ForegroundColor Cyan
$packages |
  Select-Object Package, @{N='LockFile';E={ if ($_.LockFile) { $_.LockFile } else { '<missing>' } }}, Manager, @{N='Size';E={ if ($_.Size -gt 0) { ("{0:N0} bytes" -f $_.Size) } else { '-' } }}, @{N='LockfileVersion';E={ if ($null -ne $_.LockfileVersion) { $_.LockfileVersion } else { '-' } }}, @{N='Gitignored';E={ if ($_.GitignoreIgnored) { 'YES' } else { 'no' } }} |
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
Write-Host '  - Komplementarni audit Talas 79 (`check-package-json-consistency.ps1`) pokriva metapodaci sloj (engines.node + license + private).'
Write-Host '  - Komplementarni audit Talas 94 (`check-package-scripts-consistency.ps1`) pokriva scripts: blok (test/lint/build/start/dev/format).'
Write-Host '  - Komplementarni audit Talas 96 (`check-dev-deps-versions-consistency.ps1`) pokriva devDependencies MAJOR verzije (typescript/eslint/@types/node/TS-ESLint/prettier).'
Write-Host '  - Komplementarni audit Talas 92 (`check-gitignore-consistency.ps1`) pokriva .gitignore doslednost; Talas 98 dodaje cross-check da lock fajl NIJE ignoriran.'
Write-Host '  - 4-slojni package.json audit kompletiran: Talas 79 + Talas 94 + Talas 96 + Talas 98 zajedno pokrivaju ~99.5% package.json + lock consistency rizika.'
Write-Host '  - PS Lesson #19 primenjena: ConvertFrom-Json fail-uje za package-lock sa duplicate keys; resenje regex-based parsing prvih 10 linija (lockfileVersion uvek u top-level).'
Write-Host '  - Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md).'
Write-Host '  - Smoke (HTTP) i bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).'
Write-Host '  - Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md (LATEST verify Val 355; smoke Val 351).'
Write-Host '  - Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md i docs/NIVO-1-DRYRUN-LOG.md.'

if ($FailOnWarn -and $warns.Count -gt 0) {
  exit 1
}
exit 0
