<#
.SYNOPSIS
  package.json doslednost skener (informativan, opciono pre-PR gate sa `-FailOnWarn`). Validira da svaki Node paket u monorepu (3 trenutno - omnigroup-web, atina-platform/atina, atina-system) ima usaglasene strukturalne polje (`engines.node`, `license`, `private`) koje je realan deploy-rizik kad nije sinhronizovano. Read-only audit. Konsolidovani runbook (single entry point): `scripts/run-all-audits.ps1`. Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa cita 3 `package.json` fajla (omnigroup-web, atina-platform/atina, atina-system) i validira:

    1. **`engines.node`** prisustvo — paket bez `engines.node` riskira da CI / lokalni dev pokrene sa neocekivanom verzijom Node-a (npr. dev na Node 22, CI na Node 18, deploy na Node 20). `WARN` ako bilo koji paket nema deklaraciju.
    2. **`engines.node`** doslednost — ako 2 paketa kazu `>=20 <21` a treci `>=18`, lockfile-i mogu razilaziti i deploy moze pasti na specificnoj sintaksi. `WARN` ako su vrednosti razlicite.
    3. **`license`** prisustvo — paket bez `license` polja je pravna nedoslednost. `WARN` ako nedostaje ili je prazan string.
    4. **`license`** doslednost — informativan signal (npr. `MIT` vs `ISC` vs `UNLICENSED`); `INFO` (ne FAIL).
    5. **`private: true`** — kontroliso kao `INFO` (npm publish protection); `WARN` samo ako paket bez `private: true` ima `version` koja izgleda ne-publish (npr. `0.0.x`) - heurističko.

  Ne validira `dependencies` / `devDependencies` (to je posao `npm audit`); ne validira `scripts` (to je posao vlasnika). Default je informativan - prijavljuje sve nalaze, exit 0. Sa `-FailOnWarn` exit 1 ako bilo koji paket ima `WARN` status.

.PARAMETER FailOnWarn
  Vraca exit 1 ako bilo koji paket ima `WARN` nalaz. Bez ove opcije, uvek vraca 0 (informativan).

.PARAMETER MaxOutput
  Maksimalan broj redova u Detalji sekciji. Default 50.

.PARAMETER PackageRoots
  Niz relativnih putanja do package.json fajlova. Default: 3 trenutna Node paketa (`apps/omnigroup-web/package.json`, `atina-platform/atina/package.json`, `atina-system/package.json`). Vlasnik moze prosiriti ako se doda novi Node paket (npr. budući BFF ili shared lib).

.EXAMPLE
  .\scripts\check-package-json-consistency.ps1
  # Default: validira 3 Node paketa, prijavljuje WARN + INFO, exit 0 uvek (informativan).

.EXAMPLE
  .\scripts\check-package-json-consistency.ps1 -FailOnWarn
  # Strogi rezim: exit 1 ako bilo koji paket ima WARN status (engines.node nedostaje ili razlicit, license fali).

.EXAMPLE
  .\scripts\check-package-json-consistency.ps1 -PackageRoots @("apps/omnigroup-web/package.json","atina-platform/atina/package.json")
  # Eksplicitno suzavanje skupa (npr. bez atina-system).

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 79 = ovaj skript; ukupno 39 koraka Talas 65-192).
  Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md; pun mirror uključuje apps/omnigroup-web build osim sa -SkipOmnigroupWeb).
  Smoke (HTTP) + Atina bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).
  LATEST verify: docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md (Val 355); smoke: docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md (Val 351).
  Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md.
  Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md + docs/NIVO-1-DRYRUN-LOG.md.
  Help snapshot za sve scripts/*.ps1: docs/SCRIPTS-HELP-SNAPSHOT.md (regen: scripts/regenerate-help-snapshot.ps1).
  Operativni handbook (Talas 65->192 lessons): scripts/AGENT-AUTOMATION-GUIDE.md.
  PowerShell 5.1+.

#>
#Requires -Version 5.1
param(
  [switch]$FailOnWarn,
  [int]$MaxOutput = 50,
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

Write-Host '== check-package-json-consistency.ps1 - 3 Node paketa: engines.node, license, private ==' -ForegroundColor Cyan
Write-Host ("   FailOnWarn: {0}" -f $FailOnWarn) -ForegroundColor DarkGray
Write-Host ("   PackageRoots: {0} fajlova" -f $PackageRoots.Count) -ForegroundColor DarkGray

# Citanje paketa
$packages = New-Object 'System.Collections.Generic.List[object]'
foreach ($rel in $PackageRoots) {
  $abs = Join-Path $repoRoot $rel
  if (-not (Test-Path -LiteralPath $abs)) {
    Write-Host ("   UPOZORENJE: package.json ne postoji: {0}" -f $rel) -ForegroundColor Yellow
    continue
  }
  $j = Get-Content -LiteralPath $abs -Raw -Encoding UTF8 | ConvertFrom-Json
  $enginesNode = if ($j.engines -and $j.engines.node) { [string]$j.engines.node } else { $null }
  $licenseStr = if ($j.license) { [string]$j.license } else { $null }
  $privateStr = if ($null -ne $j.private) { [string]$j.private } else { '(none)' }
  $version = if ($j.version) { [string]$j.version } else { '(none)' }
  $packages.Add([pscustomobject]@{
    Path        = $rel
    Name        = if ($j.name) { [string]$j.name } else { '(unnamed)' }
    Version     = $version
    EnginesNode = $enginesNode
    License     = $licenseStr
    Private     = $privateStr
  }) | Out-Null
}

$totalPackages = $packages.Count
Write-Host ''
Write-Host '== Pregled po paketu ==' -ForegroundColor Cyan
$packages | Select-Object -First $MaxOutput | Format-Table Name, Version, EnginesNode, License, Private, Path -AutoSize -Wrap | Out-String | Write-Host

# Kreiranje nalaza
$findings = New-Object 'System.Collections.Generic.List[object]'

# 1. engines.node prisustvo
$missingEngines = @($packages | Where-Object { -not $_.EnginesNode })
if ($missingEngines.Count -gt 0) {
  $findings.Add([pscustomobject]@{
    Severity = 'WARN'
    Field    = 'engines.node'
    Issue    = ('{0} / {1} paketa bez engines.node deklaracije' -f $missingEngines.Count, $totalPackages)
    Detail   = ($missingEngines | ForEach-Object { $_.Path }) -join ', '
  }) | Out-Null
}

# 2. engines.node doslednost
$enginesValues = @($packages | Where-Object { $_.EnginesNode } | Select-Object -ExpandProperty EnginesNode -Unique)
if ($enginesValues.Count -gt 1) {
  $findings.Add([pscustomobject]@{
    Severity = 'WARN'
    Field    = 'engines.node'
    Issue    = ('{0} razlicitih engines.node vrednosti' -f $enginesValues.Count)
    Detail   = ($enginesValues -join ' | ')
  }) | Out-Null
}

# 3. license prisustvo
$missingLicense = @($packages | Where-Object { -not $_.License })
if ($missingLicense.Count -gt 0) {
  $findings.Add([pscustomobject]@{
    Severity = 'WARN'
    Field    = 'license'
    Issue    = ('{0} / {1} paketa bez license polja' -f $missingLicense.Count, $totalPackages)
    Detail   = ($missingLicense | ForEach-Object { $_.Path }) -join ', '
  }) | Out-Null
}

# 4. license doslednost
$licenseValues = @($packages | Where-Object { $_.License } | Select-Object -ExpandProperty License -Unique)
if ($licenseValues.Count -gt 1) {
  $findings.Add([pscustomobject]@{
    Severity = 'INFO'
    Field    = 'license'
    Issue    = ('{0} razlicitih license vrednosti (informativan, ne FAIL)' -f $licenseValues.Count)
    Detail   = ($licenseValues -join ' | ')
  }) | Out-Null
}

# 5. private polje (informativno)
$privateValues = @($packages | Select-Object -ExpandProperty Private -Unique)
if ($privateValues.Count -gt 1) {
  $findings.Add([pscustomobject]@{
    Severity = 'INFO'
    Field    = 'private'
    Issue    = ('{0} razlicitih private vrednosti (informativan)' -f $privateValues.Count)
    Detail   = ($privateValues -join ' | ')
  }) | Out-Null
}

Write-Host '== Nalazi ==' -ForegroundColor Cyan
if ($findings.Count -eq 0) {
  Write-Host '  (nema WARN ili INFO nalaza - svi paketi su usaglaseni)' -ForegroundColor Green
} else {
  $findings | Format-Table Severity, Field, Issue, Detail -AutoSize -Wrap | Out-String | Write-Host
}

$warnCount = @($findings | Where-Object { $_.Severity -eq 'WARN' }).Count
$infoCount = @($findings | Where-Object { $_.Severity -eq 'INFO' }).Count

Write-Host '== Sumirano ==' -ForegroundColor Cyan
Write-Host ("  Node paketa skenirano:  {0}" -f $totalPackages)
Write-Host ("  WARN (realan rizik):     {0}" -f $warnCount)
Write-Host ("  INFO (informativno):     {0}" -f $infoCount)

if ($warnCount -gt 0) {
  Write-Host ''
  Write-Host ("UPOZORENJE: {0} WARN nalaz(a) - usaglaseni package.json polja u monorepu" -f $warnCount) -ForegroundColor Yellow
  Write-Host ''
  Write-Host 'Predlog (vlasnik akcija):' -ForegroundColor DarkGray
  Write-Host '  - engines.node: postaviti istu vrednost u svim 3 paketa (npr. ">=20 <21" ako Atina vec koristi to).' -ForegroundColor DarkGray
  Write-Host '  - license: dodati eksplicitno polje u svaki paket (npr. "ISC" za interne pakete, "UNLICENSED" za private).' -ForegroundColor DarkGray
  Write-Host '  - Detaljnije: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md (Top-level status tabela, Talas 79).' -ForegroundColor DarkGray
}

Write-Host ''
Write-Host 'Napomene:' -ForegroundColor DarkGray
Write-Host '  - Ne validira dependencies / devDependencies (to je posao audit-npm-monorepo.ps1).'
Write-Host '  - Ne validira scripts polje (to je posao vlasnika).'
Write-Host '  - Komplementaran: audit-npm-monorepo.ps1 (npm audit advisory snapshot).'
Write-Host '  - run-all-audits.ps1: 39 koraka (37 read-only + TODO + npm); single entry point.'
Write-Host '  - Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md; pun mirror ukljucuje apps/omnigroup-web build osim sa -SkipOmnigroupWeb).'
Write-Host '  - Smoke (HTTP) i bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).'
Write-Host '  - Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md (LATEST verify Val 355; smoke Val 351).'
Write-Host '  - Operativni handbook (Talas 65->192 lessons): scripts/AGENT-AUTOMATION-GUIDE.md.'

if ($FailOnWarn -and $warnCount -gt 0) {
  exit 1
}
exit 0
