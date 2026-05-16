<#
.SYNOPSIS
  Paket README.md presence + zdravlje skener (informativan, opciono pre-PR gate sa `-FailOnWarn`). Validira da svaki kljucan paket monorepa (root, `apps/omnigroup-web`, `atina-platform/atina`, `atina-system`, `scripts`, `docs`, `atina-platform/atina/scripts`) ima `README.md` koji postoji, nije 0-byte, i sadrzi bar 1 H1 (`# `) heading. Talas 81 nastavak monorepo-wide structural consistency domena (Talas 79 - `package.json`; Talas 80 - workflow YAML); sad pokriven discoverability sloj. Read-only audit. Komplementaran sa `check-dev-docs-coverage.ps1` (hub completeness za sve `*.md`) i `check-doc-links.ps1` (broken / empty links). Konsolidovani runbook (single entry point): `scripts/run-all-audits.ps1`. Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa cita 7 default README putanja i validira:

    1. **Postojanje (`MISSING`)** - WARN ako fajl ne postoji.
    2. **Non-empty (`EMPTY`)** - WARN ako fajl postoji ali je 0-byte (OneDrive Files-On-Demand uzorak ili dehidrirani fajl).
    3. **H1 heading (`NO-H1`)** - WARN ako fajl postoji ali nema bar 1 red sa `# ` (single hash + space + tekst). Markdown bez H1 je tesko skenirati i predstavlja losu UX za onboarding.
    4. **Multi-H1 (`MULTI-H1`)** - INFO ako fajl ima vise od 1 H1 heading-a. Standardna markdown praksa kaze 1 H1 po dokumentu (kao `<h1>` u HTML); ostalo treba biti H2-H6. Vise od 1 H1 cesto znaci da su `## Section` greskom napisani kao `# Section`.

  Statusi: `OK`, `MISSING`, `EMPTY`, `NO-H1`, `MULTI-H1`. Read-only audit: ne menja fajlove. Default je informativan - prijavljuje sve nalaze, exit 0. Sa `-FailOnWarn` exit 1 ako bilo koji README ima MISSING/EMPTY/NO-H1 nalaz (MULTI-H1 ostaje INFO i ne podize exit).

.PARAMETER FailOnWarn
  Vraca exit 1 ako bilo koji README ima MISSING / EMPTY / NO-H1 status. MULTI-H1 status ostaje INFO i NE podize exit code (jer je stvar formatting konvencije, ne realan problem).

.PARAMETER MaxOutput
  Maksimalan broj redova u Detalji sekciji. Default 50.

.PARAMETER ReadmePaths
  Niz relativnih putanja do README.md fajlova za proveru. Default: 7 kljucnih README lokacija (root + 3 Node paketa + scripts + docs + atina-platform/atina/scripts). Vlasnik moze prosiriti ako se doda novi paket (npr. `apps/omnigroup-bff/README.md`).

.EXAMPLE
  .\scripts\check-readme-presence.ps1
  # Default: validira 7 default README putanja, prijavljuje WARN + INFO, exit 0 uvek (informativan).

.EXAMPLE
  .\scripts\check-readme-presence.ps1 -FailOnWarn
  # Strogi rezim: exit 1 ako bilo koji README ima MISSING/EMPTY/NO-H1 nalaz (MULTI-H1 ostaje INFO).

.EXAMPLE
  .\scripts\check-readme-presence.ps1 -ReadmePaths @("apps/omnigroup-web/README.md")
  # Eksplicitno suzavanje skupa (npr. samo jedan paket).

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 81 = ovaj skript; ukupno 39 koraka Talas 65-192).
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
  [string[]]$ReadmePaths = @(
    'README.md',
    'apps/omnigroup-web/README.md',
    'atina-platform/atina/README.md',
    'atina-system/README.md',
    'scripts/README.md',
    'docs/README.md',
    'atina-platform/atina/scripts/README.md'
  )
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

Write-Host '== check-readme-presence.ps1 - paket README.md presence + zdravlje ==' -ForegroundColor Cyan
Write-Host ("   FailOnWarn: {0}" -f $FailOnWarn) -ForegroundColor DarkGray
Write-Host ("   ReadmePaths: {0} putanja" -f $ReadmePaths.Count) -ForegroundColor DarkGray

$results = New-Object 'System.Collections.Generic.List[object]'

foreach ($rel in $ReadmePaths) {
  $abs = Join-Path $repoRoot $rel
  if (-not (Test-Path -LiteralPath $abs)) {
    $results.Add([pscustomobject]@{
      Path     = $rel
      Status   = 'MISSING'
      Severity = 'WARN'
      Bytes    = 0
      Lines    = 0
      H1Count  = 0
      Detail   = 'fajl ne postoji'
    }) | Out-Null
    continue
  }

  $info = Get-Item -LiteralPath $abs
  $bytes = $info.Length
  if ($bytes -eq 0) {
    $results.Add([pscustomobject]@{
      Path     = $rel
      Status   = 'EMPTY'
      Severity = 'WARN'
      Bytes    = 0
      Lines    = 0
      H1Count  = 0
      Detail   = '0-byte fajl (OneDrive dehidrirani uzorak ili prazan README)'
    }) | Out-Null
    continue
  }

  $contentLines = Get-Content -LiteralPath $abs -Encoding UTF8
  $lineCount = @($contentLines).Count
  # Preskaci code blokove (sve izmedju trojnih backtick-ova) pre H1 regex-a,
  # jer PowerShell `# komentari` u code blokovima nisu markdown H1 heading-i.
  $h1Lines = New-Object 'System.Collections.Generic.List[string]'
  $inCodeBlock = $false
  foreach ($line in $contentLines) {
    if ($line -match '^```') {
      $inCodeBlock = -not $inCodeBlock
      continue
    }
    if ($inCodeBlock) { continue }
    if ($line -match '^# [^#]') {
      $h1Lines.Add($line) | Out-Null
    }
  }
  $h1Count = $h1Lines.Count

  if ($h1Count -eq 0) {
    $results.Add([pscustomobject]@{
      Path     = $rel
      Status   = 'NO-H1'
      Severity = 'WARN'
      Bytes    = $bytes
      Lines    = $lineCount
      H1Count  = 0
      Detail   = 'nema bar 1 H1 heading (`# ` + tekst)'
    }) | Out-Null
  } elseif ($h1Count -gt 1) {
    $results.Add([pscustomobject]@{
      Path     = $rel
      Status   = 'MULTI-H1'
      Severity = 'INFO'
      Bytes    = $bytes
      Lines    = $lineCount
      H1Count  = $h1Count
      Detail   = ("{0} H1 heading-a (standardna praksa: 1 H1 po dokumentu)" -f $h1Count)
    }) | Out-Null
  } else {
    $results.Add([pscustomobject]@{
      Path     = $rel
      Status   = 'OK'
      Severity = 'OK'
      Bytes    = $bytes
      Lines    = $lineCount
      H1Count  = 1
      Detail   = ''
    }) | Out-Null
  }
}

Write-Host ''
Write-Host '== Rezultati po README ==' -ForegroundColor Cyan
$results | Format-Table Path, Status, Bytes, Lines, H1Count -AutoSize | Out-String | Write-Host

$findings = @($results | Where-Object { $_.Status -ne 'OK' })

Write-Host '== Nalazi (non-OK) ==' -ForegroundColor Cyan
if ($findings.Count -eq 0) {
  Write-Host '  (svi README su OK - postoje, non-empty, jedan H1)' -ForegroundColor Green
} else {
  $findings | Select-Object -First $MaxOutput | Format-Table Severity, Status, Path, Detail -AutoSize -Wrap | Out-String | Write-Host
}

$okCount     = @($results | Where-Object { $_.Status -eq 'OK' }).Count
$missing     = @($results | Where-Object { $_.Status -eq 'MISSING' }).Count
$empty       = @($results | Where-Object { $_.Status -eq 'EMPTY' }).Count
$noH1        = @($results | Where-Object { $_.Status -eq 'NO-H1' }).Count
$multiH1     = @($results | Where-Object { $_.Status -eq 'MULTI-H1' }).Count

Write-Host '== Sumirano ==' -ForegroundColor Cyan
Write-Host ("  README putanja proverljivo:        {0}" -f $results.Count)
Write-Host ("  OK (postoji + non-empty + 1 H1):    {0}" -f $okCount)
Write-Host ("  MISSING (ne postoji):                {0}" -f $missing)
Write-Host ("  EMPTY (0-byte):                      {0}" -f $empty)
Write-Host ("  NO-H1 (nema H1 heading):             {0}" -f $noH1)
Write-Host ("  MULTI-H1 (vise od 1 H1, INFO):       {0}" -f $multiH1)

$warnCount = $missing + $empty + $noH1
if ($warnCount -gt 0) {
  Write-Host ''
  Write-Host ("UPOZORENJE: {0} README sa MISSING/EMPTY/NO-H1 nalazom" -f $warnCount) -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Napomene:' -ForegroundColor DarkGray
Write-Host '  - Komplementaran: check-dev-docs-coverage.ps1 (hub completeness za sve *.md).'
Write-Host '  - Komplementaran: check-doc-links.ps1 (broken / empty link reference).'
Write-Host '  - run-all-audits.ps1: 39 koraka (37 read-only + TODO + npm); single entry point.'
Write-Host '  - Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md; pun mirror ukljucuje apps/omnigroup-web build osim sa -SkipOmnigroupWeb).'
Write-Host '  - Smoke (HTTP) i bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).'
Write-Host '  - Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md (LATEST verify Val 355; smoke Val 351).'
Write-Host '  - Operativni handbook (Talas 65->192 lessons): scripts/AGENT-AUTOMATION-GUIDE.md.'

if ($FailOnWarn -and $warnCount -gt 0) {
  exit 1
}
exit 0
