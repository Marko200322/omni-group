<#
.SYNOPSIS
  Next.js next.config doslednost za Node pakete sa `next` dep-om (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 108: **7. sloj structural config audit-a** posle Tailwind (Talas 107); pokriva **Next.js framework build-time** sloj. Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa skenira podrazumevano **3 Node paketa** i za svaki koji deklariše `next` u `dependencies` ili `devDependencies` validira **6 strukturalnih invarijanti**:

  1. **next.config postoji** (Required-WARN) — `next.config.js|mjs|ts|cjs` mora postojati i biti ne-prazan.
  2. **Sadrzaj nije prazan** (Required-WARN) — fajl ne sme biti samo whitespace (0-byte ili prazan).
  3. **Minimalna konfiguracija** (Optional-INFO) — ako fajl ne sadrzi uobicajene Next kljuceve (`reactStrictMode`, `images`, `headers`, `rewrites`, `redirects`, `output`, `experimental`, `compiler`, `transpilePackages`, `typescript`, `eslint`, `basePath`, `i18n`, `serverExternalPackages`, itd.), prijavi INFO (regression sentinel za security / Docker / bundle podesavanja).
  4. **next u devDependencies** (Optional-INFO) — ako je `next` samo u devDependencies (retko za prod Next app).
  5. **Cross-package next MAJOR** (Optional-INFO) — ako 2+ paketa imaju `next` dep sa razlicitim MAJOR semver-om.
  6. **Standalone + Docker cross-hint** (Optional-INFO) — ako nema `Dockerfile` u korenu paketa i u config-u nema `output: 'standalone'` (ili ekvivalent), INFO veza sa Talas 99 (container deploy).

  Paketi **bez** `next` dep-a se preskacu (Atina / Nest — ocekivano).

  Read-only audit. **Nije** deo CI mirror-a (`verify-monorepo.ps1`).

.PARAMETER FailOnWarn
  Exit 1 ako ima WARN nalaza.

.PARAMETER MaxOutput
  Maksimalan broj detaljnih redova (default 200).

.PARAMETER NodePaths
  Relativne putanje Node paketa (default tri monorepo paketa).

.EXAMPLE
  .\scripts\check-next-config-consistency.ps1

.EXAMPLE
  .\scripts\check-next-config-consistency.ps1 -FailOnWarn

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 108 = ovaj skript; ukupno 39 koraka Talas 65-192).
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

Write-Host "== check-next-config-consistency.ps1 - Next.js konfiguracija (Talas 108) ==" -ForegroundColor Cyan
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

function Get-NextVersionFromDeps {
  param([object]$Deps)
  if (-not $Deps) { return $null }
  if ($Deps.PSObject.Properties['next']) { return "$($Deps.next)" }
  return $null
}

function Get-NextMajor {
  param([string]$Ver)
  if ([string]::IsNullOrWhiteSpace($Ver)) { return $null }
  if ($Ver -match '^[\^~>=<]*\s*(\d+)') { return [int]$Matches[1] }
  return $null
}

function Find-NextConfigPath {
  param([Parameter(Mandatory)] [string]$Root)
  foreach ($rel in @('next.config.ts', 'next.config.mjs', 'next.config.js', 'next.config.cjs')) {
    $full = Join-Path $Root $rel
    if (Test-Path $full -PathType Leaf) { return $full }
  }
  return $null
}

function Test-NextConfigHasAdvancedKeys {
  param([Parameter(Mandatory)] [string]$Raw)
  if ($Raw -match '(?m)\b(reactStrictMode|experimental|images|headers|rewrites|redirects|output|compiler|transpilePackages|webpack|sassOptions|eslint|typescript|generateBuildId|assetPrefix|basePath|compress|poweredByHeader|trailingSlash|i18n|serverExternalPackages|modularizeImports|skipTrailingSlashRedirect)\b') {
    return $true
  }
  return $false
}

function Test-HasStandaloneOutput {
  param([Parameter(Mandatory)] [string]$Raw)
  if ($Raw -match 'output\s*:\s*[''"]standalone[''"]') { return $true }
  if ($Raw -match 'output\s*:\s*[`"]standalone[`"]') { return $true }
  return $false
}

$findings = [System.Collections.Generic.List[pscustomobject]]::new()
$withNext = [System.Collections.Generic.List[pscustomobject]]::new()

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
  $verFromDeps = Get-NextVersionFromDeps -Deps $deps
  $verFromDev = Get-NextVersionFromDeps -Deps $devDeps
  if (-not $verFromDeps -and -not $verFromDev) { continue }

  $inDeps = [bool]$verFromDeps
  $inDev = [bool]$verFromDev
  $verStr = if ($verFromDeps) { $verFromDeps } else { $verFromDev }
  $ncfg = Find-NextConfigPath -Root $root
  $dockerfile = Join-Path $root 'Dockerfile'

  $row = [pscustomobject]@{
    Root           = $root
    NextVersion    = $verStr
    Major          = Get-NextMajor -Ver $verStr
    NextConfig     = if ($ncfg) { Split-Path $ncfg -Leaf } else { '-' }
    InDependencies = $inDeps
    InDevOnly      = ($inDev -and -not $inDeps)
  }
  $withNext.Add($row) | Out-Null

  if (-not $ncfg) {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'WARN'; Code = 'NO-NEXT-CONFIG';
      Message = "next dep postoji ali nema next.config.js|mjs|ts|cjs"
    }) | Out-Null
    continue
  }

  $raw = Get-Content $ncfg -Raw -Encoding UTF8
  if ([string]::IsNullOrWhiteSpace($raw)) {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'WARN'; Code = 'EMPTY-NEXT-CONFIG'; Message = "$($row.NextConfig) je prazan"
    }) | Out-Null
    continue
  }

  if (-not (Test-NextConfigHasAdvancedKeys -Raw $raw)) {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'INFO'; Code = 'MINIMAL-NEXT-CONFIG';
      Message = "$($row.NextConfig) nema uobicajene Next kljuceve (reactStrictMode, images, output, headers, ...) - baseline OK ali razmotri eksplicitne postavke"
    }) | Out-Null
  }

  if ($row.InDevOnly) {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'INFO'; Code = 'NEXT-IN-DEV-DEPS-ONLY';
      Message = "next je samo u devDependencies - netipicno za produkcioni Next servis"
    }) | Out-Null
  }

  if (-not (Test-Path $dockerfile -PathType Leaf)) {
    if (-not (Test-HasStandaloneOutput -Raw $raw)) {
      $findings.Add([pscustomobject]@{
        Root = $root; Severity = 'INFO'; Code = 'NO-STANDALONE-NO-DOCKERFILE';
        Message = "Nema Dockerfile u paketu i nema output standalone u next.config - veza sa Talas 99 (NO-DOCKERFILE); standalone olaksava container image"
      }) | Out-Null
    }
  }
}

$majRows = @($withNext | ForEach-Object {
  if ($_.Major) {
    [pscustomobject]@{ Root = $_.Root; Major = $_.Major }
  }
})
if ($majRows.Count -ge 2) {
  $uniq = @($majRows | ForEach-Object { $_.Major } | Select-Object -Unique)
  if ($uniq.Count -gt 1) {
    $detail = ($majRows | ForEach-Object { "$($_.Root)=v$($_.Major)" }) -join ', '
    $findings.Add([pscustomobject]@{
      Root = '(cross-package)'; Severity = 'INFO'; Code = 'NEXT-MAJOR-DRIFT';
      Message = "next MAJOR drift preko paketa: $detail"
    }) | Out-Null
  }
}

Write-Host "== Paketi sa next dep ==" -ForegroundColor Yellow
if ($withNext.Count -eq 0) {
  Write-Host "  (nijedan od skeniranih paketa nema next dep - ocekivano za API-only pakete)" -ForegroundColor DarkGray
} else {
  $withNext | ForEach-Object {
    [pscustomobject]@{
      Root   = $_.Root
      Ver    = $_.NextVersion
      Config = $_.NextConfig
    }
  } | Format-Table -AutoSize | Out-String | Write-Host
}

$warnFindings = @($findings | Where-Object { $_.Severity -eq 'WARN' })
$infoFindings = @($findings | Where-Object { $_.Severity -eq 'INFO' })

Write-Host ""
Write-Host "== Findings ==" -ForegroundColor Yellow
Write-Host ("  WARN (Next-rizik):        {0}" -f $warnFindings.Count)
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
Write-Host "  - Talas 108: 7. sloj structural config (Next.js entry config)." -ForegroundColor DarkGray
Write-Host '  - run-all-audits.ps1: 39 koraka (37 read-only + TODO + npm); single entry point.' -ForegroundColor DarkGray

if ($FailOnWarn -and $warnFindings.Count -gt 0) {
  Write-Host ""
  Write-Host "FAIL: $($warnFindings.Count) WARN (FailOnWarn)" -ForegroundColor Red
  exit 1
}
exit 0
