<#
.SYNOPSIS
  TypeORM DataSource ulaz (data-source / ormconfig) za Node pakete sa `typeorm` dep-om (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 111: **10. sloj structural config audit-a** posle Nest CLI (Talas 110); pokriva **ORM / persistence bootstrap** sloj. Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa skenira podrazumevano **3 Node paketa** i za svaki koji deklariše **`typeorm`** u `dependencies` ili `devDependencies` validira **4 strukturalne invarijante**:

  1. **DataSource konfiguracioni fajl postoji** (Required-WARN) — kanonski Nest/TypeORM CLI ulaz: `src/database/data-source.ts`, `src/data-source.ts`, ili legacy `ormconfig.json` / `ormconfig.ts` u korenu paketa.
  2. **Fajl nije prazan** (Required-WARN) — mora imati ne-whitespace sadrzaj.
  3. **`synchronize: true` anti-pattern** (Required-WARN) — ako se u tekstu detektuje `synchronize` ukljucen na `true`, prijavi WARN (prod rizik; TypeORM moze menjati semu automatski).
  4. **`typeorm` samo u devDependencies** (Optional-INFO) — runtime servisi obicno imaju `typeorm` u `dependencies` zbog CLI/migracija u kontejneru; ako je samo u devDependencies, prijavi INFO.

  Paketi **bez** `typeorm` dep-a se preskacu (Next-only, Node lib bez ORM — ocekivano).

  Read-only audit. **Nije** deo CI mirror-a (`verify-monorepo.ps1`).

.PARAMETER FailOnWarn
  Exit 1 ako ima WARN nalaza.

.PARAMETER MaxOutput
  Maksimalan broj detaljnih redova (default 200).

.PARAMETER NodePaths
  Relativne putanje Node paketa (default tri monorepo paketa).

.EXAMPLE
  .\scripts\check-typeorm-data-source-consistency.ps1

.EXAMPLE
  .\scripts\check-typeorm-data-source-consistency.ps1 -FailOnWarn

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 111 = ovaj skript; ukupno 39 koraka Talas 65-192).
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

Write-Host "== check-typeorm-data-source-consistency.ps1 - TypeORM DataSource (Talas 111) ==" -ForegroundColor Cyan
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

function Test-HasTypeormDep {
  param(
    [object]$Deps,
    [object]$DevDeps
  )
  if ($Deps -and $Deps.PSObject.Properties['typeorm']) { return $true }
  if ($DevDeps -and $DevDeps.PSObject.Properties['typeorm']) { return $true }
  return $false
}

function Get-TypeormVersion {
  param([object]$Deps, [object]$DevDeps)
  if ($Deps -and $Deps.PSObject.Properties['typeorm']) { return "$($Deps.typeorm)" }
  if ($DevDeps -and $DevDeps.PSObject.Properties['typeorm']) { return "$($DevDeps.typeorm)" }
  return $null
}

function Test-TypeormInDepsOnly {
  param([object]$Deps, [object]$DevDeps)
  if ($Deps -and $Deps.PSObject.Properties['typeorm']) { return $false }
  if ($DevDeps -and $DevDeps.PSObject.Properties['typeorm']) { return $true }
  return $false
}

function Find-TypeormDataSourcePath {
  param([Parameter(Mandatory)] [string]$Root)
  foreach ($rel in @(
      'src/database/data-source.ts',
      'src/database/data-source.js',
      'src/data-source.ts',
      'src/data-source.js',
      'ormconfig.ts',
      'ormconfig.js',
      'ormconfig.json'
    )) {
    $full = Join-Path $Root $rel
    if (Test-Path $full -PathType Leaf) { return $full }
  }
  return $null
}

$findings = [System.Collections.Generic.List[pscustomobject]]::new()
$withTypeorm = [System.Collections.Generic.List[pscustomobject]]::new()

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
  if (-not (Test-HasTypeormDep -Deps $deps -DevDeps $devDeps)) { continue }

  $ver = Get-TypeormVersion -Deps $deps -DevDeps $devDeps
  $row = [pscustomobject]@{
    Root    = $root
    Version = $ver
    DsFile  = '-'
  }

  if (Test-TypeormInDepsOnly -Deps $deps -DevDeps $devDeps) {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'INFO'; Code = 'TYPEORM-IN-DEVDEPS-ONLY';
      Message = 'typeorm je samo u devDependencies (proveri da li CLI/migracije rade u prod image-u)'
    }) | Out-Null
  }

  $dsPath = Find-TypeormDataSourcePath -Root $root
  if (-not $dsPath) {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'WARN'; Code = 'NO-TYPEORM-DATASOURCE';
      Message = 'typeorm dep ali nema src/database/data-source.ts|js, src/data-source.ts|js, ni ormconfig.* u korenu paketa'
    }) | Out-Null
    continue
  }

  $row.DsFile = Split-Path $dsPath -Leaf
  $withTypeorm.Add($row) | Out-Null

  try {
    $raw = Get-Content $dsPath -Raw -Encoding UTF8
    if ([string]::IsNullOrWhiteSpace($raw)) {
      $findings.Add([pscustomobject]@{
        Root = $root; Severity = 'WARN'; Code = 'EMPTY-TYPEORM-DATASOURCE'; Message = "$($row.DsFile) je prazan"
      }) | Out-Null
      continue
    }
  } catch {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'WARN'; Code = 'READ-TYPEORM-DATASOURCE-FAIL'; Message = "Ne mogu procitati $($row.DsFile): $_"
    }) | Out-Null
    continue
  }

  if ($raw -match '(?m)synchronize\s*:\s*true\b') {
    $findings.Add([pscustomobject]@{
      Root = $root; Severity = 'WARN'; Code = 'TYPEORM-SYNCHRONIZE-TRUE';
      Message = 'DataSource/ormconfig ima synchronize:true (anti-pattern za prod sem namernog dev-only)'
    }) | Out-Null
  }
}

$coreRows = @($withTypeorm | Where-Object { $_.Version })
if ($coreRows.Count -ge 2) {
  $vers = @($coreRows | ForEach-Object { $_.Version } | Select-Object -Unique)
  if ($vers.Count -gt 1) {
    $pairs = @($coreRows | ForEach-Object { "$($_.Root)=typeorm $($_.Version)" })
    $findings.Add([pscustomobject]@{
      Root = '(cross-package)'; Severity = 'INFO'; Code = 'TYPEORM-DEP-VERSION-DRIFT';
      Message = "Razlicit typeorm semver string preko paketa: $($pairs -join ', ')"
    }) | Out-Null
  }
}

Write-Host "== Paketi sa typeorm dep ==" -ForegroundColor Yellow
if ($withTypeorm.Count -eq 0) {
  Write-Host "  (nijedan od skeniranih paketa nema typeorm u dependencies ni devDependencies)" -ForegroundColor DarkGray
} else {
  $withTypeorm | ForEach-Object {
    [pscustomobject]@{
      Root   = $_.Root
      Typeorm = $_.Version
      DataSrc = $_.DsFile
    }
  } | Format-Table -AutoSize | Out-String | Write-Host
}

$warnFindings = @($findings | Where-Object { $_.Severity -eq 'WARN' })
$infoFindings = @($findings | Where-Object { $_.Severity -eq 'INFO' })

Write-Host ""
Write-Host "== Findings ==" -ForegroundColor Yellow
Write-Host ("  WARN (TypeORM-rizik):      {0}" -f $warnFindings.Count)
Write-Host ("  INFO (best practice):      {0}" -f $infoFindings.Count)
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
Write-Host "  - Talas 111: 10. sloj structural config (ORM / TypeORM bootstrap)." -ForegroundColor DarkGray
Write-Host "  - Dopuna Talas 98 (lock) i migracionih npm scriptova u Nest paketima." -ForegroundColor DarkGray
Write-Host '  - run-all-audits.ps1: 39 koraka (37 read-only + TODO + npm); single entry point.' -ForegroundColor DarkGray

if ($FailOnWarn -and $warnFindings.Count -gt 0) {
  Write-Host ""
  Write-Host "FAIL: $($warnFindings.Count) WARN (FailOnWarn)" -ForegroundColor Red
  exit 1
}
exit 0
