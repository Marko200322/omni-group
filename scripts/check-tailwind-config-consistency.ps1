<#
.SYNOPSIS
  Tailwind CSS konfiguracija i tailwindcss dep doslednost preko Node paketa (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 107: **6. sloj structural config audit-a** posle Talas 87 (TS) + 91 (ESLint) + 105 (Prettier) + 101/103 (Python) + 106 (runtime deps); pokriva **CSS utility / design-token build-time** sloj (tailwind.config + postcss + tailwindcss semver). Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa skenira podrazumevano **3 Node paketa** i za svaki koji deklariše `tailwindcss` ili `@tailwindcss/*` u `dependencies` / `devDependencies` validira **6 strukturalnih invarijanti**:

  1. **Konfiguracija postoji** (Required-WARN) — ako paket ima Tailwind dep, mora postojati `tailwind.config.js|ts|cjs|mjs` **ili** `postcss.config.js|mjs|cjs|ts` koji referencira `tailwindcss` / `@tailwindcss` (Tailwind v3 + PostCSS ili v4-style pipeline).
  2. **tailwind.config fajl nije prazan i sadrzi content ili purge ili @config** (Required-WARN ako postoji tailwind.config.*) — Tailwind v3 zahteva `content` (ili legacy `purge`); v4 moze koristiti `@config` u CSS-u — ako nijedno nije u fajlu, build moze pasti ili generisati prazan CSS.
  3. **PostCSS integracija** (Optional-INFO) — ako postoji samo `tailwind.config.*` bez `postcss.config.*`, Next 14 + Tailwind obicno i dalje radi preko ugradjenog PostCSS, ali eksplicitan `postcss.config` je preporucen za reproducibilnost.
  4. **tailwindcss u devDependencies** (Optional-INFO) — build alatka tipicno ide u `devDependencies`; ako je samo u `dependencies`, deploy bundle moze biti tezi (INFO, ne WARN).
  5. **MAJOR tailwindcss doslednost** (Optional-INFO ako 2+ paketa imaju `tailwindcss` dep) — v3 vs v4 imaju razlicite konfiguracije; drift je vazan za monorepo koji deli UI patterns.
  6. **Rezime** (informativno) — broj paketa sa Tailwind dep-om, lista, cross-package MAJOR statistika.

  Paketi **bez** Tailwind dep-a se ne prijavljuju kao problem (Atina / Nest nemaju Tailwind — ocekivano).

  Read-only audit. **Nije** deo CI mirror-a (`verify-monorepo.ps1`). Dopuna pre-PR pregleda.

.PARAMETER FailOnWarn
  Exit 1 ako ima WARN nalaza.

.PARAMETER MaxOutput
  Maksimalan broj detaljnih redova (default 200).

.PARAMETER NodePaths
  Relativne putanje Node paketa (default tri monorepo paketa).

.EXAMPLE
  .\scripts\check-tailwind-config-consistency.ps1

.EXAMPLE
  .\scripts\check-tailwind-config-consistency.ps1 -FailOnWarn

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 107 = ovaj skript; ukupno 39 koraka Talas 65-192).
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

Write-Host "== check-tailwind-config-consistency.ps1 - Tailwind CSS konfiguracija (Talas 107) ==" -ForegroundColor Cyan
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

function Test-HasTailwindRelatedDep {
  param([object]$Deps)
  if (-not $Deps) { return $false }
  foreach ($p in $Deps.PSObject.Properties) {
    $n = $p.Name
    if ($n -eq 'tailwindcss') { return $true }
    if ($n -like '@tailwindcss/*') { return $true }
  }
  return $false
}

function Get-TailwindDepVersion {
  param([object]$Deps)
  if (-not $Deps) { return $null }
  foreach ($name in @('tailwindcss', '@tailwindcss/postcss', '@tailwindcss/vite')) {
    if ($Deps.PSObject.Properties[$name]) {
      return [pscustomobject]@{ Name = $name; Version = "$($Deps.$name)" }
    }
  }
  foreach ($p in $Deps.PSObject.Properties) {
    if ($p.Name -like '@tailwindcss/*') {
      return [pscustomobject]@{ Name = $p.Name; Version = "$($p.Value)" }
    }
  }
  return $null
}

function Get-TailwindMajor {
  param([string]$Ver)
  if ([string]::IsNullOrWhiteSpace($Ver)) { return $null }
  if ($Ver -match '^[\^~>=<]*\s*(\d+)') { return [int]$Matches[1] }
  return $null
}

function Find-FirstExistingPath {
  param(
    [Parameter(Mandatory)] [string]$Root,
    [Parameter(Mandatory)] [string[]]$RelativeNames
  )
  foreach ($rel in $RelativeNames) {
    $full = Join-Path $Root $rel
    if (Test-Path $full -PathType Leaf) { return $full }
  }
  return $null
}

$findings = [System.Collections.Generic.List[pscustomobject]]::new()
$withTailwind = [System.Collections.Generic.List[pscustomobject]]::new()

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
  $hasDeps = Test-HasTailwindRelatedDep -Deps $deps
  $hasDev = Test-HasTailwindRelatedDep -Deps $devDeps
  if (-not $hasDeps -and -not $hasDev) { continue }

  $verInfo = $null
  if ($hasDev) { $verInfo = Get-TailwindDepVersion -Deps $devDeps }
  if (-not $verInfo -and $hasDeps) { $verInfo = Get-TailwindDepVersion -Deps $deps }

  $twCfg = Find-FirstExistingPath -Root $root -RelativeNames @(
    'tailwind.config.ts', 'tailwind.config.js', 'tailwind.config.mjs', 'tailwind.config.cjs'
  )
  $pcfg = Find-FirstExistingPath -Root $root -RelativeNames @(
    'postcss.config.mjs', 'postcss.config.js', 'postcss.config.cjs', 'postcss.config.ts'
  )

  $postcssHasTailwind = $false
  if ($pcfg) {
    $praw = Get-Content $pcfg -Raw -Encoding UTF8
    if ($praw -match 'tailwindcss|@tailwindcss') { $postcssHasTailwind = $true }
  }

  $hasConfigLayer = ($null -ne $twCfg) -or $postcssHasTailwind

  $row = [pscustomobject]@{
    Root              = $root
    HasTailwindDep    = $true
    PrimaryDep        = if ($verInfo) { $verInfo.Name } else { '(unknown)' }
    Version           = if ($verInfo) { $verInfo.Version } else { '-' }
    Major             = if ($verInfo) { Get-TailwindMajor -Ver $verInfo.Version } else { $null }
    TailwindConfig    = if ($twCfg) { Split-Path $twCfg -Leaf } else { '-' }
    PostcssConfig     = if ($pcfg) { Split-Path $pcfg -Leaf } else { '-' }
    PostcssTailwind   = $postcssHasTailwind
    InDevDependencies = $hasDev
    InDependencies    = $hasDeps
  }
  $withTailwind.Add($row) | Out-Null

  # Invariant 1
  if (-not $hasConfigLayer) {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'WARN'; Code = 'NO-TAILWIND-CONFIG';
      Message = "tailwindcss dep postoji ali nema tailwind.config.* niti postcss.config sa tailwind referencom"
    }) | Out-Null
  }

  # Invariant 2 (samo ako ima tailwind.config fajl)
  if ($twCfg) {
    $traw = Get-Content $twCfg -Raw -Encoding UTF8
    if ([string]::IsNullOrWhiteSpace($traw)) {
      $findings.Add([pscustomobject]@{
        Root = $root; Severity = 'WARN'; Code = 'EMPTY-TAILWIND-CONFIG'; Message = "$($row.TailwindConfig) je prazan"
      }) | Out-Null
    } elseif ($traw -notmatch '(?m)\bcontent\s*:' -and $traw -notmatch '(?m)\bpurge\s*:' -and $traw -notmatch '@config') {
      $findings.Add([pscustomobject]@{
        Root = $root; Severity = 'WARN'; Code = 'NO-CONTENT-IN-TAILWIND-CONFIG';
        Message = "$($row.TailwindConfig) nema content/purge/@config kljuc - Tailwind v3 build moze pasti ili generisati prazan CSS"
      }) | Out-Null
    }
  }

  # Invariant 3
  if ($twCfg -and -not $pcfg) {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'INFO'; Code = 'NO-POSTCSS-CONFIG';
      Message = "Postoji tailwind.config ali nema postcss.config.* - razmotri eksplicitan PostCSS za reproducibilnost"
    }) | Out-Null
  }

  # Invariant 4
  if ($hasDeps -and -not $hasDev) {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'INFO'; Code = 'TAILWIND-IN-RUNTIME-DEPS';
      Message = "tailwindcss ili @tailwindcss/* je u dependencies umesto devDependencies - tipicno build-only alat"
    }) | Out-Null
  }
}

# Invariant 5 — cross-package MAJOR (samo za kljuc tailwindcss da bi se izbegla mesavina @tailwindcss paketa)
$majRows = @($withTailwind | ForEach-Object {
  if ($_.Major) {
    [pscustomobject]@{ Root = $_.Root; Major = $_.Major; PrimaryDep = $_.PrimaryDep }
  }
})
$classic = @($majRows | Where-Object { $_.PrimaryDep -eq 'tailwindcss' })
if ($classic.Count -ge 2) {
  $uniq = @($classic | ForEach-Object { $_.Major } | Select-Object -Unique)
  if ($uniq.Count -gt 1) {
    $detail = ($classic | ForEach-Object { "$($_.Root)=v$($_.Major)" }) -join ', '
    $findings.Add([pscustomobject]@{
      Root = '(cross-package)'; Severity = 'INFO'; Code = 'TAILWIND-MAJOR-DRIFT';
      Message = "tailwindcss MAJOR drift preko paketa: $detail"
    }) | Out-Null
  }
}

Write-Host "== Paketi sa Tailwind-related dep ==" -ForegroundColor Yellow
if ($withTailwind.Count -eq 0) {
  Write-Host "  (nijedan od skeniranih paketa nema tailwindcss / @tailwindcss/* dep - ocekivano za API-only pakete)" -ForegroundColor DarkGray
} else {
  $withTailwind | ForEach-Object {
    [pscustomobject]@{
      Root = $_.Root
      Dep  = $_.PrimaryDep
      Ver  = $_.Version
      TW   = $_.TailwindConfig
      PC   = $_.PostcssConfig
    }
  } | Format-Table -AutoSize | Out-String | Write-Host
}

$warnFindings = @($findings | Where-Object { $_.Severity -eq 'WARN' })
$infoFindings = @($findings | Where-Object { $_.Severity -eq 'INFO' })

Write-Host ""
Write-Host "== Findings ==" -ForegroundColor Yellow
Write-Host ("  WARN (Tailwind-rizik):    {0}" -f $warnFindings.Count)
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
    Write-Host ("  [{0,-4}] {1,-30} {2}: {3}" -f $f.Severity, $f.Code, $f.Root, $f.Message) -ForegroundColor $color
    $shown++
  }
}

Write-Host ""
Write-Host "Napomene:" -ForegroundColor DarkGray
Write-Host "  - Talas 107: 6. sloj structural config (Tailwind + PostCSS entry)." -ForegroundColor DarkGray
Write-Host '  - run-all-audits.ps1: 39 koraka (37 read-only + TODO + npm); single entry point.' -ForegroundColor DarkGray

if ($FailOnWarn -and $warnFindings.Count -gt 0) {
  Write-Host ""
  Write-Host "FAIL: $($warnFindings.Count) WARN (FailOnWarn)" -ForegroundColor Red
  exit 1
}
exit 0
