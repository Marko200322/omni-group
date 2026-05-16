<#
.SYNOPSIS
  Skenira monorepo i agregira sve TODO / FIXME / HACK / XXX markere — daje vlasniku precizan trag tehničkog duga (file:line:context). Read-only, informativan, **nije** CI gate. Komplementaran read-only audit suite-i (`audit-doc-gate-references.ps1` doc gate, `audit-npm-monorepo.ps1` security, `check-doc-links.ps1` link integrity, `check-dev-docs-coverage.ps1` dev/docs hub navigacija).

.DESCRIPTION
  Iz korena repoa skenira `*.ts`, `*.tsx`, `*.js`, `*.mjs`, `*.cjs`, `*.py`, `*.md`, `*.ps1`, `*.yml`, `*.yaml`, `*.json` (van `node_modules` / `.next` / `.git` / `dist` / `coverage` / `build` / `.turbo` / `.cache` / `__pycache__`) i grupiše markere u 4 kategorije:

  1. **`TODO[xxx-restore]` / `TODO[Iter\d+]`** — eksplicitan tehnički dug iz dokumentovanih runbook-a (D.1, empty-doc, Iter blokovi). Svaki marker je linkovan na konkretan plan u runbook-u.
  2. **`TODO` (ostalo)** — generičke TODO bez kvalifikatora.
  3. **`FIXME`** — pravi bug-ovi koji čekaju popravku.
  4. **`HACK` / `XXX`** — privremene zaobilaznice / rizična mesta (kao reči, ne unutar identifikatora kao `XXXXX`).

  Output je tabelaran (file:line:context) sa `count` po kategoriji i ukupnim brojem. Po defaultu se prikazuje **summary table** (broj po kategoriji + top 10 fajlova po broju marker-a); sa `-Detailed` ili `-MaxOutput` izlistava sve linije. Sa `-OutputJson` ili `-OutputCsv` snima izveštaj na disk za dalji procesovanje (npr. dashboard).

  **Nije** deo CI mirror-a (`verify-monorepo.ps1` job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md)) i ne menja njegov scope. Dopuna pre-PR pregleda; smoke (HTTP) i bundled `npm run smoke:all`: [`smoke-stack.ps1`](./smoke-stack.ps1) + [`atina-platform/atina/docs/operations/release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) (*Local notes — Smoke tests*).

.PARAMETER Detailed
  Prikaži sve marker linije (file:line:context) umesto samo summary.

.PARAMETER MaxOutput
  Limit za broj prikazanih marker-a u Detailed režimu (default 200, postavi `0` za sve).

.PARAMETER OutputJson
  Putanja gde se snima JSON izveštaj (file paths, kategorije, brojevi, marker linije).

.PARAMETER OutputCsv
  Putanja gde se snima CSV izveštaj (jedan red = jedna marker linija; `category,file,line,text`).

.PARAMETER FailOnAny
  Vraća exit 1 ako bilo koji marker postoji (gate-flavor; po defaultu **uvek exit 0** osim sa ovim switch-om — i sa `FailOnAny` skripta i dalje prikazuje izveštaj pre exit-a).

.PARAMETER IncludeMdCodeBlocks
  **Talas 83 default-on default ponašanje:** od Talas 83, skener po defaultu **preskače markdown code blokove** (` ``` ... ``` `) u `.md` fajlovima (Talas 81 lekcija #17 — TODO/FIXME/HACK/XXX u code blokovima dokumentacije su tipično primeri koda iz runbook-a, ne realan dug). Sa ovim switch-om vraća se na **stari režim** koji je brojao i marker-e u markdown code blokovima (Talas 67 baseline ponašanje). Ne menja ponašanje za druge ekstenzije (`.ts`, `.tsx`, `.js`, `.py`, `.ps1`, itd.) — tamo su komentari u izvornom kodu uvek realan dug.

.EXAMPLE
  .\scripts\scan-todo-markers.ps1
  # Pun pregled (summary table + top 10 fajlova).

.EXAMPLE
  .\scripts\scan-todo-markers.ps1 -Detailed
  # Pun pregled + sve marker linije (prvih 200).

.EXAMPLE
  .\scripts\scan-todo-markers.ps1 -OutputJson tmp\todo-markers.json
  # Pun pregled + JSON snapshot za dashboard / dalje procesovanje.

.EXAMPLE
  .\scripts\scan-todo-markers.ps1 -OutputCsv tmp\todo-markers.csv -Detailed
  # Pun pregled + CSV (jedan red = jedna marker linija).

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 67 = ovaj skript; ukupno 39 koraka Talas 65-192).
  Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / required check Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md).
  Smoke (HTTP) + Atina bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes — Smoke tests).
  LATEST verify: docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md (Val 355); smoke: docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md (Val 351).
  Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md.
  Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md · docs/NIVO-1-DRYRUN-LOG.md.
  PowerShell 5.1+.
#>
param(
  [switch]$Detailed,
  [int]$MaxOutput = 200,
  [string]$OutputJson,
  [string]$OutputCsv,
  [switch]$FailOnAny,
  [switch]$IncludeMdCodeBlocks
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

Write-Host '== scan-todo-markers.ps1 - TODO / FIXME / HACK / XXX skener (informativan) ==' -ForegroundColor Cyan
Write-Host ("   Detailed: {0} | MaxOutput: {1} | FailOnAny: {2} | IncludeMdCodeBlocks: {3}" -f $Detailed, $MaxOutput, $FailOnAny, $IncludeMdCodeBlocks) -ForegroundColor DarkGray
$mdSkippedCount = 0

$skipDirs = @('node_modules', '.next', '.git', 'dist', 'coverage', 'build', '.turbo', '.cache', '__pycache__', '.pytest_cache', 'tmp')
$includeExtensions = @('*.ts', '*.tsx', '*.js', '*.mjs', '*.cjs', '*.py', '*.md', '*.ps1', '*.yml', '*.yaml', '*.json')

function Should-Skip-Path {
  param([string]$Path)
  foreach ($s in $skipDirs) {
    if ($Path -match "[\\/]$([regex]::Escape($s))[\\/]") { return $true }
  }
  return $false
}

# Categorization logic - order matters, first match wins.
function Get-Category {
  param([string]$Line)
  if ($Line -match 'TODO\[(D\.1-restore|empty-doc-restore|Iter\d+|[a-zA-Z0-9._-]+-restore)\]') { return 'TODO[restore]' }
  if ($Line -match '\bTODO\b') { return 'TODO (other)' }
  if ($Line -match '\bFIXME\b') { return 'FIXME' }
  if ($Line -match '\b(HACK|XXX)\b') { return 'HACK/XXX' }
  return $null
}

# Skip the scanner's own self-mentions to avoid recursive noise.
$selfPath = (Resolve-Path $MyInvocation.MyCommand.Path).Path

$markerRegex = [regex]'(TODO|FIXME|HACK|XXX)'
$results = New-Object System.Collections.Generic.List[object]

Write-Host '   Skeniram fajlove...' -ForegroundColor DarkGray
$fileCount = 0
foreach ($ext in $includeExtensions) {
  $isMd = ($ext -eq '*.md')
  $applyCodeBlockSkip = ($isMd -and -not $IncludeMdCodeBlocks)
  Get-ChildItem -Path $repoRoot -Recurse -File -Filter $ext -ErrorAction SilentlyContinue |
    Where-Object { -not (Should-Skip-Path $_.FullName) -and $_.FullName -ne $selfPath } |
    ForEach-Object {
      $fileCount++
      $rel = $_.FullName.Substring($repoRoot.Length).TrimStart('\', '/').Replace('\', '/')
      $lineNum = 0
      $inCodeBlock = $false
      foreach ($line in (Get-Content -LiteralPath $_.FullName -ErrorAction SilentlyContinue)) {
        $lineNum++
        # Talas 81 lekcija #17: za .md fajlove preskoci markdown code blokove (TODO/FIXME u code blokovima
        # dokumentacije su tipicno primeri iz runbook-a, ne realan dug). Drugi ekstenzioni nepromenjeni.
        if ($applyCodeBlockSkip -and ($line -match '^```')) {
          $inCodeBlock = -not $inCodeBlock
          continue
        }
        if ($applyCodeBlockSkip -and $inCodeBlock) {
          if ($markerRegex.IsMatch($line) -and (Get-Category $line)) {
            $script:mdSkippedCount++
          }
          continue
        }
        if (-not $markerRegex.IsMatch($line)) { continue }
        $cat = Get-Category $line
        if (-not $cat) { continue }
        $context = $line.Trim()
        if ($context.Length -gt 200) {
          $context = $context.Substring(0, 200) + '...'
        }
        $results.Add([pscustomobject]@{
          Category = $cat
          File     = $rel
          Line     = $lineNum
          Text     = $context
        }) | Out-Null
      }
    }
}

Write-Host ("   Skenirano: {0} fajlova; markera: {1}" -f $fileCount, $results.Count) -ForegroundColor DarkGray
if ($mdSkippedCount -gt 0) {
  Write-Host ("   .md code-block skip (Talas 81 lekcija #17): {0} markera u markdown code blokovima ne brojano kao realan dug (sa -IncludeMdCodeBlocks vraca se na stari rezim)" -f $mdSkippedCount) -ForegroundColor DarkGray
}

# --- Summary by category ---
Write-Host ''
Write-Host '== Summary po kategoriji ==' -ForegroundColor Cyan
$byCategory = $results | Group-Object Category | Sort-Object Count -Descending
$totalCount = ($results | Measure-Object).Count
if ($totalCount -eq 0) {
  Write-Host '  (nijedan marker - repo je clean)' -ForegroundColor Green
} else {
  foreach ($g in $byCategory) {
    $color = 'Yellow'
    if ($g.Name -eq 'TODO[restore]') { $color = 'Cyan' }     # informativno (dokumentovan dug)
    if ($g.Name -eq 'TODO (other)')  { $color = 'DarkGray' } # generic
    if ($g.Name -eq 'FIXME')         { $color = 'Yellow' }
    if ($g.Name -eq 'HACK/XXX')      { $color = 'Magenta' }
    Write-Host ("  {0,-15} {1,5}" -f $g.Name, $g.Count) -ForegroundColor $color
  }
  Write-Host ("  {0,-15} {1,5}" -f 'TOTAL', $totalCount) -ForegroundColor White
}

# --- Top 10 files by marker count ---
if ($totalCount -gt 0) {
  Write-Host ''
  Write-Host '== Top 10 fajlova po broju marker-a ==' -ForegroundColor Cyan
  $byFile = $results | Group-Object File | Sort-Object Count -Descending | Select-Object -First 10
  foreach ($g in $byFile) {
    Write-Host ("  {0,4}  {1}" -f $g.Count, $g.Name)
  }
}

# --- Detailed listing ---
if ($Detailed -and $totalCount -gt 0) {
  Write-Host ''
  Write-Host '== Detaljan spisak (file:line:category - context) ==' -ForegroundColor Cyan
  $sorted = $results | Sort-Object File, Line
  $shown = 0
  foreach ($r in $sorted) {
    if ($MaxOutput -gt 0 -and $shown -ge $MaxOutput) {
      $remaining = $totalCount - $shown
      Write-Host ("  ... i jos {0} markera (povecaj -MaxOutput ili snimi -OutputJson / -OutputCsv)" -f $remaining) -ForegroundColor DarkGray
      break
    }
    $color = 'Gray'
    if ($r.Category -eq 'TODO[restore]') { $color = 'Cyan' }
    if ($r.Category -eq 'FIXME')         { $color = 'Yellow' }
    if ($r.Category -eq 'HACK/XXX')      { $color = 'Magenta' }
    Write-Host ("  [{0}] {1}:{2}" -f $r.Category, $r.File, $r.Line) -ForegroundColor $color
    Write-Host ("       {0}" -f $r.Text) -ForegroundColor DarkGray
    $shown++
  }
}

# --- JSON / CSV export ---
if ($OutputJson) {
  $jsonPath = $OutputJson
  if (-not [System.IO.Path]::IsPathRooted($jsonPath)) {
    $jsonPath = Join-Path $repoRoot $jsonPath
  }
  $jsonDir = Split-Path -Parent $jsonPath
  if ($jsonDir -and -not (Test-Path $jsonDir)) {
    New-Item -ItemType Directory -Path $jsonDir -Force | Out-Null
  }
  $payload = [pscustomobject]@{
    timestamp     = (Get-Date).ToString('o')
    repoRoot      = $repoRoot.Replace('\', '/')
    fileCount     = $fileCount
    totalMarkers  = $totalCount
    byCategory    = ($byCategory | ForEach-Object { [pscustomobject]@{ category = $_.Name; count = $_.Count } })
    topFiles      = (($results | Group-Object File | Sort-Object Count -Descending | Select-Object -First 20) |
                       ForEach-Object { [pscustomobject]@{ file = $_.Name; count = $_.Count } })
    markers       = $results
  }
  $payload | ConvertTo-Json -Depth 5 | Out-File -LiteralPath $jsonPath -Encoding UTF8
  Write-Host ''
  Write-Host ("JSON snapshot snimljen: {0}" -f $jsonPath) -ForegroundColor Green
}

if ($OutputCsv) {
  $csvPath = $OutputCsv
  if (-not [System.IO.Path]::IsPathRooted($csvPath)) {
    $csvPath = Join-Path $repoRoot $csvPath
  }
  $csvDir = Split-Path -Parent $csvPath
  if ($csvDir -and -not (Test-Path $csvDir)) {
    New-Item -ItemType Directory -Path $csvDir -Force | Out-Null
  }
  $results | Select-Object Category, File, Line, Text |
    Export-Csv -LiteralPath $csvPath -NoTypeInformation -Encoding UTF8
  Write-Host ''
  Write-Host ("CSV snapshot snimljen: {0}" -f $csvPath) -ForegroundColor Green
}

Write-Host ''
Write-Host 'Napomene:' -ForegroundColor DarkGray
Write-Host '  - TODO[restore] markeri pokazuju eksplicitan dokumentovan dug (D.1 / empty-doc / Iter blokovi) - runbook-i: OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md, EMPTY-DOCS-RUNBOOK.md.' -ForegroundColor DarkGray
Write-Host '  - check-doc-links.ps1 dodatno proverava broken / empty target linkove unutar markdown body-ja.' -ForegroundColor DarkGray
Write-Host '  - check-dev-docs-coverage.ps1 proverava da svaki *.md fajl bude navigaciono dostupan preko /dev/docs hub-a.' -ForegroundColor DarkGray
Write-Host '  - audit-doc-gate-references.ps1 proverava 5 pairing pravila (verify-monorepo / smoke-stack / smoke:all / Python check / EVIDENCE-INDEX paired with NIVO-1-DRYRUN-LOG).' -ForegroundColor DarkGray
Write-Host '  - audit-npm-monorepo.ps1 daje npm audit pregled (Atina + Nest + omnigroup-web).' -ForegroundColor DarkGray
Write-Host '  - Pun verify: scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md).' -ForegroundColor DarkGray
Write-Host '  - Smoke (HTTP) i bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).' -ForegroundColor DarkGray
Write-Host '  - Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md (LATEST verify Val 355; smoke Val 351).' -ForegroundColor DarkGray
Write-Host '  - Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md i docs/NIVO-1-DRYRUN-LOG.md.' -ForegroundColor DarkGray

if ($FailOnAny -and $totalCount -gt 0) {
  Write-Host ('== EXIT 1: -FailOnAny i postoji bar jedan marker ({0}) ==' -f $totalCount) -ForegroundColor Red
  exit 1
}
exit 0
