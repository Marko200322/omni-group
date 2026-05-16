<#
.SYNOPSIS
  Reverse-coverage skener (informativan, opciono pre-PR gate sa `-FailOnUncovered`). Verifikuje da svaki `scripts/*.ps1` ima bar jedan mention u [`scripts/README.md`](./README.md), tako da nema „siroče" PowerShell skripti bez navigacionog ulaza za vlasnika. Komplementaran sa [`scripts/regenerate-help-snapshot.ps1`](./regenerate-help-snapshot.ps1) (svaki PS treba da ima `Get-Help` blokove) i [`scripts/check-dev-docs-coverage.ps1`](./check-dev-docs-coverage.ps1) (svaki `*.md` mora biti u `apps/omnigroup-web/src/app/dev/docs/page.tsx` hub-u). Konsolidovani runbook (single entry point): `scripts/run-all-audits.ps1`.

.DESCRIPTION
  Iz korena repoa skenira `scripts/*.ps1` (**43** PS skripte — 2026-05-15 baseline posle Talas **114**; Talas 74 je krenuo od manjeg skupa) i za svaku proverava da li se basename (npr. `audit-doc-gate-references.ps1`) pojavljuje barem `-MinMentions` puta u `scripts/README.md`:
    - **Kategorije:** PS skript ima `>= -MinMentions` mention-a u README-u (default 1, vlasnik default-baseline 6).
    - **Siroče:** PS skript ima **0** mention-a — verovatno novokreirana ili premestena bez dopune README-a.
    - **Slabo pokrivena:** `1..(-MinMentions - 1)` mention-a — verovatno samo placeholder ili kratak entry; vlasnik može odlučiti da dopuni.
  **Lock** cilj sa `-MinMentions 6`: sve root skripte imaju bar 6 mention-a u README hub-u (proveri `check-script-readme-coverage.ps1 -MinMentions 6`). Ako vlasnik doda novu skriptu, ovaj skener će je odmah uhvatiti kao siroče dok ne dobije sekciju u `scripts/README.md`.
  Read-only audit: ne menja fajlove. **Ne** povećava scope `verify-monorepo.ps1` (pun mirror uključuje apps/omnigroup-web build osim sa -SkipOmnigroupWeb; CI mirror ostaje isti — `audit-doc-gate-references.ps1` (Doslednost dok md/txt+yaml/ps1/ini, uklj. par EVIDENCE-INDEX / NIVO-1-DRYRUN-LOG, u scripts/README.md), pytest, Atina test:ci, Omnigroup build, Nest verify:ci, compose). Optional pre-PR check za otkrivanje siroče skripti.
  Smoke (HTTP) i bundled Atina `npm run smoke:all`: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes — Smoke tests). Required-check display: Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md.

.PARAMETER MinMentions
  Najmanji broj mention-a u README-u koji se smatra dovoljnim. Default `1` — striktno samo siroče skripte se reportuju. Sa `-MinMentions 6` se prijavljuju i slabo pokrivene (Talas 74 baseline minimum je 6 — ako padne ispod, znak je da je entry preveden u uzgredni mention).

.PARAMETER FailOnUncovered
  Vraća exit 1 ako postoji bilo koja siroče PS skripta (mention < `-MinMentions`). Bez ove opcije, uvek vraća 0 (skripta je informativna).

.PARAMETER MaxOutput
  Maksimalan broj redova u Detalji sekciji. Default 50 (43 skripte, manje od limita uvek).

.EXAMPLE
  .\scripts\check-script-readme-coverage.ps1
  # Default: skenira sve scripts/*.ps1, prijavljuje samo siroče (mention = 0), exit 0 uvek.

.EXAMPLE
  .\scripts\check-script-readme-coverage.ps1 -MinMentions 6 -FailOnUncovered
  # Strožija verifikacija: svaka skripta mora imati >= 6 mention-a (Talas 74 baseline); exit 1 ako neka padne ispod.

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 74 = ovaj skript; ukupno 39 koraka Talas 65-192).
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
  [int]$MinMentions = 1,
  [switch]$FailOnUncovered,
  [int]$MaxOutput = 50
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

$readmePath = Join-Path $scriptsDir 'README.md'
if (-not (Test-Path $readmePath)) {
  Write-Host ("ERROR: nedostaje fajl: {0}" -f $readmePath) -ForegroundColor Red
  exit 2
}

Write-Host '== check-script-readme-coverage.ps1 - svaki scripts/*.ps1 -> mention u scripts/README.md ==' -ForegroundColor Cyan
Write-Host ("   MinMentions: {0} (siroce ako mention < MinMentions)" -f $MinMentions) -ForegroundColor DarkGray
Write-Host ("   FailOnUncovered: {0}" -f $FailOnUncovered) -ForegroundColor DarkGray

$readmeText = Get-Content -LiteralPath $readmePath -Encoding UTF8 -Raw
$psFiles = Get-ChildItem -Path $scriptsDir -Filter '*.ps1' -File | Sort-Object Name

$results = New-Object 'System.Collections.Generic.List[object]'
foreach ($f in $psFiles) {
  $name = $f.Name
  $pattern = [regex]::Escape($name)
  $matches = [regex]::Matches($readmeText, $pattern)
  $count = $matches.Count
  $status = if ($count -eq 0) { 'SIROCE' } elseif ($count -lt $MinMentions) { 'SLABO' } else { 'OK' }
  $results.Add([pscustomobject]@{
    Script = $name
    Mentions = $count
    Status = $status
  }) | Out-Null
}

$totalScripts = $results.Count
# NOTE: @(...) je obavezan jer ($x | Where).Count vraca $null kad je rezultat 1 objekat (PS 5.1 quirk).
$siroceCount = @($results | Where-Object { $_.Status -eq 'SIROCE' }).Count
$slaboCount = @($results | Where-Object { $_.Status -eq 'SLABO' }).Count
$okCount = @($results | Where-Object { $_.Status -eq 'OK' }).Count

Write-Host ''
Write-Host '== Pregled po skripti ==' -ForegroundColor Cyan
$results | Sort-Object -Property Mentions, Script | Select-Object -First $MaxOutput | Format-Table -AutoSize | Out-String | Write-Host

Write-Host ''
Write-Host '== Sumirano ==' -ForegroundColor Cyan
Write-Host ("  PS skripti u scripts/:  {0}" -f $totalScripts)
Write-Host ("  OK   (>= {0} mention-a):  {1}" -f $MinMentions, $okCount)
Write-Host ("  SLABO (1..{0} mention-a): {1}" -f ($MinMentions - 1), $slaboCount)
Write-Host ("  SIROCE (0 mention-a):   {0}" -f $siroceCount)

if ($siroceCount -gt 0) {
  Write-Host ''
  Write-Host ("UPOZORENJE: {0} siroce PS skripta(e) - bez mention-a u scripts/README.md" -f $siroceCount) -ForegroundColor Yellow
  $siroce = $results | Where-Object { $_.Status -eq 'SIROCE' }
  foreach ($s in $siroce) {
    Write-Host ("  - {0}" -f $s.Script) -ForegroundColor Yellow
  }
  Write-Host ''
  Write-Host 'Predlog: dodaj sekciju za svaku siroce skriptu u scripts/README.md (sa kratkim opisom + tipicnim use-case-om).' -ForegroundColor DarkGray
}

if ($slaboCount -gt 0 -and $MinMentions -gt 1) {
  Write-Host ''
  Write-Host ("Info: {0} skripta(e) sa mention-om 1..{1} (ispod -MinMentions praga {2})." -f $slaboCount, ($MinMentions - 1), $MinMentions) -ForegroundColor DarkGray
}

Write-Host ''
Write-Host 'Napomene:' -ForegroundColor DarkGray
Write-Host '  - Komplementaran: regenerate-help-snapshot.ps1 (Get-Help blokovi za svaku PS skriptu).'
Write-Host '  - Komplementaran: check-dev-docs-coverage.ps1 (svaki *.md u dev/docs hub-u).'
Write-Host '  - Komplementaran: check-talas-cross-references.ps1 (Talas N uskladjenost master / dry-run / summary / TALAS-INDEX).'
Write-Host '  - run-all-audits.ps1: 39 koraka (37 read-only + TODO + npm); single entry point.'
Write-Host '  - Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md; pun mirror ukljucuje apps/omnigroup-web build osim sa -SkipOmnigroupWeb).'
Write-Host '  - Smoke (HTTP) i bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).'
Write-Host '  - Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md (LATEST verify Val 355; smoke Val 351).'
Write-Host '  - Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md i docs/NIVO-1-DRYRUN-LOG.md.'

if ($FailOnUncovered -and $siroceCount -gt 0) {
  exit 1
}
exit 0
