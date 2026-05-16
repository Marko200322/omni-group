<#
.SYNOPSIS
  Talas N cross-reference skener (informativan, **nije** CI gate). Verifikuje da li svaki `Talas N` agent-rada od 2026-05-14 (default `-Since 70`) ima usklađene zapise u `docs/MASTER-WORK-LIST.md` (sekcija 1.1), `docs/NIVO-1-DRYRUN-LOG.md` (formalni dry-run heading "## Zapis (izvršen) — Talas N") i `docs/AGENT-WORK-2026-05-14-SUMMARY.md` (sekcija `### N.M ... Talas N`). Sa `-IncludeIndex` proširuje na 4-way obrazac sa `docs/TALAS-INDEX.md` tabelom (Talas 88+). Konsolidovani runbook (single entry point): `scripts/run-all-audits.ps1`. Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa parsira tri (3-way default) ili četiri (4-way sa `-IncludeIndex`, Talas 89+) ključna dokumenta i ekstraktuje sve `Talas N` brojeve iz njihovih obrazaca:
    1. `docs/MASTER-WORK-LIST.md` - sekcija 1.1 entry obrazac: red koji počinje sa `- [x]` ili `- [ ]` i sadrži `Talas (\d+)` u sažetku.
    2. `docs/NIVO-1-DRYRUN-LOG.md` - formalni dry-run obrazac: red koji počinje sa `## Zapis (izvršen)` i sadrži `Talas (\d+)`.
    3. `docs/AGENT-WORK-2026-05-14-SUMMARY.md` - sekcijski obrazac: red koji počinje sa `### N.M` (sekcija 1.X iz odjeljka "1) Što je zatvoreno autonomno") i sadrži `Talas (\d+)`.
    4. (sa `-IncludeIndex`) `docs/TALAS-INDEX.md` - chronological tabela: red koji počinje sa `| **N** |` (Talas 88+ uveo TALAS-INDEX kao 4. obavezno mesto za agent automation talas-eve).
  Computes 3 (ili 4) SET-a i reportuje misalignement za svaki Talas N >= `-Since` (default 70 — od kad je dry-run obrazac formalno uveden 2026-05-14 u Talas 70):
    - **Master, ne dry-run:** Talas u Master-Work-List sekcija 1.1, ali bez formalnog `## Zapis (izvršen)` u dry-run-u. Tipično znači da treba dopuniti dry-run.
    - **Master, ne summary:** Talas u Master-Work-List, ali bez `### N.M` sekcije u summary-ju. Tipično znači da treba dopuniti summary.
    - **Dry-run, ne master:** Talas ima formalni dry-run zapis, ali nema entry u Master-Work-List sekcija 1.1. Tipično znači da treba dopuniti master.
    - **Summary, ne master:** Talas ima `### N.M` u summary, ali nema entry u Master-Work-List. Tipično znači da treba dopuniti master.
    - (sa `-IncludeIndex`) **Master, ne TALAS-INDEX:** Talas u master 1.1 ali bez reda u TALAS-INDEX.md tabeli. Tipično znači da agent zaboravi update TALAS-INDEX-a.
  Read-only audit: ne menja fajlove. **Ne** povećava scope `verify-monorepo.ps1` (pun mirror uključuje apps/omnigroup-web build osim sa -SkipOmnigroupWeb; CI mirror ostaje isti — `audit-doc-gate-references.ps1` (Doslednost dok md/txt+yaml/ps1/ini, uklj. par EVIDENCE-INDEX / NIVO-1-DRYRUN-LOG, u scripts/README.md), pytest, Atina test:ci, Omnigroup build, Nest verify:ci, compose). Optional pre-PR check za internu konzistentnost dokumentacije agent-rada.
  Smoke (HTTP) i bundled Atina `npm run smoke:all`: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests). Required-check display: Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md.

.PARAMETER Since
  Najmanji Talas N koji se proverava strogo (inkluzivno). Default `70` — prvi Talas koji ima 3-way usklađenost (Master-Work-List + dry-run + summary). Stariji Talas-i (65 — 69) se ekstraktuju i prikažu kao informativna lista, ali se ne prijavljuju kao misalignement (jer su nastali pre nego što je 3-way obrazac formalno uveden 2026-05-14 u Talas 70).

.PARAMETER FailOnMisalignment
  Vraća exit 1 ako postoji bilo koji misalignement Talas-a >= `-Since`. Bez ove opcije, uvek vraća 0 (skripta je informativna).

.PARAMETER MaxOutput
  Maksimalan broj redova u Detalji sekciji. Default 200.

.PARAMETER IncludeIndex
  Talas 89+: ukljucuje `docs/TALAS-INDEX.md` kao 4. obavezno mesto za agent automation talas-eve (Talas 88 je uveo TALAS-INDEX kao single-source consolidated view). Ekstraktuje Talas N iz `| **N** |` redova u chronological tabeli. Default mod (bez ove opcije) ostaje 3-way (master + dryrun + summary) za nazadnu kompatibilnost.

.EXAMPLE
  .\scripts\check-talas-cross-references.ps1
  # Default: 3-way mod, skenira master + dryrun + summary, prijavljuje misalignement za Talas N >= 70, exit 0 uvek.

.EXAMPLE
  .\scripts\check-talas-cross-references.ps1 -Since 70 -FailOnMisalignment
  # Strožija verifikacija od Talas 70 (3-way); exit 1 ako bilo koji Talas N >= 70 nema usklađene zapise u sve 3 lokacije.

.EXAMPLE
  .\scripts\check-talas-cross-references.ps1 -IncludeIndex
  # 4-way mod (Talas 89+): proverava i da je TALAS-INDEX.md tabela sinhronizovana sa master 1.1.

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 72 = ovaj skript; ukupno 39 koraka Talas 65-**192**).
  Suite integracija: `run-all-audits.ps1` korak 4 prosleđuje `-IncludeIndex` (4-way mod).
  Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md; pun mirror uključuje apps/omnigroup-web build osim sa -SkipOmnigroupWeb).
  Smoke (HTTP) + Atina bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).
  LATEST verify: docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md (Val 355); smoke: docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md (Val 351).
  Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md.
  Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md + docs/NIVO-1-DRYRUN-LOG.md.
  Help snapshot za sve scripts/*.ps1: docs/SCRIPTS-HELP-SNAPSHOT.md (regen: scripts/regenerate-help-snapshot.ps1).
  Operativni handbook (Talas 65→192 lessons): scripts/AGENT-AUTOMATION-GUIDE.md.
  PowerShell 5.1+.

#>
#Requires -Version 5.1
param(
  [int]$Since = 70,
  [switch]$FailOnMisalignment,
  [int]$MaxOutput = 200,
  [switch]$IncludeIndex
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

$masterPath = Join-Path $repoRoot 'docs\MASTER-WORK-LIST.md'
$dryrunPath = Join-Path $repoRoot 'docs\NIVO-1-DRYRUN-LOG.md'
$summaryPath = Join-Path $repoRoot 'docs\AGENT-WORK-2026-05-14-SUMMARY.md'
$indexPath = Join-Path $repoRoot 'docs\TALAS-INDEX.md'

Write-Host '== check-talas-cross-references.ps1 - Talas N uskladjenost (informativan) ==' -ForegroundColor Cyan
Write-Host ("   Since: {0} (Talas N >= {0} se proverava strogo; manje se prikazuje informativno)" -f $Since) -ForegroundColor DarkGray
Write-Host ("   FailOnMisalignment: {0}" -f $FailOnMisalignment) -ForegroundColor DarkGray
Write-Host ("   IncludeIndex (4-way mod sa TALAS-INDEX.md): {0}" -f $IncludeIndex) -ForegroundColor DarkGray

$requiredFiles = @($masterPath, $dryrunPath, $summaryPath)
if ($IncludeIndex) { $requiredFiles += $indexPath }
foreach ($p in $requiredFiles) {
  if (-not (Test-Path $p)) {
    Write-Host ("ERROR: nedostaje fajl: {0}" -f $p) -ForegroundColor Red
    exit 2
  }
}

# --- 1) Master-Work-List sekcija 1.1 entries ---
# Obrazac: linija pocinje sa "- [x]" ili "- [ ]" i sadrzi "Talas (\d+)"
# Ogranicava se na sekciju 1.1 (od heading-a "### 1.1" do sledeceg "### " heading-a)
$masterLines = Get-Content -LiteralPath $masterPath -Encoding UTF8
$inSection11 = $false
$masterTalas = New-Object 'System.Collections.Generic.Dictionary[int,object]'
for ($i = 0; $i -lt $masterLines.Count; $i++) {
  $line = $masterLines[$i]
  if ($line -match '^###\s+1\.1\s') { $inSection11 = $true; continue }
  if ($inSection11 -and $line -match '^###\s') { $inSection11 = $false }  # naredna ### sekcija
  if ($inSection11 -and $line -match '^- \[[x ]\].*?[Tt]alas\s+(\d+)') {
    $n = [int]$Matches[1]
    if (-not $masterTalas.ContainsKey($n)) {
      $snippet = $line.Trim()
      if ($snippet.Length -gt 140) { $snippet = $snippet.Substring(0, 137) + '...' }
      $masterTalas[$n] = [pscustomobject]@{ Line = $i + 1; Snippet = $snippet }
    }
  }
}

# --- 2) Dry-Run formalni zapisi ---
# Obrazac: ## Zapis (izvrsen|izvršen) ... Talas (\d+)
$dryrunLines = Get-Content -LiteralPath $dryrunPath -Encoding UTF8
$dryrunTalas = New-Object 'System.Collections.Generic.Dictionary[int,object]'
for ($i = 0; $i -lt $dryrunLines.Count; $i++) {
  $line = $dryrunLines[$i]
  if ($line -match '^##\s+Zapis.*?[Tt]alas\s+(\d+)') {
    $n = [int]$Matches[1]
    if (-not $dryrunTalas.ContainsKey($n)) {
      $snippet = $line.Trim()
      if ($snippet.Length -gt 140) { $snippet = $snippet.Substring(0, 137) + '...' }
      $dryrunTalas[$n] = [pscustomobject]@{ Line = $i + 1; Snippet = $snippet }
    }
  }
}

# --- 3) Summary sekcije ### N.M ... Talas N ---
# NOTE: Summary obrazac stavlja Talas N na KRAJ linije (npr. "### 1.16 Naslov ... — Talas 73"),
# a naslov moze sadrzati starije Talas reference u opisu (npr. "Talas 65→72 stvarnim stanjem").
# Zato koristimo GREEDY .* (ne .*?) kao u master/dry-run regex-u, da bi hvatali POSLEDNJI Talas N
# u liniji — to je suffix obrazac.
$summaryLines = Get-Content -LiteralPath $summaryPath -Encoding UTF8
$summaryTalas = New-Object 'System.Collections.Generic.Dictionary[int,object]'
for ($i = 0; $i -lt $summaryLines.Count; $i++) {
  $line = $summaryLines[$i]
  if ($line -match '^###\s+\d+\.\d+.*[Tt]alas\s+(\d+)') {
    $n = [int]$Matches[1]
    if (-not $summaryTalas.ContainsKey($n)) {
      $snippet = $line.Trim()
      if ($snippet.Length -gt 140) { $snippet = $snippet.Substring(0, 137) + '...' }
      $summaryTalas[$n] = [pscustomobject]@{ Line = $i + 1; Snippet = $snippet }
    }
  }
}

# --- 4) (Opciono, sa -IncludeIndex) TALAS-INDEX.md chronological tabela ---
# Obrazac: red u markdown tabeli `| **N** | datum | domen | naslov | status |`
# Match: linija pocinje sa "| **" + cifra(e) + "** |" — explicitno stilizovan kao bold (svi redovi u tabeli su bold).
$indexTalas = New-Object 'System.Collections.Generic.Dictionary[int,object]'
if ($IncludeIndex) {
  $indexLines = Get-Content -LiteralPath $indexPath -Encoding UTF8
  for ($i = 0; $i -lt $indexLines.Count; $i++) {
    $line = $indexLines[$i]
    if ($line -match '^\|\s*\*\*(\d+)\*\*\s*\|') {
      $n = [int]$Matches[1]
      if (-not $indexTalas.ContainsKey($n)) {
        $snippet = $line.Trim()
        if ($snippet.Length -gt 140) { $snippet = $snippet.Substring(0, 137) + '...' }
        $indexTalas[$n] = [pscustomobject]@{ Line = $i + 1; Snippet = $snippet }
      }
    }
  }
}

# --- Sjedini sve nadjene Talas N ---
$allKeys = New-Object 'System.Collections.Generic.HashSet[int]'
foreach ($k in $masterTalas.Keys)  { [void]$allKeys.Add($k) }
foreach ($k in $dryrunTalas.Keys)  { [void]$allKeys.Add($k) }
foreach ($k in $summaryTalas.Keys) { [void]$allKeys.Add($k) }
if ($IncludeIndex) {
  foreach ($k in $indexTalas.Keys) { [void]$allKeys.Add($k) }
}
$sortedKeys = $allKeys | Sort-Object -Descending

Write-Host ''
Write-Host '== Detektovani Talas N po lokaciji ==' -ForegroundColor Cyan
Write-Host ("  Master-Work-List 1.1:   {0} jedinstvenih Talas N (range: {1} - {2})" -f $masterTalas.Count,  ($masterTalas.Keys  | Measure-Object -Minimum).Minimum, ($masterTalas.Keys  | Measure-Object -Maximum).Maximum)
Write-Host ("  NIVO-1-DRYRUN-LOG:      {0} jedinstvenih Talas N (range: {1} - {2})" -f $dryrunTalas.Count,  ($dryrunTalas.Keys  | Measure-Object -Minimum).Minimum, ($dryrunTalas.Keys  | Measure-Object -Maximum).Maximum)
Write-Host ("  AGENT-WORK SUMMARY:     {0} jedinstvenih Talas N (range: {1} - {2})" -f $summaryTalas.Count, ($summaryTalas.Keys | Measure-Object -Minimum).Minimum, ($summaryTalas.Keys | Measure-Object -Maximum).Maximum)
if ($IncludeIndex) {
  $idxMin = if ($indexTalas.Count -gt 0) { ($indexTalas.Keys | Measure-Object -Minimum).Minimum } else { 0 }
  $idxMax = if ($indexTalas.Count -gt 0) { ($indexTalas.Keys | Measure-Object -Maximum).Maximum } else { 0 }
  Write-Host ("  TALAS-INDEX.md tabela:  {0} jedinstvenih Talas N (range: {1} - {2})" -f $indexTalas.Count, $idxMin, $idxMax)
}

# --- Misalignement analiza za Talas N >= Since ---
$misalignements = New-Object 'System.Collections.Generic.List[object]'
foreach ($n in $sortedKeys) {
  if ($n -lt $Since) { continue }
  $inMaster = $masterTalas.ContainsKey($n)
  $inDryrun = $dryrunTalas.ContainsKey($n)
  $inSummary = $summaryTalas.ContainsKey($n)
  $inIndex = if ($IncludeIndex) { $indexTalas.ContainsKey($n) } else { $true }
  $aligned = $inMaster -and $inDryrun -and $inSummary
  if ($IncludeIndex) { $aligned = $aligned -and $inIndex }
  if (-not $aligned) {
    $miss = @()
    if (-not $inMaster) { $miss += 'master' }
    if (-not $inDryrun) { $miss += 'dryrun' }
    if (-not $inSummary) { $miss += 'summary' }
    if ($IncludeIndex -and (-not $inIndex)) { $miss += 'index' }
    $row = [pscustomobject]@{
      Talas = $n
      InMaster = $inMaster
      InDryrun = $inDryrun
      InSummary = $inSummary
      Missing = ($miss -join ', ')
    }
    if ($IncludeIndex) {
      $row | Add-Member -NotePropertyName 'InIndex' -NotePropertyValue $inIndex -Force
    }
    $misalignements.Add($row) | Out-Null
  }
}

Write-Host ''
Write-Host '== Misalignement analiza (Talas N >= Since) ==' -ForegroundColor Cyan
$considered = @($sortedKeys | Where-Object { $_ -ge $Since })
Write-Host ("  Razmatrano Talas N >= {0}: {1}" -f $Since, $considered.Count)
$lokacijaLabel = if ($IncludeIndex) { '4 lokacijama (sa TALAS-INDEX)' } else { '3 lokacijama' }
Write-Host ("  Misalignement (nema u svim {0}): {1}" -f $lokacijaLabel, $misalignements.Count)

if ($misalignements.Count -gt 0) {
  Write-Host ''
  Write-Host '== Detalji misalignement-a ==' -ForegroundColor Yellow
  $cols = if ($IncludeIndex) { @('Talas','InMaster','InDryrun','InSummary','InIndex','Missing') } else { @('Talas','InMaster','InDryrun','InSummary','Missing') }
  $misalignements | Sort-Object -Property Talas -Descending | Select-Object -First $MaxOutput | Format-Table -Property $cols -AutoSize | Out-String | Write-Host
}

if ($Since -le 64) {
  $oldOnly = @($sortedKeys | Where-Object { $_ -lt $Since })
  if ($oldOnly.Count -gt 0) {
    Write-Host '== Stariji Talas N (manji od Since, samo informativno) ==' -ForegroundColor Cyan
    Write-Host ("  Detektovano {0} starijih Talas-a (Talas 1 - {1})." -f $oldOnly.Count, ($oldOnly | Measure-Object -Maximum).Maximum)
    Write-Host '  Stariji obrazac: tipicno samo Master-Work-List entry, bez formalnog dry-run / summary para.'
  }
}

Write-Host ''
Write-Host 'Napomene:' -ForegroundColor DarkGray
Write-Host '  - check-doc-links.ps1 dodatno proverava broken / empty target linkove unutar markdown body-ja.'
Write-Host '  - check-dev-docs-coverage.ps1 proverava da svaki *.md fajl bude navigaciono dostupan preko /dev/docs hub-a.'
Write-Host '  - audit-doc-gate-references.ps1 proverava 5 pairing pravila (verify-monorepo / smoke-stack / smoke:all / Python check / EVIDENCE-INDEX paired with NIVO-1-DRYRUN-LOG).'
Write-Host '  - audit-npm-monorepo.ps1 daje npm audit pregled (Atina + Nest + omnigroup-web).'
Write-Host '  - run-all-audits.ps1: 39 koraka (37 read-only + TODO + npm); single entry point.'
Write-Host '  - Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md; pun mirror ukljucuje apps/omnigroup-web build osim sa -SkipOmnigroupWeb).'
Write-Host '  - Smoke (HTTP) i bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).'
Write-Host '  - Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md (LATEST verify Val 355; smoke Val 351).'
Write-Host '  - Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md i docs/NIVO-1-DRYRUN-LOG.md.'

if ($FailOnMisalignment -and $misalignements.Count -gt 0) {
  exit 1
}
exit 0
