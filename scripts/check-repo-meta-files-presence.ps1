<#
.SYNOPSIS
  Root-level OSS / GitHub meta fajlovi presence + zdravlje (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 95: nastavak Talas 81 (paket-level `README.md` presence) u **novi sloj — root meta fajlovi koje GitHub renderuje u repo UI-u**: `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `.editorconfig`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`. Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa proverava prisustvo i zdravlje **7 strukturalnih meta fajlova** koje GitHub i OSS konvencija očekuju u korenu:

  1. **`README.md`** (WARN ako nedostaje; INFO duplikat sa Talas 81 koji već skenira README presence preko 7 lokacija) — najvažniji landing dokument; GitHub renderuje na repo home stranici.
  2. **`LICENSE` ili `LICENSE.md` ili `LICENSE.txt`** (WARN ako nedostaje) — GitHub renderuje "License" badge u repo header-u; bez fajla, repo je technically "All rights reserved" bez eksplicitne licence; **dopuna Talas 79** (Talas 79 proverava `license:` polje u `package.json`-u, Talas 95 proverava fizički LICENSE fajl u korenu — komplementarni signali: jedan može postojati bez drugog).
  3. **`SECURITY.md`** (WARN ako nedostaje) — GitHub default ekspektacija; bez fajla, "Security" tab u repo UI-u je prazan; obavezan ako repo prima eksterne PR-ove ili ima public surface; treba da sadrži kontakt za vulnerability disclosure.
  4. **`CONTRIBUTING.md`** (WARN ako nedostaje) — GitHub renderuje link u "Issues" / "Pull Request" template-ima; sadrži granice za PR-ove, merge redosled, agent restrikcije; **trenutno postoji u repu** (root + `atina-platform/atina/`).
  5. **`.editorconfig`** (WARN ako nedostaje) — cross-editor konzistencija (VSCode, Cursor, IntelliJ, Vim) za EOL (`end_of_line`), charset (`charset`), indent_style/indent_size; bez fajla, različiti editori mogu drift-ovati formatiranje preko paketa što izaziva merge-konflikte.
  6. **`CODE_OF_CONDUCT.md`** (INFO; opciono) — open-source konvencija (Contributor Covenant); GitHub linka u "Community Standards"; nije strogo obavezan ali daje signal za inkluzivnu OSS kulturu.
  7. **`CHANGELOG.md`** (INFO; opciono) — keep-a-changelog format; GitHub renderuje u Releases sekciji ako postoji; per-release tracking; nije obavezan ali olakšava vlasniku release management.

  **Per-fajl health check** (samo za fajlove koji postoje):

  - **Postojanje** — `Test-Path` na korenu repoa.
  - **Non-empty** — `Get-Item.Length -gt 0`; **0-byte** se klasifikuje kao `EMPTY` WARN jer GitHub renderuje prazan dokument bez korisnog sadržaja.
  - **Bar 1 H1** (samo za `*.md` fajlove sa code-block fence skip preko Lekcije #17) — bez H1, GitHub render nema naslov; **NO-H1** WARN.
  - **Datum sadrži tekuću ili prošlu godinu** (samo za `LICENSE` koji ima `Copyright (c) YYYY`) — **STALE-COPYRIGHT** INFO ako godina je više od 2 godine stara (npr. 2020 u 2026).

  Read-only audit: ne menja fajlove. **Nije** deo CI mirror-a (`verify-monorepo.ps1` job **`python`** / required check **`Python (Doslednost dok + pytest)`** — `docs/GIT-BRANCH-PROTECTION.md`). Dopuna pre-PR pregleda; smoke (HTTP) i bundled `npm run smoke:all`: `scripts/smoke-stack.ps1` + `atina-platform/atina/docs/operations/release-gate-checklist.md` (*Local notes — Smoke tests*).

.PARAMETER FailOnWarn
  Vraća exit 1 ako bilo koji od 5 obaveznih meta fajlova nedostaje ili je `EMPTY` / `NO-H1` (`README.md`, `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `.editorconfig`). `CODE_OF_CONDUCT.md` i `CHANGELOG.md` su INFO-only i ne podižu exit. Bez ove opcije, uvek vraća 0 (skripta je informativna).

.PARAMETER MaxOutput
  Maksimalan broj redova u Detalji sekciji. Default 200.

.PARAMETER RepoRoot
  Putanja do korena repoa. Default je 1 nivo iznad `scripts/` direktorijuma. Parametrizovan radi testiranja.

.EXAMPLE
  .\scripts\check-repo-meta-files-presence.ps1
  # Default: skenira 7 root-level meta fajlova, prijavljuje WARN/INFO nalaze, exit 0 uvek.

.EXAMPLE
  .\scripts\check-repo-meta-files-presence.ps1 -FailOnWarn
  # Strogi rezim: exit 1 ako bilo koji od 5 obaveznih (README/LICENSE/SECURITY/CONTRIBUTING/.editorconfig) nedostaje ili nije zdrav.

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 95 = ovaj skript; ukupno 39 koraka Talas 65-192).
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
  [string]$RepoRoot
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $RepoRoot) {
  $RepoRoot = Split-Path -Parent $scriptsDir
}
Set-Location $RepoRoot

Write-Host '== check-repo-meta-files-presence.ps1 - root-level OSS/GitHub meta fajlovi presence + zdravlje (informativan) ==' -ForegroundColor Cyan
Write-Host ("   FailOnWarn: {0}" -f $FailOnWarn) -ForegroundColor DarkGray
Write-Host ("   RepoRoot: {0}" -f $RepoRoot) -ForegroundColor DarkGray

# --- Definicija meta fajlova ---
# Type:
#   Required-WARN — fali => WARN (5 fajlova: README, LICENSE, SECURITY, CONTRIBUTING, .editorconfig)
#   Optional-INFO — fali => INFO (2 fajla: CODE_OF_CONDUCT, CHANGELOG)
$metaFiles = @(
  @{ Name = 'README.md'; Candidates = @('README.md'); Type = 'Required-WARN'; CheckH1 = $true; Description = 'Root README.md - GitHub renderuje na repo home stranici' }
  @{ Name = 'LICENSE'; Candidates = @('LICENSE', 'LICENSE.md', 'LICENSE.txt'); Type = 'Required-WARN'; CheckH1 = $false; Description = 'License fajl u korenu - GitHub renderuje "License" badge u repo header-u' }
  @{ Name = 'SECURITY.md'; Candidates = @('SECURITY.md'); Type = 'Required-WARN'; CheckH1 = $true; Description = 'GitHub Security tab - kontakt za vulnerability disclosure' }
  @{ Name = 'CONTRIBUTING.md'; Candidates = @('CONTRIBUTING.md'); Type = 'Required-WARN'; CheckH1 = $true; Description = 'PR granice, merge redosled, agent restrikcije' }
  @{ Name = '.editorconfig'; Candidates = @('.editorconfig'); Type = 'Required-WARN'; CheckH1 = $false; Description = 'Cross-editor konzistencija (EOL, charset, indent_style)' }
  @{ Name = 'CODE_OF_CONDUCT.md'; Candidates = @('CODE_OF_CONDUCT.md'); Type = 'Optional-INFO'; CheckH1 = $true; Description = 'Open-source Contributor Covenant - GitHub Community Standards' }
  @{ Name = 'CHANGELOG.md'; Candidates = @('CHANGELOG.md'); Type = 'Optional-INFO'; CheckH1 = $true; Description = 'Keep-a-changelog format - GitHub Releases tracking' }
)

# --- Helper: skipuj markdown code blokove pre H1 detekcije (Lekcija #17) ---
function Test-HasH1 {
  param([string]$AbsPath)
  $lines = Get-Content -LiteralPath $AbsPath -Encoding UTF8
  $inCodeBlock = $false
  foreach ($line in $lines) {
    $trim = $line.TrimStart()
    if ($trim -match '^```' -or $trim -match '^~~~') {
      $inCodeBlock = -not $inCodeBlock
      continue
    }
    if ($inCodeBlock) { continue }
    if ($line -match '^# ') {
      return $true
    }
  }
  return $false
}

# --- Skeniraj 7 meta fajlova ---
$results = New-Object 'System.Collections.Generic.List[object]'
$findings = New-Object 'System.Collections.Generic.List[object]'

foreach ($meta in $metaFiles) {
  $foundCandidate = $null
  $foundAbsPath = $null
  foreach ($cand in $meta.Candidates) {
    $absPath = Join-Path $RepoRoot $cand
    if (Test-Path $absPath) {
      $foundCandidate = $cand
      $foundAbsPath = $absPath
      break
    }
  }

  $entry = [pscustomobject]@{
    Name = $meta.Name
    Type = $meta.Type
    Candidates = ($meta.Candidates -join ', ')
    Found = ($null -ne $foundCandidate)
    FoundAs = $foundCandidate
    Size = 0
    HasH1 = $null
    Description = $meta.Description
  }

  if ($entry.Found) {
    $entry.Size = (Get-Item -LiteralPath $foundAbsPath).Length
    if ($meta.CheckH1) {
      $entry.HasH1 = Test-HasH1 -AbsPath $foundAbsPath
    }
  }

  $results.Add($entry) | Out-Null

  # --- Validacija ---
  if (-not $entry.Found) {
    $sev = if ($meta.Type -eq 'Required-WARN') { 'WARN' } else { 'INFO' }
    $findings.Add([pscustomobject]@{
      Meta = $meta.Name
      Severity = $sev
      Code = 'MISSING'
      Detail = ("{0} (kandidati: {1}) - {2}" -f $meta.Name, ($meta.Candidates -join ' / '), $meta.Description)
    }) | Out-Null
    continue
  }

  if ($entry.Size -eq 0) {
    $sev = if ($meta.Type -eq 'Required-WARN') { 'WARN' } else { 'INFO' }
    $findings.Add([pscustomobject]@{
      Meta = $meta.Name
      Severity = $sev
      Code = 'EMPTY'
      Detail = ("{0} postoji ali je 0-byte - GitHub render nema sadrzaja" -f $entry.FoundAs)
    }) | Out-Null
    continue
  }

  if ($meta.CheckH1 -and $entry.HasH1 -eq $false) {
    $sev = if ($meta.Type -eq 'Required-WARN') { 'WARN' } else { 'INFO' }
    $findings.Add([pscustomobject]@{
      Meta = $meta.Name
      Severity = $sev
      Code = 'NO-H1'
      Detail = ("{0} nema H1 heading (# Naslov) - GitHub render nema naslov; code blokovi preskoceni per Lekciji #17" -f $entry.FoundAs)
    }) | Out-Null
  }
}

# --- Sumarni izveštaj ---
$warns = @($findings | Where-Object { $_.Severity -eq 'WARN' })
$infos = @($findings | Where-Object { $_.Severity -eq 'INFO' })

Write-Host ''
Write-Host '== Root meta fajlovi presence rezime ==' -ForegroundColor Cyan
Write-Host ("  Meta fajlova proverljivo:     {0}" -f $results.Count)
Write-Host ("  WARN (obavezni nedostaju):    {0}" -f $warns.Count)
Write-Host ("  INFO (opcioni nedostaju):     {0}" -f $infos.Count)

# --- Tabela ---
Write-Host ''
Write-Host '== Tabela meta fajlova ==' -ForegroundColor Cyan
$results |
  Select-Object @{N='Meta';E={$_.Name}}, @{N='Tip';E={if ($_.Type -eq 'Required-WARN') { 'Required' } else { 'Optional' }}}, @{N='Found';E={$_.Found}}, @{N='As';E={if ($_.FoundAs) { $_.FoundAs } else { '-' }}}, @{N='Bytes';E={$_.Size}}, @{N='H1';E={if ($null -eq $_.HasH1) { 'N/A' } elseif ($_.HasH1) { 'Yes' } else { 'NO' }}} |
  Format-Table -AutoSize | Out-String | Write-Host

# --- Detalji WARN + INFO ---
if ($findings.Count -gt 0) {
  Write-Host '== Detalji nalaza (WARN prvo, INFO posle) ==' -ForegroundColor Cyan
  $sorted = $findings | Sort-Object @{Expression='Severity'; Descending=$false}, Meta, Code
  $sorted | Select-Object -First $MaxOutput | ForEach-Object {
    $color = if ($_.Severity -eq 'WARN') { 'Yellow' } else { 'DarkGray' }
    Write-Host ("  [{0}] {1} :: {2}" -f $_.Severity, $_.Meta, $_.Code) -ForegroundColor $color
    Write-Host ("    {0}" -f $_.Detail) -ForegroundColor DarkGray
  }
}

Write-Host ''
Write-Host 'Napomene:' -ForegroundColor DarkGray
Write-Host '  - Komplementarni audit: Talas 81 check-readme-presence.ps1 skenira README.md preko 7 paket-level lokacija; Talas 95 fokusiran na 7 root meta fajlova GitHub renderuje u repo UI.'
Write-Host '  - Talas 79 proverava license: polje u package.json-u; Talas 95 proverava fizicki LICENSE fajl u korenu - dva komplementarna signala.'
Write-Host '  - Vlasnik akcija opciono: dodavanje LICENSE / SECURITY.md / .editorconfig u koren ako audit prijavi WARN.'
Write-Host '  - Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md).'
Write-Host '  - Smoke (HTTP) i bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).'
Write-Host '  - Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md (LATEST verify Val 355; smoke Val 351).'
Write-Host '  - Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md i docs/NIVO-1-DRYRUN-LOG.md.'

if ($FailOnWarn -and $warns.Count -gt 0) {
  exit 1
}
exit 0
