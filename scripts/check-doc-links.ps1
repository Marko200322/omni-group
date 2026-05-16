<#
.SYNOPSIS
  Markdown link checker (informativan, **nije** CI gate). Skenira `*.md` fajlove u monorepu i prijavljuje slomljene relativne linkove ka nepostojećim fajlovima ili 0-byte fajlovima (OneDrive Files-On-Demand `ReparsePoint` placeholder bez cloud sadržaja — vidi [`docs/EMPTY-DOCS-RUNBOOK.md`](../docs/EMPTY-DOCS-RUNBOOK.md)). Koristi se uz konsolidovani `npm audit` runner [`audit-npm-monorepo.ps1`](./audit-npm-monorepo.ps1) i pun verify mirror [`verify-monorepo.ps1`](./verify-monorepo.ps1) (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md)) bez menjanja CI scope-a; HTTP smoke je [`smoke-stack.ps1`](./smoke-stack.ps1) + bundled Atina **`npm run smoke:all`** (formalni Atina release gate: [`atina-platform/atina/docs/operations/release-gate-checklist.md`](../atina-platform/atina/docs/operations/release-gate-checklist.md) — *Local notes — Smoke tests*).

.DESCRIPTION
  Iz korena repoa rekurzivno prolazi sve `*.md` fajlove (van `node_modules`, `.next`, `.git`, `dist`, `coverage`, `build`) i parsira markdown link sintaksu `[label](target)`. Za relativne `target`-e (oni koji nisu URL — ne počinju sa `http://`, `https://`, `mailto:`, `tel:` itd. i ne počinju sa `#` (anchor)) verifikuje da fajl/folder postoji i da nije 0-byte (potencijalno OneDrive Files-On-Demand placeholder). Ne menja sadržaj fajlova; samo **prijavljuje**.

  **Ne** povećava scope `verify-monorepo.ps1` — broken linkovi su informativan signal, ne build/test failure (CI mirror ostaje isti: doc gate `audit-doc-gate-references.ps1` (Doslednost dok md/txt + yaml/ps1/ini, uklj. par EVIDENCE-INDEX / NIVO-1-DRYRUN-LOG, u scripts/README.md) → pytest → Atina test:ci → Omnigroup build (osim `-SkipOmnigroupWeb`) → Nest verify:ci → compose). Ovaj skript je **dopuna** za pre-merge content quality.

  Anchor-only linkovi (`[label](#section)`) su preskočeni — anchor validacija nije implementirana (težak parsing markdown heading-a). URL linkovi (`http*://`, `mailto:`, `tel:`) su preskočeni. Slika linkovi (`![alt](path)`) **jesu** uključeni u skup.

.PARAMETER FailOnBroken
  Vraća exit 1 ako se nađe bilo koji broken link. Bez ove opcije, uvek vraća 0 (skript je informativan).

.PARAMETER MaxOutput
  Maksimalan broj broken linkova koji se ispisuje (default 200). Posle toga ide samo brojač.

.PARAMETER SkipEmptyTargets
  Preskoči prijavu linkova koji vode na 0-byte fajlove (OneDrive `ReparsePoint` placeholder ili stvarno prazan fajl). Default: prijavljuje empty targets (oni su pokriveni runbook-om [`docs/EMPTY-DOCS-RUNBOOK.md`](../docs/EMPTY-DOCS-RUNBOOK.md) Korak 1/2/3). Switch idiom (umesto `[bool]`) zbog `powershell -File` parser problema sa `-X:$false` sintaksom.

.EXAMPLE
  .\scripts\check-doc-links.ps1
  # Pun pregled, samo izveštaj; uvek exit 0.

.EXAMPLE
  .\scripts\check-doc-links.ps1 -FailOnBroken
  # Pre-merge gate-flavor: non-zero exit ako bilo koji link ne postoji ili vodi na 0-byte fajl.

.EXAMPLE
  .\scripts\check-doc-links.ps1 -SkipEmptyTargets
  # Samo non-existent fajlovi (preskačemo OneDrive empty targete koji su pokriveni `EMPTY-DOCS-RUNBOOK.md` Korak 1/2/3).

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 65 = ovaj skript; ukupno 39 koraka Talas 65-192).
  Konsolidovani audit runbook: [`docs/NPM-AUDIT-MONOREPO.md`](../docs/NPM-AUDIT-MONOREPO.md);
  prazni dokovi (uzorak): [`docs/EMPTY-DOCS-RUNBOOK.md`](../docs/EMPTY-DOCS-RUNBOOK.md);
  D.1 paralelni runbook (`apps/omnigroup-web` `*.tsx`): [`docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md`](../docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md).
  LATEST verify (kanon): [`docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md`](../docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md) — **Val 355** / 2026-05-14;
  LATEST smoke: [`docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md`](../docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md) — **Val 351** / 2026-05-14.
  Monorepo evidencija (indeks + dry-run): [`docs/EVIDENCE-INDEX.md`](../docs/EVIDENCE-INDEX.md) · [`docs/NIVO-1-DRYRUN-LOG.md`](../docs/NIVO-1-DRYRUN-LOG.md).
  Kad podižeš novi Val širom dokova: [`scripts/README.md`](./README.md) — odeljak Kad podigneš novi broj.
  PowerShell 5.1+.
#>
param(
  [switch]$FailOnBroken,
  [int]$MaxOutput = 200,
  [switch]$SkipEmptyTargets
)
$IncludeEmptyTargets = -not $SkipEmptyTargets

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

$skipDirs = @('node_modules', '.next', '.git', 'dist', 'coverage', 'build', '.turbo', '.cache')
$urlPrefixRegex = [regex]'^(https?|mailto|tel|ftp|ftps|sftp|ws|wss|data|file|javascript|vscode):'
# [text](target) i ![alt](target). target je sve do prve neescape-ovane zatvorene zagrade.
# Pojednostavljen parser: ne pokriva sve edge case-ove (npr. ugnježdene zagrade u target-u),
# ali pokriva 99% praktičnih markdown linkova.
$linkRegex = [regex]'(?<!\\)!?\[(?<label>[^\]]*)\]\((?<target>[^)\s]+(?:\s+"[^"]*")?)\)'

Write-Host '== check-doc-links.ps1 — markdown link skener (informativan) ==' -ForegroundColor Cyan
Write-Host "   IncludeEmptyTargets: $IncludeEmptyTargets · FailOnBroken: $FailOnBroken" -ForegroundColor DarkGray
Write-Host '   Konsolidovani runbook (prazni dokovi): docs/EMPTY-DOCS-RUNBOOK.md' -ForegroundColor DarkGray

function Should-Skip-Path {
  param([string]$Path)
  foreach ($s in $skipDirs) {
    if ($Path -match "[\\/]$([regex]::Escape($s))[\\/]") { return $true }
    if ($Path -match "[\\/]$([regex]::Escape($s))$") { return $true }
  }
  return $false
}

$mdFiles = Get-ChildItem -Path $repoRoot -Recurse -File -Filter '*.md' -ErrorAction SilentlyContinue |
  Where-Object { -not (Should-Skip-Path $_.FullName) }

Write-Host ("   skenirano: {0} *.md fajlova" -f $mdFiles.Count) -ForegroundColor DarkGray

$broken = New-Object System.Collections.Generic.List[pscustomobject]
$emptyTargets = New-Object System.Collections.Generic.List[pscustomobject]
$linkCount = 0

foreach ($md in $mdFiles) {
  $text = Get-Content -LiteralPath $md.FullName -Raw -ErrorAction SilentlyContinue
  if ($null -eq $text -or $text.Length -eq 0) { continue }

  # Strip fenced code blocks (``` ... ``` and ~~~ ... ~~~) — links inside code/templates are not navigation.
  # Multiline regex; non-greedy. Replace with newlines to preserve approximate line offsets.
  $stripped = [regex]::Replace($text, '(?ms)^```.*?^```\s*$', { "`n" * ($args[0].Value.Split("`n").Count) }, [System.Text.RegularExpressions.RegexOptions]::Multiline)
  $stripped = [regex]::Replace($stripped, '(?ms)^~~~.*?^~~~\s*$', { "`n" * ($args[0].Value.Split("`n").Count) }, [System.Text.RegularExpressions.RegexOptions]::Multiline)
  # Also strip inline code spans `…` (single backticks) — links inside inline code are illustrative, not navigation.
  $stripped = [regex]::Replace($stripped, '`[^`\n]*`', '')

  $matches = $linkRegex.Matches($stripped)
  foreach ($m in $matches) {
    $linkCount++
    $rawTarget = $m.Groups['target'].Value
    # strip optional title `"…"`
    $target = ($rawTarget -split '\s+', 2)[0].Trim()
    # strip fragment (#anchor) — file part only
    $hashIdx = $target.IndexOf('#')
    $filePart = if ($hashIdx -ge 0) { $target.Substring(0, $hashIdx) } else { $target }
    if ([string]::IsNullOrWhiteSpace($filePart)) { continue } # pure anchor #section
    if ($urlPrefixRegex.IsMatch($filePart)) { continue } # URL
    if ($filePart.StartsWith('//')) { continue } # protocol-relative URL
    # Decode %20 etc.
    try { $decoded = [System.Uri]::UnescapeDataString($filePart) } catch { $decoded = $filePart }

    # resolve relative to md file's directory
    $mdDir = Split-Path -Parent $md.FullName
    $absTarget = $null
    try {
      if ([System.IO.Path]::IsPathRooted($decoded)) {
        $absTarget = [System.IO.Path]::GetFullPath($decoded)
      } else {
        $absTarget = [System.IO.Path]::GetFullPath((Join-Path $mdDir $decoded))
      }
    } catch {
      $absTarget = $null
    }

    if ($null -eq $absTarget -or -not (Test-Path -LiteralPath $absTarget)) {
      $relMd = $md.FullName.Substring($repoRoot.Length).TrimStart('\', '/')
      [void]$broken.Add([pscustomobject]@{
        From = $relMd
        Link = $filePart
        Reason = 'not-found'
      })
      continue
    }

    if ($IncludeEmptyTargets) {
      $info = Get-Item -LiteralPath $absTarget -ErrorAction SilentlyContinue
      if ($info -and $info.PSIsContainer) { continue } # directory link
      if ($info -and $info.Length -eq 0 -and $info.Name -ne '.gitkeep') {
        $relMd = $md.FullName.Substring($repoRoot.Length).TrimStart('\', '/')
        [void]$emptyTargets.Add([pscustomobject]@{
          From = $relMd
          Link = $filePart
          Reason = 'empty-target (0-byte; OneDrive ReparsePoint? vidi docs/EMPTY-DOCS-RUNBOOK.md)'
        })
      }
    }
  }
}

Write-Host ''
Write-Host "== Rezime ==" -ForegroundColor Cyan
Write-Host ("Linkova prošlo kroz parser: {0}" -f $linkCount)
$brokenColor = 'Green'
if ($broken.Count -gt 0) { $brokenColor = 'Yellow' }
$emptyColor = 'Green'
if ($emptyTargets.Count -gt 0) { $emptyColor = 'Yellow' }
Write-Host ("Broken (not-found): {0}" -f $broken.Count) -ForegroundColor $brokenColor
Write-Host ("Empty targets (0-byte): {0}" -f $emptyTargets.Count) -ForegroundColor $emptyColor

if ($broken.Count -gt 0) {
  Write-Host ''
  Write-Host '== Broken linkovi (not-found) ==' -ForegroundColor Yellow
  $shown = [Math]::Min($broken.Count, $MaxOutput)
  $broken | Select-Object -First $shown | Format-Table -AutoSize From, Link
  if ($broken.Count -gt $MaxOutput) {
    Write-Host ("... još {0} (povećaj -MaxOutput za pun spisak)" -f ($broken.Count - $MaxOutput)) -ForegroundColor DarkYellow
  }
}

if ($emptyTargets.Count -gt 0 -and $IncludeEmptyTargets) {
  Write-Host ''
  Write-Host '== Empty targets (0-byte; pogledaj docs/EMPTY-DOCS-RUNBOOK.md za Korak 1/2/3 restore) ==' -ForegroundColor Yellow
  $shownE = [Math]::Min($emptyTargets.Count, $MaxOutput)
  $emptyTargets | Select-Object -First $shownE | Format-Table -AutoSize From, Link
  if ($emptyTargets.Count -gt $MaxOutput) {
    Write-Host ("... još {0} (povećaj -MaxOutput za pun spisak)" -f ($emptyTargets.Count - $MaxOutput)) -ForegroundColor DarkYellow
  }
}

Write-Host ''
Write-Host 'Napomene:' -ForegroundColor DarkGray
Write-Host '  - Empty targets su pokriveni runbook-om: docs/EMPTY-DOCS-RUNBOOK.md (Korak 1 git history / Korak 2 OneDrive cloud / Korak 3 rucna rekonstrukcija).' -ForegroundColor DarkGray
Write-Host '  - Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / required check Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md).' -ForegroundColor DarkGray
Write-Host '  - Smoke (HTTP) i Atina bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).' -ForegroundColor DarkGray
Write-Host '  - LATEST verify: docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md (Val 355); smoke: docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md (Val 351).' -ForegroundColor DarkGray
Write-Host '  - Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md i docs/NIVO-1-DRYRUN-LOG.md. F.4: docs/NIVO-1-F4-TIM-CHECKLIST.md.' -ForegroundColor DarkGray

if ($FailOnBroken -and ($broken.Count -gt 0 -or ($IncludeEmptyTargets -and $emptyTargets.Count -gt 0))) {
  Write-Host '== EXIT 1: -FailOnBroken i postoji bar jedan broken / empty link ==' -ForegroundColor Red
  exit 1
}
exit 0
