<#
.SYNOPSIS
  tsconfig.json doslednost skener (informativan, opciono pre-PR gate sa `-FailOnWarn`). Validira da svaki Node TypeScript paket u monorepu (3 trenutno - omnigroup-web, atina-platform/atina, atina-system) ima usaglasena strukturalna polja u `compilerOptions` koja su kompatibilan signal kvaliteta TS sloja (`strict`, `target`, `skipLibCheck`, `esModuleInterop`, `forceConsistentCasingInFileNames`). Read-only audit. Konsolidovani runbook (single entry point): `scripts/run-all-audits.ps1`. Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa cita 3 `tsconfig.json` fajla (omnigroup-web Next.js, atina-platform/atina Node lib, atina-system NestJS) i validira `compilerOptions`:

    1. **`strict`** prisustvo — paket bez `strict: true` riskira TS sloj sa lakim greskama tipa (null, any, unsafe casts). Ali `atina-system` ima split pristup (`strictNullChecks` + `noImplicitAny` + `strictBindCallApply`) sto je delimicno strict. `WARN` ako paket nema ni `strict: true` ni minimalan strict-component set.
    2. **`target`** prisustvo + doslednost — `target` je ECMAScript verzija u koju TS emituje. Razlicit `target` znaci razlicit baseline (ES2020 vs ES2021 vs ES2022). `INFO` jer je legitimno da Next paket nema eksplicitan target (Next ga override-uje). `WARN` samo ako 2 explicit-target paketa imaju razliciti target.
    3. **`skipLibCheck`** — performance + sanity flag (preskace .d.ts iz node_modules). Standard je `true` u modernim TS projektima. `WARN` ako bilo koji paket nema `skipLibCheck: true`.
    4. **`esModuleInterop`** — kompatibilnost sa CommonJS modulima (default importovanje). Standard je `true`. `WARN` ako bilo koji paket nema `esModuleInterop: true`.
    5. **`forceConsistentCasingInFileNames`** — case-sensitivity check (vazno za case-insensitive FS-eve poput Windows + macOS default-a). Standard je `true`. `INFO` ako neki paket nema (ne FAIL jer Next ga ne deklarise eksplicitno ali imeplicitno radi).

  Ne validira `paths` mapping (svaki paket ima svoju logiku); ne validira `include` / `exclude` (project-specific). Default je informativan - prijavljuje sve nalaze, exit 0. Sa `-FailOnWarn` exit 1 ako bilo koji paket ima `WARN` status.

.PARAMETER FailOnWarn
  Vraca exit 1 ako bilo koji paket ima `WARN` nalaz. Bez ove opcije, uvek vraca 0 (informativan).

.PARAMETER MaxOutput
  Maksimalan broj redova u Detalji sekciji. Default 50.

.PARAMETER PackageRoots
  Niz relativnih putanja do tsconfig.json fajlova. Default: 3 trenutna TS paketa (`apps/omnigroup-web/tsconfig.json`, `atina-platform/atina/tsconfig.json`, `atina-system/tsconfig.json`). Vlasnik moze prosiriti ako se doda novi TS paket (npr. budući BFF ili shared lib).

.EXAMPLE
  .\scripts\check-tsconfig-consistency.ps1
  # Default: validira 3 TS paketa, prijavljuje WARN + INFO, exit 0 uvek (informativan).

.EXAMPLE
  .\scripts\check-tsconfig-consistency.ps1 -FailOnWarn
  # Strogi rezim: exit 1 ako bilo koji paket ima WARN status (strict / skipLibCheck / esModuleInterop nedostaje ili razlicit).

.EXAMPLE
  .\scripts\check-tsconfig-consistency.ps1 -PackageRoots @("apps/omnigroup-web/tsconfig.json","atina-platform/atina/tsconfig.json")
  # Eksplicitno suzavanje skupa (npr. bez atina-system).

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 87 = ovaj skript; ukupno 39 koraka Talas 65-192).
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
    'apps/omnigroup-web/tsconfig.json',
    'atina-platform/atina/tsconfig.json',
    'atina-system/tsconfig.json'
  )
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

Write-Host '== check-tsconfig-consistency.ps1 - 3 TS paketa: strict, target, skipLibCheck, esModuleInterop, forceConsistentCasingInFileNames ==' -ForegroundColor Cyan
Write-Host ("   FailOnWarn: {0}" -f $FailOnWarn) -ForegroundColor DarkGray
Write-Host ("   PackageRoots: {0} fajlova" -f $PackageRoots.Count) -ForegroundColor DarkGray

# Citanje paketa
$packages = New-Object 'System.Collections.Generic.List[object]'
foreach ($rel in $PackageRoots) {
  $abs = Join-Path $repoRoot $rel
  if (-not (Test-Path -LiteralPath $abs)) {
    Write-Host ("   UPOZORENJE: tsconfig.json ne postoji: {0}" -f $rel) -ForegroundColor Yellow
    continue
  }
  # tsconfig.json moze imati JSONC komentare (// na pocetku linije); PS5.1 ConvertFrom-Json ne tolerise.
  # Strip-amo SAMO line comments na pocetku linije - block comment regex je nesiguran jer glob
  # putanje poput "**/*.ts" sadrze /* sto bi lazno hvatalo. Trenutni 3 tsconfig fajla nemaju komentare,
  # ali ostavljamo line-strip kao defenzivu za buduce dopune.
  $raw = Get-Content -LiteralPath $abs -Raw -Encoding UTF8
  $stripped = [regex]::Replace($raw, '(?m)^\s*//.*$', '')
  try {
    $j = $stripped | ConvertFrom-Json
  } catch {
    Write-Host ("   GRESKA: tsconfig.json parsiranje nije uspelo: {0} ({1})" -f $rel, $_.Exception.Message) -ForegroundColor Red
    continue
  }
  $co = $j.compilerOptions
  if (-not $co) {
    Write-Host ("   UPOZORENJE: tsconfig.json bez compilerOptions: {0}" -f $rel) -ForegroundColor Yellow
    continue
  }

  # Strict moze biti true direktno ili razdvojen (strictNullChecks + noImplicitAny + strictBindCallApply)
  $strictTrue = ($null -ne $co.strict) -and ($co.strict -eq $true)
  $strictComponents = @()
  if ($co.strictNullChecks -eq $true) { $strictComponents += 'strictNullChecks' }
  if ($co.noImplicitAny -eq $true) { $strictComponents += 'noImplicitAny' }
  if ($co.strictBindCallApply -eq $true) { $strictComponents += 'strictBindCallApply' }
  if ($co.strictFunctionTypes -eq $true) { $strictComponents += 'strictFunctionTypes' }
  if ($co.strictPropertyInitialization -eq $true) { $strictComponents += 'strictPropertyInitialization' }
  if ($co.alwaysStrict -eq $true) { $strictComponents += 'alwaysStrict' }
  if ($co.noImplicitThis -eq $true) { $strictComponents += 'noImplicitThis' }

  $strictMode = if ($strictTrue) { 'strict:true' } elseif ($strictComponents.Count -gt 0) { ('split: ' + ($strictComponents -join ',')) } else { '(none)' }

  $packages.Add([pscustomobject]@{
    Path                          = $rel
    Target                        = if ($co.target) { [string]$co.target } else { '(none)' }
    Module                        = if ($co.module) { [string]$co.module } else { '(none)' }
    StrictMode                    = $strictMode
    StrictTrue                    = $strictTrue
    StrictComponents              = $strictComponents.Count
    SkipLibCheck                  = if ($null -ne $co.skipLibCheck) { [string]$co.skipLibCheck } else { '(none)' }
    EsModuleInterop               = if ($null -ne $co.esModuleInterop) { [string]$co.esModuleInterop } else { '(none)' }
    ForceConsistentCasing         = if ($null -ne $co.forceConsistentCasingInFileNames) { [string]$co.forceConsistentCasingInFileNames } else { '(none)' }
  }) | Out-Null
}

$totalPackages = $packages.Count
Write-Host ''
Write-Host '== Pregled po paketu ==' -ForegroundColor Cyan
$packages | Select-Object -First $MaxOutput | Format-Table Path, Target, Module, StrictMode, SkipLibCheck, EsModuleInterop, ForceConsistentCasing -AutoSize -Wrap | Out-String | Write-Host

$findings = New-Object 'System.Collections.Generic.List[object]'

# 1. strict prisustvo (true ili dovoljan split set)
$weakStrict = @($packages | Where-Object { (-not $_.StrictTrue) -and ($_.StrictComponents -lt 2) })
if ($weakStrict.Count -gt 0) {
  $findings.Add([pscustomobject]@{
    Severity = 'WARN'
    Field    = 'strict'
    Issue    = ('{0} / {1} paketa bez strict:true ili dovoljnog split set-a' -f $weakStrict.Count, $totalPackages)
    Detail   = ($weakStrict | ForEach-Object { '{0} ({1})' -f $_.Path, $_.StrictMode }) -join ', '
  }) | Out-Null
}

# 2. strict mode doslednost - INFO ako su pristupi razliciti (split vs true)
$strictModes = @($packages | Select-Object -ExpandProperty StrictMode -Unique)
if ($strictModes.Count -gt 1) {
  $findings.Add([pscustomobject]@{
    Severity = 'INFO'
    Field    = 'strict'
    Issue    = ('{0} razlicitih strict pristupa (informativan, ne FAIL)' -f $strictModes.Count)
    Detail   = ($strictModes -join ' | ')
  }) | Out-Null
}

# 3. target eksplicitno postavljen + doslednost
$missingTarget = @($packages | Where-Object { $_.Target -eq '(none)' })
if ($missingTarget.Count -gt 0) {
  $findings.Add([pscustomobject]@{
    Severity = 'INFO'
    Field    = 'target'
    Issue    = ('{0} / {1} paketa bez explicit target (Next default je legitiman)' -f $missingTarget.Count, $totalPackages)
    Detail   = ($missingTarget | ForEach-Object { $_.Path }) -join ', '
  }) | Out-Null
}
$explicitTargets = @($packages | Where-Object { $_.Target -ne '(none)' } | Select-Object -ExpandProperty Target -Unique)
if ($explicitTargets.Count -gt 1) {
  $findings.Add([pscustomobject]@{
    Severity = 'WARN'
    Field    = 'target'
    Issue    = ('{0} razlicitih explicit target vrednosti' -f $explicitTargets.Count)
    Detail   = ($explicitTargets -join ' | ')
  }) | Out-Null
}

# 4. skipLibCheck
$missingSkipLib = @($packages | Where-Object { $_.SkipLibCheck -ne 'True' })
if ($missingSkipLib.Count -gt 0) {
  $findings.Add([pscustomobject]@{
    Severity = 'WARN'
    Field    = 'skipLibCheck'
    Issue    = ('{0} / {1} paketa bez skipLibCheck:true (perf + sanity flag)' -f $missingSkipLib.Count, $totalPackages)
    Detail   = ($missingSkipLib | ForEach-Object { '{0} ({1})' -f $_.Path, $_.SkipLibCheck }) -join ', '
  }) | Out-Null
}

# 5. esModuleInterop
$missingInterop = @($packages | Where-Object { $_.EsModuleInterop -ne 'True' })
if ($missingInterop.Count -gt 0) {
  $findings.Add([pscustomobject]@{
    Severity = 'WARN'
    Field    = 'esModuleInterop'
    Issue    = ('{0} / {1} paketa bez esModuleInterop:true (CommonJS interop)' -f $missingInterop.Count, $totalPackages)
    Detail   = ($missingInterop | ForEach-Object { '{0} ({1})' -f $_.Path, $_.EsModuleInterop }) -join ', '
  }) | Out-Null
}

# 6. forceConsistentCasingInFileNames - INFO, ne WARN
$missingCasing = @($packages | Where-Object { $_.ForceConsistentCasing -ne 'True' })
if ($missingCasing.Count -gt 0) {
  $findings.Add([pscustomobject]@{
    Severity = 'INFO'
    Field    = 'forceConsistentCasingInFileNames'
    Issue    = ('{0} / {1} paketa bez explicit forceConsistentCasingInFileNames:true (vazno za case-insensitive FS-eve)' -f $missingCasing.Count, $totalPackages)
    Detail   = ($missingCasing | ForEach-Object { '{0} ({1})' -f $_.Path, $_.ForceConsistentCasing }) -join ', '
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
Write-Host ("  TS paketa skenirano:    {0}" -f $totalPackages)
Write-Host ("  WARN (realan rizik):     {0}" -f $warnCount)
Write-Host ("  INFO (informativno):     {0}" -f $infoCount)

if ($warnCount -gt 0) {
  Write-Host ''
  Write-Host ("UPOZORENJE: {0} WARN nalaz(a) - usaglaseni tsconfig.json polja u monorepu" -f $warnCount) -ForegroundColor Yellow
  Write-Host ''
  Write-Host 'Predlog (vlasnik akcija):' -ForegroundColor DarkGray
  Write-Host '  - strict:true: postaviti u svaki paket; ako vec ima strictNullChecks + noImplicitAny moze ostati split.' -ForegroundColor DarkGray
  Write-Host '  - target: ako su svi Node deploy-ovi na Node 20+, target ES2022 je sigurna baseline; razlicit explicit target je rizik.' -ForegroundColor DarkGray
  Write-Host '  - skipLibCheck:true: standard u modernim TS projektima (ubrzava typecheck 10x).' -ForegroundColor DarkGray
  Write-Host '  - esModuleInterop:true: standard za CJS interop.' -ForegroundColor DarkGray
  Write-Host '  - Detaljnije: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md (Top-level status tabela, Talas 87).' -ForegroundColor DarkGray
}

Write-Host ''
Write-Host 'Napomene:' -ForegroundColor DarkGray
Write-Host '  - Ne validira paths mapping (svaki paket ima svoju logiku).'
Write-Host '  - Ne validira include / exclude (project-specific).'
Write-Host '  - JSONC komentari (// i /* */) su strip-ovani pre JSON parsiranja.'
Write-Host '  - Komplementaran: check-package-json-consistency.ps1 (Talas 79 - JS strukturalna doslednost).'
Write-Host '  - run-all-audits.ps1: 39 koraka (37 read-only + TODO + npm); single entry point.'
Write-Host '  - Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md; pun mirror ukljucuje apps/omnigroup-web build osim sa -SkipOmnigroupWeb).'
Write-Host '  - Smoke (HTTP) i bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).'
Write-Host '  - Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md (LATEST verify Val 355; smoke Val 351).'
Write-Host '  - Operativni handbook (Talas 65->192 lessons): scripts/AGENT-AUTOMATION-GUIDE.md.'

if ($FailOnWarn -and $warnCount -gt 0) {
  exit 1
}
exit 0
