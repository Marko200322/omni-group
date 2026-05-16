<#
.SYNOPSIS
  Provera completeness `apps/omnigroup-web/src/app/dev/docs/page.tsx` hub-a — koji `*.md` fajlovi u monorepu nisu navigaciono dostupni preko `/dev/docs` rute. Informativan, **nije** CI gate. Dopuna read-only audit suite-a (`audit-doc-gate-references.ps1` doc gate, `check-doc-links.ps1` link skener, `audit-npm-monorepo.ps1` security skener).

.DESCRIPTION
  Iz korena repoa parsira `apps/omnigroup-web/src/app/dev/docs/page.tsx` (sve string literale unutar `paths: [...]` blokova) i upoređuje sa stvarnim sadržajem 4 doc lokacije:

  - root `*.md` (NIVO-1-START, NIVO-2-START, README, CONTRIBUTING, AGENT-RADNI-PLAN, …)
  - `docs/**/*.md` (uključujući subfoldere `nivo3-wave-a` itd.)
  - `atina-system/docs/**/*.md`
  - `atina-platform/atina/docs/operations/*.md`

  Prikazuje **missing** (postoji u file system-u, nije u page.tsx) i opciono **stale** (u page.tsx, ne postoji u file system-u — pokrivaju i `check-doc-links.ps1` i `audit-doc-gate-references.ps1`, ali ovde se vidi u istom izveštaju). Po defaultu **`*.template.md`** fajlovi se preskaču (template-i nisu završeni dokovi); uključi sa `-IncludeTemplates`. Skener ne menja page.tsx.

  **Nije** deo CI mirror-a (`verify-monorepo.ps1` job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md)) i ne menja njegov scope. Dopuna pre-PR pregleda; smoke (HTTP) i bundled `npm run smoke:all`: [`smoke-stack.ps1`](./smoke-stack.ps1) + [`atina-platform/atina/docs/operations/release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*).

.PARAMETER FailOnMissing
  Vraća exit 1 ako bilo koji `*.md` fajl iz `docs/`, `atina-system/docs/`, `atina-platform/atina/docs/operations/` ili korena nije u page.tsx hub-u (van template-a kad nije `-IncludeTemplates`).

.PARAMETER IncludeTemplates
  Uključi `*.template.md` fajlove u skup koji se proverava.

.PARAMETER ShowStale
  Dodatno prikaži putanje koje su u page.tsx, ali ne postoje u file system-u (subset onoga što daje `check-doc-links.ps1`).

.EXAMPLE
  .\scripts\check-dev-docs-coverage.ps1
  # Pun pregled, samo izveštaj; uvek exit 0 osim sa -FailOnMissing.

.EXAMPLE
  .\scripts\check-dev-docs-coverage.ps1 -FailOnMissing
  # Pre-merge gate-flavor: non-zero exit ako bilo koji .md fajl nije u hub-u.

.EXAMPLE
  .\scripts\check-dev-docs-coverage.ps1 -ShowStale -IncludeTemplates
  # Najopširniji izveštaj (uključi template fajlove i listu stale referenci).

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 66 = ovaj skript; ukupno 39 koraka Talas 65-192).
  Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / required check Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md).
  Smoke (HTTP) + Atina bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes — Smoke tests).
  LATEST verify: docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md (Val 355); smoke: docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md (Val 351).
  Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md.
  Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md · docs/NIVO-1-DRYRUN-LOG.md.
  PowerShell 5.1+.
#>
param(
  [switch]$FailOnMissing,
  [switch]$IncludeTemplates,
  [switch]$ShowStale
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

$pagePath = Join-Path $repoRoot 'apps/omnigroup-web/src/app/dev/docs/page.tsx'
if (-not (Test-Path $pagePath)) {
  Write-Host "ERROR: $pagePath not found" -ForegroundColor Red
  exit 2
}

Write-Host '== check-dev-docs-coverage.ps1 — dev/docs hub completeness (informativan) ==' -ForegroundColor Cyan
Write-Host "   IncludeTemplates: $IncludeTemplates · FailOnMissing: $FailOnMissing · ShowStale: $ShowStale" -ForegroundColor DarkGray
Write-Host '   Hub source: apps/omnigroup-web/src/app/dev/docs/page.tsx' -ForegroundColor DarkGray

# Parse all string literals in 'paths: [...]' blocks
$pageText = Get-Content -LiteralPath $pagePath -Raw
$hubPaths = New-Object System.Collections.Generic.HashSet[string]
$pathBlockRegex = [regex]"paths:\s*\[(?<inner>[^\]]+)\]"
$stringRegex = [regex]"'([^']+)'"
foreach ($m in $pathBlockRegex.Matches($pageText)) {
  foreach ($s in $stringRegex.Matches($m.Groups['inner'].Value)) {
    $val = $s.Groups[1].Value.Trim()
    if ($val) {
      [void]$hubPaths.Add($val.Replace('\', '/'))
    }
  }
}
Write-Host ("   Putanje u hub-u: {0}" -f $hubPaths.Count) -ForegroundColor DarkGray

# Collect candidate *.md paths from monorepo (filtered).
$skipDirs = @('node_modules', '.next', '.git', 'dist', 'coverage', 'build', '.turbo', '.cache')
function Should-Skip-Path {
  param([string]$Path)
  foreach ($s in $skipDirs) {
    if ($Path -match "[\\/]$([regex]::Escape($s))[\\/]") { return $true }
  }
  return $false
}

$candidates = New-Object System.Collections.Generic.List[string]

# 1) root *.md
Get-ChildItem -LiteralPath $repoRoot -File -Filter '*.md' -ErrorAction SilentlyContinue |
  ForEach-Object { $candidates.Add($_.Name) | Out-Null }

# 2) docs/**/*.md
$docsDir = Join-Path $repoRoot 'docs'
if (Test-Path $docsDir) {
  Get-ChildItem -Path $docsDir -Recurse -File -Filter '*.md' -ErrorAction SilentlyContinue |
    Where-Object { -not (Should-Skip-Path $_.FullName) } |
    ForEach-Object {
      $rel = $_.FullName.Substring($repoRoot.Length).TrimStart('\', '/').Replace('\', '/')
      $candidates.Add($rel) | Out-Null
    }
}

# 3) atina-system/docs/**/*.md
$nestDocsDir = Join-Path $repoRoot 'atina-system/docs'
if (Test-Path $nestDocsDir) {
  Get-ChildItem -Path $nestDocsDir -Recurse -File -Filter '*.md' -ErrorAction SilentlyContinue |
    Where-Object { -not (Should-Skip-Path $_.FullName) } |
    ForEach-Object {
      $rel = $_.FullName.Substring($repoRoot.Length).TrimStart('\', '/').Replace('\', '/')
      $candidates.Add($rel) | Out-Null
    }
}

# 4) atina-platform/atina/docs/operations/*.md (just operations — produkcijski runbook-i)
$atinaOpsDir = Join-Path $repoRoot 'atina-platform/atina/docs/operations'
if (Test-Path $atinaOpsDir) {
  Get-ChildItem -Path $atinaOpsDir -File -Filter '*.md' -ErrorAction SilentlyContinue |
    ForEach-Object {
      $rel = $_.FullName.Substring($repoRoot.Length).TrimStart('\', '/').Replace('\', '/')
      $candidates.Add($rel) | Out-Null
    }
}

if (-not $IncludeTemplates) {
  $candidates = $candidates | Where-Object { $_ -notmatch '\.template\.md$' }
}

$missing = New-Object System.Collections.Generic.List[string]
foreach ($c in $candidates) {
  if (-not $hubPaths.Contains($c)) {
    [void]$missing.Add($c)
  }
}

$stale = New-Object System.Collections.Generic.List[string]
if ($ShowStale) {
  foreach ($p in $hubPaths) {
    if ($p -notmatch '\.md$' -and $p -notmatch '\.tsx?$' -and $p -notmatch '\.css$' -and $p -notmatch '\.json$' -and $p -notmatch '\.mjs$' -and $p -notmatch '\.ts$' -and $p -notmatch '\.ps1$' -and $p -notmatch '\.yml$' -and $p -notmatch '\.yaml$' -and $p -notmatch '\.example$' -and $p -notmatch 'Dockerfile$' -and $p -notmatch '\.ini$' -and $p -notmatch 'pytest\.ini$' -and $p -notmatch 'requirements\.txt$' -and $p -notmatch '\.nvmrc$') {
      continue
    }
    $abs = Join-Path $repoRoot $p
    if (-not (Test-Path -LiteralPath $abs)) {
      [void]$stale.Add($p)
    }
  }
}

Write-Host ''
Write-Host '== Rezime ==' -ForegroundColor Cyan
Write-Host ("Kandidata (.md u 4 lokacije): {0}" -f $candidates.Count)
$missingColor = 'Green'
if ($missing.Count -gt 0) { $missingColor = 'Yellow' }
Write-Host ("Missing iz hub-a: {0}" -f $missing.Count) -ForegroundColor $missingColor
if ($ShowStale) {
  $staleColor = 'Green'
  if ($stale.Count -gt 0) { $staleColor = 'Yellow' }
  Write-Host ("Stale u hub-u (referenca → ne postoji): {0}" -f $stale.Count) -ForegroundColor $staleColor
}

if ($missing.Count -gt 0) {
  Write-Host ''
  Write-Host '== Missing (ima fajl, nije u page.tsx) ==' -ForegroundColor Yellow
  $missing | Sort-Object | ForEach-Object { Write-Host ("  {0}" -f $_) }
}

if ($ShowStale -and $stale.Count -gt 0) {
  Write-Host ''
  Write-Host '== Stale (u page.tsx, nema fajla) ==' -ForegroundColor Yellow
  $stale | Sort-Object | ForEach-Object { Write-Host ("  {0}" -f $_) }
}

Write-Host ''
Write-Host 'Napomene:' -ForegroundColor DarkGray
Write-Host '  - check-doc-links.ps1 dodatno proverava broken / empty target linkove unutar markdown body-ja.' -ForegroundColor DarkGray
Write-Host '  - audit-doc-gate-references.ps1 proverava 5 pairing pravila (verify-monorepo / smoke-stack / smoke:all / Python check / EVIDENCE-INDEX ↔ NIVO-1-DRYRUN-LOG).' -ForegroundColor DarkGray
Write-Host '  - audit-npm-monorepo.ps1 daje npm audit pregled (Atina + Nest + omnigroup-web).' -ForegroundColor DarkGray
Write-Host '  - Pun verify: scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md).' -ForegroundColor DarkGray
Write-Host '  - Smoke (HTTP) i bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).' -ForegroundColor DarkGray
Write-Host '  - Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md (LATEST verify Val 355; smoke Val 351).' -ForegroundColor DarkGray
Write-Host '  - Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md i docs/NIVO-1-DRYRUN-LOG.md.' -ForegroundColor DarkGray

if ($FailOnMissing -and $missing.Count -gt 0) {
  Write-Host '== EXIT 1: -FailOnMissing i postoji bar jedan .md van hub-a ==' -ForegroundColor Red
  exit 1
}
exit 0
