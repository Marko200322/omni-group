<#
.SYNOPSIS
  ESLint config doslednost preko 3 Node paketa (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 91: kompletira monorepo-wide structural consistency domen u **lint sloj** posle Talas 79 (`package.json`), Talas 80 (workflow YAML + `.nvmrc`), Talas 81 (README presence) i Talas 87 (`tsconfig.json`). Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa parsira 3 paket-level ESLint config fajla (`apps/omnigroup-web/.eslintrc.json` Next, `atina-platform/atina/.eslintrc.cjs` Node lib, `atina-system/.eslintrc.js` NestJS) i validira 5 strukturalnih invarijanti:

  1. **Format doslednost** (INFO): 3 fajla u 3 različita formata (`.json`, `.cjs`, `.js`) — legitimno radi, ali nedosledno (ESLint dokumentacija preferira jedan format po monorepu).
  2. **`root: true` polje** (WARN): Atina i Nest imaju, omnigroup-web nema (legitimno za Next jer `next/core-web-vitals` postavlja root flag interno) — vlasnik signal.
  3. **`@typescript-eslint/parser` reference** (INFO): Atina i Nest eksplicitno; omnigroup-web preko `next/typescript` extend-a (legitimno).
  4. **`plugin:@typescript-eslint/recommended` extend** (WARN): Atina i Nest oba imaju; omnigroup-web nema eksplicitno (Next ima sopstveni TS preset). Doslednost u 2/3 paketa je zadovoljavajuća.
  5. **Prettier integration** (INFO): samo Nest ima `plugin:prettier/recommended`; Atina i omnigroup-web nemaju (signal nedoslednosti formatera).

  **Format-aware parsing strategija:**

  - `.json` fajl: `ConvertFrom-Json` (PS5.1 native).
  - `.cjs` / `.js` fajlovi: regex ekstraktuje ključne podatke (`module.exports = { ... }` body) jer PS5.1 ne može izvršiti JS. Regex-i: `'extends':\s*\[([^\]]+)\]`, `'parser':\s*'([^']+)'`, `'plugins':\s*\[([^\]]+)\]`, `'root':\s*(true|false)`, `'ignorePatterns':\s*\[([^\]]+)\]`. Tolerantan na `'` i `"` quotes (oba se handle-uju).

  Read-only audit: ne menja fajlove. **Nije** deo CI mirror-a (`verify-monorepo.ps1` job **`python`** / required check **`Python (Doslednost dok + pytest)`** — `docs/GIT-BRANCH-PROTECTION.md`) i ne menja njegov scope. Dopuna pre-PR pregleda; smoke (HTTP) i bundled `npm run smoke:all`: `scripts/smoke-stack.ps1` + `atina-platform/atina/docs/operations/release-gate-checklist.md` (*Local notes — Smoke tests*).

.PARAMETER FailOnWarn
  Vraća exit 1 ako bilo koji ESLint paket ima WARN nalaz (`root` flag inkonzistencija ili `plugin:@typescript-eslint/recommended` nedostaje u TS paketu). Bez ove opcije, uvek vraća 0 (skripta je informativna).

.PARAMETER MaxOutput
  Maksimalan broj redova u Detalji sekciji. Default 200.

.PARAMETER PackageRoots
  Lista relativnih putanja do ESLint config fajlova koji se proveravaju. Default 3 paketa: `apps/omnigroup-web/.eslintrc.json`, `atina-platform/atina/.eslintrc.cjs`, `atina-system/.eslintrc.js`. Parametrizovan radi ekstenzibilnosti — ako se doda 4. Node paket sa svojim ESLint config-om, vlasnik može proširiti listu bez izmene koda.

.EXAMPLE
  .\scripts\check-eslint-consistency.ps1
  # Default: skenira 3 ESLint config-a, prijavljuje WARN/INFO nalaze, exit 0 uvek.

.EXAMPLE
  .\scripts\check-eslint-consistency.ps1 -FailOnWarn
  # Strogi rezim: exit 1 ako bilo koji paket ima WARN (root inkonzistencija ili plugin:@typescript-eslint/recommended nedostaje).

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 91 = ovaj skript; ukupno 39 koraka Talas 65-192).
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
  [string[]]$PackageRoots = @(
    'apps/omnigroup-web/.eslintrc.json',
    'atina-platform/atina/.eslintrc.cjs',
    'atina-system/.eslintrc.js'
  )
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

Write-Host '== check-eslint-consistency.ps1 - ESLint config doslednost preko 3 Node paketa (informativan) ==' -ForegroundColor Cyan
Write-Host ("   FailOnWarn: {0}" -f $FailOnWarn) -ForegroundColor DarkGray
Write-Host ("   PackageRoots ({0} fajla): {1}" -f $PackageRoots.Count, ($PackageRoots -join ', ')) -ForegroundColor DarkGray

# --- Helper: Strip JS/CJS comments + ekstraktuj polja regex-om ---
function Get-EslintConfigInfo {
  param(
    [string]$RelPath,
    [string]$AbsPath
  )
  $info = [pscustomobject]@{
    Package = $RelPath
    Format = $null
    HasRoot = $false
    Parser = $null
    Extends = @()
    Plugins = @()
    IgnorePatterns = @()
    HasPrettier = $false
    HasTypescriptRecommended = $false
    HasParserExplicit = $false
  }

  $ext = [System.IO.Path]::GetExtension($AbsPath).ToLowerInvariant()
  $info.Format = $ext.TrimStart('.')

  $raw = Get-Content -LiteralPath $AbsPath -Raw -Encoding UTF8

  if ($ext -eq '.json') {
    # JSON parsing — najsigurnije
    try {
      $json = $raw | ConvertFrom-Json
      if ($json.PSObject.Properties.Name -contains 'root') {
        $info.HasRoot = [bool]$json.root
      }
      if ($json.PSObject.Properties.Name -contains 'parser') {
        $info.Parser = [string]$json.parser
        $info.HasParserExplicit = $true
      }
      if ($json.PSObject.Properties.Name -contains 'extends') {
        if ($json.extends -is [array]) { $info.Extends = @($json.extends) }
        elseif ($json.extends) { $info.Extends = @($json.extends) }
      }
      if ($json.PSObject.Properties.Name -contains 'plugins') {
        if ($json.plugins -is [array]) { $info.Plugins = @($json.plugins) }
        elseif ($json.plugins) { $info.Plugins = @($json.plugins) }
      }
      if ($json.PSObject.Properties.Name -contains 'ignorePatterns') {
        if ($json.ignorePatterns -is [array]) { $info.IgnorePatterns = @($json.ignorePatterns) }
        elseif ($json.ignorePatterns) { $info.IgnorePatterns = @($json.ignorePatterns) }
      }
    } catch {
      Write-Host ("   WARN: ConvertFrom-Json fail za {0}: {1}" -f $RelPath, $_.Exception.Message) -ForegroundColor Yellow
    }
  }
  else {
    # .cjs / .js — regex ekstrakcija (PS5.1 ne moze da izvrsi JS)
    # Prvo strip-uj line comments (// ...) i block comments (/* ... */)
    $stripped = [regex]::Replace($raw, '(?s)/\*.*?\*/', '')
    $stripped = [regex]::Replace($stripped, '(?m)^\s*//.*$', '')

    # root: true (boolean, ne string)
    if ($stripped -match "(?m)^\s*root\s*:\s*true\b") {
      $info.HasRoot = $true
    }

    # parser: '...' ili "..."
    $m = [regex]::Match($stripped, "(?m)^\s*parser\s*:\s*['""]([^'""]+)['""]")
    if ($m.Success) {
      $info.Parser = $m.Groups[1].Value
      $info.HasParserExplicit = $true
    }

    # extends: [ '...', '...' ] — multi-line tolerant
    $m = [regex]::Match($stripped, "(?s)extends\s*:\s*\[([^\]]+)\]")
    if ($m.Success) {
      $extendsBody = $m.Groups[1].Value
      $extendsMatches = [regex]::Matches($extendsBody, "['""]([^'""]+)['""]")
      $info.Extends = @($extendsMatches | ForEach-Object { $_.Groups[1].Value })
    }

    # plugins: [ '...', '...' ]
    $m = [regex]::Match($stripped, "(?s)plugins\s*:\s*\[([^\]]+)\]")
    if ($m.Success) {
      $pluginsBody = $m.Groups[1].Value
      $pluginsMatches = [regex]::Matches($pluginsBody, "['""]([^'""]+)['""]")
      $info.Plugins = @($pluginsMatches | ForEach-Object { $_.Groups[1].Value })
    }

    # ignorePatterns: [ '...', '...' ]
    $m = [regex]::Match($stripped, "(?s)ignorePatterns\s*:\s*\[([^\]]+)\]")
    if ($m.Success) {
      $ignBody = $m.Groups[1].Value
      $ignMatches = [regex]::Matches($ignBody, "['""]([^'""]+)['""]")
      $info.IgnorePatterns = @($ignMatches | ForEach-Object { $_.Groups[1].Value })
    }
  }

  # Computed flags za extends
  $extendsLower = @($info.Extends | ForEach-Object { $_.ToLowerInvariant() })
  $info.HasPrettier = ($extendsLower | Where-Object { $_ -match 'prettier' }) -ne $null
  $info.HasTypescriptRecommended = ($extendsLower | Where-Object { $_ -match 'typescript-eslint/recommended' }) -ne $null

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
      Code = 'MISSING-CONFIG'
      Detail = 'ESLint config fajl ne postoji'
    }) | Out-Null
    continue
  }
  $info = Get-EslintConfigInfo -RelPath $rel -AbsPath $abs
  $packages.Add($info) | Out-Null
}

# --- Validacija 1: Format doslednost (INFO) ---
$formats = @($packages | ForEach-Object { $_.Format } | Sort-Object -Unique)
if ($formats.Count -gt 1) {
  $findings.Add([pscustomobject]@{
    Package = '(svi paketi)'
    Severity = 'INFO'
    Code = 'FORMAT-MISMATCH'
    Detail = ("3 razlicita formata: {0}; ESLint dokumentacija preferira jedan format po monorepu" -f ($formats -join ', '))
  }) | Out-Null
}

# --- Validacija 2: root: true ---
foreach ($pkg in $packages) {
  if (-not $pkg.HasRoot) {
    # Next paketi legitimno mogu da nemaju (next preset)
    $isNext = $pkg.Package -match 'omnigroup-web'
    $sev = if ($isNext) { 'INFO' } else { 'WARN' }
    $reason = if ($isNext) {
      'omnigroup-web (Next): legitimno bez explicit root - next/core-web-vitals interno postavlja flag'
    } else {
      'paket bez root: true mogao bi da nasledjuje pravila uzvodno (parent .eslintrc) sto je rizik'
    }
    $findings.Add([pscustomobject]@{
      Package = $pkg.Package
      Severity = $sev
      Code = 'NO-ROOT-TRUE'
      Detail = $reason
    }) | Out-Null
  }
}

# --- Validacija 3: parser explicit (INFO) ---
foreach ($pkg in $packages) {
  if (-not $pkg.HasParserExplicit) {
    $isNext = $pkg.Package -match 'omnigroup-web'
    $sev = if ($isNext) { 'INFO' } else { 'WARN' }
    $reason = if ($isNext) {
      'omnigroup-web (Next): parser implicitno preko next/typescript - legitimno'
    } else {
      'TS paket bez explicit parser - moze raditi sa default ali je signal'
    }
    $findings.Add([pscustomobject]@{
      Package = $pkg.Package
      Severity = $sev
      Code = 'NO-EXPLICIT-PARSER'
      Detail = $reason
    }) | Out-Null
  }
}

# --- Validacija 4: plugin:@typescript-eslint/recommended (WARN ako TS paket nema) ---
foreach ($pkg in $packages) {
  if (-not $pkg.HasTypescriptRecommended) {
    $isNext = $pkg.Package -match 'omnigroup-web'
    $sev = if ($isNext) { 'INFO' } else { 'WARN' }
    $reason = if ($isNext) {
      'omnigroup-web (Next): TS pravila idu kroz next/typescript preset - legitimno'
    } else {
      'TS paket bez plugin:@typescript-eslint/recommended - nedostaju standardna TS pravila'
    }
    $findings.Add([pscustomobject]@{
      Package = $pkg.Package
      Severity = $sev
      Code = 'NO-TS-RECOMMENDED'
      Detail = $reason
    }) | Out-Null
  }
}

# --- Validacija 5: Prettier integration doslednost (INFO) ---
$prettierPackages = @($packages | Where-Object { $_.HasPrettier } | ForEach-Object { $_.Package })
$nonPrettierPackages = @($packages | Where-Object { -not $_.HasPrettier } | ForEach-Object { $_.Package })
if ($prettierPackages.Count -gt 0 -and $nonPrettierPackages.Count -gt 0) {
  $findings.Add([pscustomobject]@{
    Package = '(svi paketi)'
    Severity = 'INFO'
    Code = 'PRETTIER-INCONSISTENT'
    Detail = ("Prettier integration nedosledna: {0}/{1} paketa imaju plugin:prettier/recommended; ostalim moze fali Prettier-aware lint pravila" -f $prettierPackages.Count, $packages.Count)
  }) | Out-Null
}

# --- Sumarni izveštaj ---
$warns = @($findings | Where-Object { $_.Severity -eq 'WARN' })
$infos = @($findings | Where-Object { $_.Severity -eq 'INFO' })

Write-Host ''
Write-Host '== ESLint config doslednost rezime ==' -ForegroundColor Cyan
Write-Host ("  Node paketa skenirano:  {0}" -f $packages.Count)
Write-Host ("  WARN (realan rizik):   {0}" -f $warns.Count)
Write-Host ("  INFO (informativno):   {0}" -f $infos.Count)

# --- Tabela paketa ---
Write-Host ''
Write-Host '== Tabela paketa ==' -ForegroundColor Cyan
$packages |
  Select-Object @{N='Paket';E={$_.Package}}, @{N='Format';E={$_.Format}}, @{N='Root';E={$_.HasRoot}}, @{N='Parser';E={if ($_.Parser) { $_.Parser } else { '(none)' }}}, @{N='TS-rec';E={$_.HasTypescriptRecommended}}, @{N='Prettier';E={$_.HasPrettier}} |
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
Write-Host '  - Komplementarni audit-i strukturalne doslednosti: package.json (Talas 79), workflow YAML (Talas 80), README (Talas 81), tsconfig.json (Talas 87).'
Write-Host '  - run-all-audits.ps1: 39 koraka (37 read-only + TODO + npm); single entry point.'
Write-Host '  - Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md).'
Write-Host '  - Smoke (HTTP) i bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).'
Write-Host '  - Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md (LATEST verify Val 355; smoke Val 351).'
Write-Host '  - Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md i docs/NIVO-1-DRYRUN-LOG.md.'

if ($FailOnWarn -and $warns.Count -gt 0) {
  exit 1
}
exit 0
