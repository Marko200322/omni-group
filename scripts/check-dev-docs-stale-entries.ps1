<#
.SYNOPSIS
  Reverse-coverage skener za `apps/omnigroup-web/src/app/dev/docs/page.tsx` hub: za svaku putanju u `paths: [...]` blokovima validira da target fajl **stvarno postoji** na disku. Komplementaran sa `check-dev-docs-coverage.ps1` (Talas 66, forward: svaki `*.md` u repo-u → da li je u hub-u). Talas 90: monorepo dev/docs hub sad ima **two-way coverage** garanciju. Informativan, **nije** CI gate. Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa parsira `apps/omnigroup-web/src/app/dev/docs/page.tsx` (svi string literale unutar `paths: [...]` blokova) i za svaku ekstraktovanu putanju proverava da target fajl postoji na disku. Postojeći `check-dev-docs-coverage.ps1` (Talas 66) ima opcioni `-ShowStale` mod koji prijavljuje stale putanje, ali samo informativno (ne FAIL-uje gate); takođe meša sa missing prikazom. Talas 90 pravi **eksplicitan dedicated skener** koji:

    1. Daje fokusiran output (samo stale, bez missing); brži kad je vlasnik fokusiran samo na stale.
    2. Ima `-FailOnStale` opcioni gate-flavor za pre-PR provere.
    3. Razlikuje 4 statusa: `OK` (target postoji), `STALE-MISSING` (putanja u hub-u, fajl ne postoji), `EXTERNAL` (putanja sa `http://` ili `https://` — preskočena), `ANCHOR-ONLY` (putanja sadrži `#` anchor — fajl deo se proverava, anchor ne).

  **Razlika od `check-dev-docs-coverage.ps1`:** dva komplementarna pristupa za hub coverage:

  | Skener | Smer | Šta hvata |
  |--------|------|-----------|
  | `check-dev-docs-coverage.ps1` (Talas 66) | **Forward** | `*.md` fajl u repo-u, ali nije u page.tsx hub-u (missing iz hub-a) |
  | `check-dev-docs-stale-entries.ps1` (Talas 90) | **Reverse** | Putanja u page.tsx hub-u, ali fajl ne postoji u repo-u (stale entry u hub-u) |

  Bez Talas 90, ako neki fajl bude izbrisan ili premešten (npr. tokom konsolidacije dokumentacije), `check-dev-docs-coverage.ps1` to ne hvata jer radi suprotno. `check-doc-links.ps1` (Talas 65) hvata stale linkove u markdown body-jima, ali ne i u page.tsx hub-u koji je TSX fajl.

  Read-only audit: ne menja fajlove. **Nije** deo CI mirror-a (`verify-monorepo.ps1` job **`python`** / required check **`Python (Doslednost dok + pytest)`** — `docs/GIT-BRANCH-PROTECTION.md`) i ne menja njegov scope. Dopuna pre-PR pregleda; smoke (HTTP) i bundled `npm run smoke:all`: `scripts/smoke-stack.ps1` + `atina-platform/atina/docs/operations/release-gate-checklist.md` (*Local notes — Smoke tests*).

.PARAMETER FailOnStale
  Vraća exit 1 ako bilo koja putanja u page.tsx hub-u nema target fajl na disku. Bez ove opcije, uvek vraća 0 (skripta je informativna).

.PARAMETER MaxOutput
  Maksimalan broj redova u Detalji sekciji. Default 200.

.PARAMETER PagePath
  Putanja do `page.tsx` fajla relativno na repo root. Default `apps/omnigroup-web/src/app/dev/docs/page.tsx`. Parametrizovan radi nazadne kompatibilnosti i mogućnosti testa.

.EXAMPLE
  .\scripts\check-dev-docs-stale-entries.ps1
  # Default: skenira page.tsx, prijavljuje stale entries, exit 0 uvek.

.EXAMPLE
  .\scripts\check-dev-docs-stale-entries.ps1 -FailOnStale
  # Pre-merge gate-flavor: exit 1 ako bilo koja putanja u hub-u ne postoji u file system-u.

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 90 = ovaj skript; ukupno 39 koraka Talas 65-192).
  Hub eko-sistem (Talas 66 / 90): `check-doc-links.ps1` (markdown); `check-dev-docs-coverage.ps1` (forward: `*.md` → hub); ovaj fajl (reverse: hub → disk).
  Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md; pun mirror uključuje apps/omnigroup-web build osim sa -SkipOmnigroupWeb).
  Smoke (HTTP) + Atina bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes — Smoke tests).
  LATEST verify: docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md (Val 355); smoke: docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md (Val 351).
  Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md.
  Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md · docs/NIVO-1-DRYRUN-LOG.md.
  Help snapshot za sve scripts/*.ps1: docs/SCRIPTS-HELP-SNAPSHOT.md (regen: scripts/regenerate-help-snapshot.ps1).
  PowerShell 5.1+.
#>
#Requires -Version 5.1
param(
  [switch]$FailOnStale,
  [int]$MaxOutput = 200,
  [string]$PagePath = 'apps/omnigroup-web/src/app/dev/docs/page.tsx'
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

$pageAbs = Join-Path $repoRoot $PagePath
if (-not (Test-Path $pageAbs)) {
  Write-Host ("ERROR: page.tsx ne postoji: {0}" -f $pageAbs) -ForegroundColor Red
  exit 2
}

Write-Host '== check-dev-docs-stale-entries.ps1 - reverse hub coverage (informativan) ==' -ForegroundColor Cyan
Write-Host ("   Hub source:  {0}" -f $PagePath) -ForegroundColor DarkGray
Write-Host ("   FailOnStale: {0}" -f $FailOnStale) -ForegroundColor DarkGray

# --- Parse putanje iz `paths: [...]` blokova (isti regex pristup kao check-dev-docs-coverage.ps1) ---
$pageText = Get-Content -LiteralPath $pageAbs -Raw -Encoding UTF8
$entries = New-Object 'System.Collections.Generic.List[object]'
$pathBlockRegex = [regex]"paths:\s*\[(?<inner>[^\]]+)\]"
$stringRegex = [regex]"'([^']+)'"

# Trazimo title za kontekst — ulaz nije apsolutno-precizno mapiran (iste putanje
# se ne ponavljaju u 2 sekcije u hub-u trenutno), ali za izvestaj dajemo sekciju
# pre koje se nalazi paths: [..] blok da bi vlasnik znao gde je stale entry.
$titleRegex = [regex]"title:\s*'([^']+)'"
$lastTitleByPos = @{}
foreach ($tm in $titleRegex.Matches($pageText)) {
  $lastTitleByPos[[int]$tm.Index] = $tm.Groups[1].Value
}
$titleIndices = $lastTitleByPos.Keys | Sort-Object

function Resolve-SectionTitle {
  param([int]$pathBlockStart)
  $candidate = $null
  foreach ($idx in $titleIndices) {
    if ($idx -lt $pathBlockStart) { $candidate = $lastTitleByPos[$idx] } else { break }
  }
  if ($candidate) { return $candidate } else { return '(nepoznato)' }
}

foreach ($m in $pathBlockRegex.Matches($pageText)) {
  $section = Resolve-SectionTitle -pathBlockStart $m.Index
  foreach ($s in $stringRegex.Matches($m.Groups['inner'].Value)) {
    $val = $s.Groups[1].Value.Trim()
    if (-not $val) { continue }
    $entries.Add([pscustomobject]@{
      Section = $section
      RawPath = $val
    }) | Out-Null
  }
}

Write-Host ("   Putanje u hub-u: {0} (jedinstvene + duplikati)" -f $entries.Count) -ForegroundColor DarkGray

# --- Klasifikacija svake putanje ---
$results = New-Object 'System.Collections.Generic.List[object]'
foreach ($e in $entries) {
  $raw = $e.RawPath
  $status = 'OK'
  $resolved = $raw
  $absPath = $null

  if ($raw -match '^https?://') {
    $status = 'EXTERNAL'
  }
  else {
    # Strip anchor (#...) ako postoji
    $hashIdx = $raw.IndexOf('#')
    if ($hashIdx -ge 0) {
      $resolved = $raw.Substring(0, $hashIdx)
      $status = 'ANCHOR-ONLY' # privremeno; ako fajl postoji, prelazi na OK ispod
      if (-not $resolved) {
        # Cisti anchor (#sec-...) bez fajla — ne validira
        $status = 'ANCHOR-ONLY'
        $resolved = '(anchor-only)'
      }
    }

    if ($resolved -and $resolved -ne '(anchor-only)') {
      # Normalizuj separatore i resolve relativno na repo root
      $relNormalized = $resolved -replace '/', [System.IO.Path]::DirectorySeparatorChar
      $absPath = Join-Path $repoRoot $relNormalized
      if (Test-Path -LiteralPath $absPath) {
        if ($status -eq 'ANCHOR-ONLY') {
          # Imali smo # anchor ali fajl postoji → OK (anchor sam ne validiramo)
          $status = 'OK'
        }
        else {
          $status = 'OK'
        }
      }
      else {
        $status = 'STALE-MISSING'
      }
    }
  }

  $results.Add([pscustomobject]@{
    Section = $e.Section
    RawPath = $raw
    Resolved = $resolved
    Status = $status
  }) | Out-Null
}

# --- Sumarni izveštaj ---
$grouped = $results | Group-Object -Property Status
$counts = @{}
foreach ($g in $grouped) { $counts[$g.Name] = $g.Count }

$total = $results.Count
$ok = $counts['OK'] | ForEach-Object { if ($_) { $_ } else { 0 } }
if (-not $ok) { $ok = 0 }
$stale = $counts['STALE-MISSING'] | ForEach-Object { if ($_) { $_ } else { 0 } }
if (-not $stale) { $stale = 0 }
$external = $counts['EXTERNAL'] | ForEach-Object { if ($_) { $_ } else { 0 } }
if (-not $external) { $external = 0 }
$anchor = $counts['ANCHOR-ONLY'] | ForEach-Object { if ($_) { $_ } else { 0 } }
if (-not $anchor) { $anchor = 0 }

Write-Host ''
Write-Host '== Reverse hub coverage rezime ==' -ForegroundColor Cyan
Write-Host ("  Putanje u hub-u skenirano:    {0}" -f $total)
Write-Host ("  OK (target fajl postoji):     {0}" -f $ok)
Write-Host ("  STALE-MISSING (fajl nedostaje): {0}" -f $stale)
Write-Host ("  ANCHOR-ONLY (cisti #sidro):   {0}" -f $anchor)
Write-Host ("  EXTERNAL (http/https):        {0}" -f $external)

# --- Detalji STALE-MISSING (sortirano po sekciji + putanji) ---
$stales = @($results | Where-Object { $_.Status -eq 'STALE-MISSING' })
if ($stales.Count -gt 0) {
  Write-Host ''
  Write-Host '== STALE-MISSING detalji ==' -ForegroundColor Yellow
  $stales |
    Sort-Object -Property Section, RawPath |
    Select-Object -First $MaxOutput |
    ForEach-Object {
      Write-Host ("  [{0}]" -f $_.Section) -ForegroundColor DarkGray
      Write-Host ("    {0}" -f $_.RawPath) -ForegroundColor Yellow
      Write-Host ("    razlog: target fajl ne postoji na disku") -ForegroundColor DarkGray
    }
}

Write-Host ''
Write-Host 'Napomene:' -ForegroundColor DarkGray
Write-Host '  - Komplement Talas 66 (check-dev-docs-coverage.ps1, forward) — ovaj skener radi reverse smer.'
Write-Host '  - check-doc-links.ps1 hvata broken linkove u markdown body-jima; ovaj skener hvata stale entries u page.tsx TSX hub-u.'
Write-Host '  - audit-doc-gate-references.ps1 proverava 5 par-pravila za docs links.'
Write-Host '  - run-all-audits.ps1: 39 koraka (37 read-only + TODO + npm); single entry point.'
Write-Host '  - Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md; pun mirror ukljucuje apps/omnigroup-web build osim sa -SkipOmnigroupWeb).'
Write-Host '  - Smoke (HTTP) i bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).'
Write-Host '  - Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md (LATEST verify Val 355; smoke Val 351).'
Write-Host '  - Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md i docs/NIVO-1-DRYRUN-LOG.md.'

if ($FailOnStale -and $stale -gt 0) {
  exit 1
}
exit 0
