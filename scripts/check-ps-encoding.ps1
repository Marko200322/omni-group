<#
.SYNOPSIS
  PowerShell encoding skener (informativan, opciono pre-PR gate sa `-FailOnWarn`). Validira da svaki `*.ps1` u skenirajucim direktorijumima ima ili pure-ASCII sadrzaj (siguran u svakom code page-u) ili UTF-8 sa BOM-om (siguran za non-ASCII karaktere u svim sredinama). Eksplicitan preventivni gate za **Talas 72** lesson (`check-talas-cross-references.ps1` parser-fail bez BOM-a) i **Talas 74** lesson (`check-script-readme-coverage.ps1` parser-fail bez BOM-a). Komplementaran sa [`scripts/regenerate-help-snapshot.ps1`](./regenerate-help-snapshot.ps1) (taj indirektno otkriva preko `Get-Help` execution greske u runtime-u). Konsolidovani runbook (single entry point): `scripts/run-all-audits.ps1`. Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa skenira `scripts/*.ps1` (**43** PS skripte — Talas **114** baseline) i za svaku validira encoding. Cita prva 3 byte-a (BOM check) i ostatak fajla (non-ASCII byte > 127 check). 4 statusa:

    1. OK-ASCII - pure ASCII (svi byte-ovi 0-127), bez BOM-a. Najlaksi za git diff i merge; siguran u svakom code page-u i OS-u. Idealno stanje za jednostavne skripte bez specijalnih karaktera.
    2. OK-BOM - pure ASCII sa BOM-om. Tehnicki OK ali BOM je suvisan (nema non-ASCII karaktera). Nekiput se desava posle `[System.Text.UTF8Encoding]($true)` redirecta u editoru.
    3. OK-UTF8 - non-ASCII karakteri sa BOM-om. Ovo je `idealno stanje` za skripte koje koriste cirilicu, srpsku latinicu, emoji, ili specijalne karaktere - PowerShell parser zna kako da cita fajl jer BOM eksplicitno deklaruje UTF-8.
    4. WARN-NO-BOM - non-ASCII karakteri bez BOM-a. Ovo je `rizik` jer parser interpretira fajl preko system code page-a (na Windows-u: Windows-1252 / CP1252 koji pokriva Western European karaktere). `Trenutno radi` ako su svi non-ASCII karakteri u CP1252 setu (npr. `š`, `č`, `ć`, `→`, `–`), `ali pada` cim agent doda karakter izvan CP1252 (cirilica, kineski, arapski, neki emoji). Talas 72/74 lessons su dosli iz tog rizika - novi skript je imao karakter koji parser nije mogao da raspozna.

  Read-only audit: ne menja fajlove. Default je informativan - prijavljuje sve 4 statusa ali exit 0. Sa `-FailOnWarn` exit 1 ako bilo koji fajl ima `WARN-NO-BOM` status (pre-PR strogi rezim za novi razvoj). `scripts/*.ps1` baseline (2026-05-15): UTF-8 sa BOM (`OK-UTF8`) da Talas 72/74 parser rizik ostane nizak; `run-all-audits.ps1` korak 7 ostaje informativan (exit 0) osim ako neko uvede novi fajl bez BOM-a i ukljucite `-FailOnWarn`.

.PARAMETER FailOnWarn
  Vraca exit 1 ako bilo koji `*.ps1` ima `WARN-NO-BOM` status. Bez ove opcije, uvek vraca 0 (informativan). Korisno za pre-PR strogi rezim u CI ekspanziji ili lokalnom razvoju.

.PARAMETER MaxOutput
  Maksimalan broj redova u Detalji sekciji. Default 50.

.PARAMETER AdditionalPaths
  Niz dodatnih direktorijuma za skeniranje (relativni od repo root-a). Skripte iz tih direktorijuma se dodaju na default-ni `scripts/` skup. Default `@()` - prazan niz, samo `scripts/`. Primer: `-AdditionalPaths @("atina-platform/atina/scripts","atina-system/scripts")`. Talas 77/78 konvencija (consistency sa `check-help-blocks-position.ps1`).

.PARAMETER IncludeAtinaScripts
  Shorthand switch za `-AdditionalPaths @("atina-platform/atina/scripts")`. Vlasnik moze pokrenuti `... -IncludeAtinaScripts` da dobije pregled encoding statusa svih 8 Atina PS skripti. Talas 77/78 konvencija.

.EXAMPLE
  .\scripts\check-ps-encoding.ps1
  # Default: skenira scripts/*.ps1 (43 skripte), prijavljuje 4 statusa, exit 0 uvek (informativan).

.EXAMPLE
  .\scripts\check-ps-encoding.ps1 -FailOnWarn
  # Strogi rezim: exit 1 ako bilo koji fajl ima WARN-NO-BOM status.

.EXAMPLE
  .\scripts\check-ps-encoding.ps1 -IncludeAtinaScripts
  # Talas 77/78: skenira i atina-platform/atina/scripts/*.ps1 (42 + 8 = 50 PS skripti).

.EXAMPLE
  .\scripts\check-ps-encoding.ps1 -AdditionalPaths @("atina-platform/atina/scripts","atina-system/scripts")
  # Eksplicitno dodavanje vise direktorijuma.

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 78 = ovaj skript; ukupno 39 koraka Talas 65-192).
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
  [string[]]$AdditionalPaths = @(),
  [switch]$IncludeAtinaScripts
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

if ($IncludeAtinaScripts) {
  $AdditionalPaths = @($AdditionalPaths) + @('atina-platform/atina/scripts')
}

Write-Host '== check-ps-encoding.ps1 - Talas 72/74 BOM lessons preventivni gate ==' -ForegroundColor Cyan
Write-Host ("   FailOnWarn: {0}" -f $FailOnWarn) -ForegroundColor DarkGray
if ($AdditionalPaths.Count -gt 0) {
  Write-Host ("   AdditionalPaths: {0}" -f ($AdditionalPaths -join ', ')) -ForegroundColor DarkGray
}

$psFiles = @(Get-ChildItem -Path $scriptsDir -Filter '*.ps1' -File | Sort-Object Name)
foreach ($p in $AdditionalPaths) {
  $absPath = Join-Path $repoRoot $p
  if (-not (Test-Path -LiteralPath $absPath)) {
    Write-Host ("   UPOZORENJE: AdditionalPath ne postoji: {0}" -f $p) -ForegroundColor Yellow
    continue
  }
  $extra = @(Get-ChildItem -Path $absPath -Filter '*.ps1' -File | Sort-Object Name)
  $psFiles = @($psFiles) + @($extra)
}

$results = New-Object 'System.Collections.Generic.List[object]'
foreach ($f in $psFiles) {
  $relPath = $f.FullName.Substring($repoRoot.Length).TrimStart('\','/').Replace('\','/')
  $bytes = [System.IO.File]::ReadAllBytes($f.FullName)

  $hasBom = $false
  if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    $hasBom = $true
  }

  $hasNonAscii = $false
  $firstNonAsciiByte = -1
  $startIdx = if ($hasBom) { 3 } else { 0 }
  for ($i = $startIdx; $i -lt $bytes.Length; $i++) {
    if ($bytes[$i] -gt 127) {
      $hasNonAscii = $true
      if ($firstNonAsciiByte -eq -1) { $firstNonAsciiByte = $i }
      break
    }
  }

  $status = $null
  $detail = $null
  if (-not $hasNonAscii -and -not $hasBom) {
    $status = 'OK-ASCII'
    $detail = ('pure ASCII; {0} byte-ova' -f $bytes.Length)
  }
  elseif (-not $hasNonAscii -and $hasBom) {
    $status = 'OK-BOM'
    $detail = ('pure ASCII sa BOM-om; {0} byte-ova (BOM suvisan ali ne skodi)' -f $bytes.Length)
  }
  elseif ($hasNonAscii -and $hasBom) {
    $status = 'OK-UTF8'
    $detail = ('non-ASCII sa BOM-om; {0} byte-ova; prvi non-ASCII byte u offset-u {1}' -f $bytes.Length, $firstNonAsciiByte)
  }
  else {
    $status = 'WARN-NO-BOM'
    $detail = ('non-ASCII bez BOM-a; {0} byte-ova; prvi non-ASCII byte u offset-u {1} (parser fallback na CP1252 - rizik)' -f $bytes.Length, $firstNonAsciiByte)
  }

  $results.Add([pscustomobject]@{
    Script = $relPath
    Status = $status
    Detail = $detail
  }) | Out-Null
}

$totalScripts = $results.Count
$okAscii = @($results | Where-Object { $_.Status -eq 'OK-ASCII' }).Count
$okBom   = @($results | Where-Object { $_.Status -eq 'OK-BOM' }).Count
$okUtf8  = @($results | Where-Object { $_.Status -eq 'OK-UTF8' }).Count
$warn    = @($results | Where-Object { $_.Status -eq 'WARN-NO-BOM' }).Count

Write-Host ''
Write-Host '== Pregled po skripti ==' -ForegroundColor Cyan
$results | Sort-Object -Property Status, Script | Select-Object -First $MaxOutput | Format-Table -AutoSize -Wrap | Out-String | Write-Host

Write-Host '== Sumirano ==' -ForegroundColor Cyan
Write-Host ("  PS skripti skenirano:        {0}" -f $totalScripts)
Write-Host ("  OK-ASCII (pure ASCII):       {0}" -f $okAscii)
Write-Host ("  OK-BOM (ASCII + BOM):        {0}" -f $okBom)
Write-Host ("  OK-UTF8 (non-ASCII + BOM):   {0}" -f $okUtf8)
Write-Host ("  WARN-NO-BOM (non-ASCII bez BOM-a): {0}" -f $warn)

if ($warn -gt 0) {
  Write-Host ''
  Write-Host ("UPOZORENJE: {0} skripta(e) sa WARN-NO-BOM - non-ASCII bez BOM-a (Talas 72/74 lesson)" -f $warn) -ForegroundColor Yellow
  $warns = $results | Where-Object { $_.Status -eq 'WARN-NO-BOM' }
  foreach ($w in $warns) {
    Write-Host ("  - {0}: {1}" -f $w.Script, $w.Detail) -ForegroundColor Yellow
  }
  Write-Host ''
  Write-Host 'Info: PowerShell parser pada cim agent doda karakter izvan CP1252 (cirilica, kineski, neki emoji).' -ForegroundColor DarkGray
  Write-Host '      Trenutno radi ako su svi non-ASCII karakteri u Western European setu (s, c, c, ->, em-dash).' -ForegroundColor DarkGray
  Write-Host '      Predlog (vlasnik akcija): UTF-8 sa BOM-om za sigurnost preko OS-eva i agent dopune.' -ForegroundColor DarkGray
  Write-Host '      Detaljnije: scripts/AGENT-AUTOMATION-GUIDE.md sekcija 2 korak 2.' -ForegroundColor DarkGray
}

Write-Host ''
Write-Host 'Napomene:' -ForegroundColor DarkGray
Write-Host '  - Komplementaran: regenerate-help-snapshot.ps1 (Get-Help indirektno otkriva runtime greske).'
Write-Host '  - Komplementaran: check-help-blocks-position.ps1 (Talas 70 lesson - help blok pre #Requires).'
Write-Host '  - Komplementaran: check-script-readme-coverage.ps1 (svaki PS u scripts/README.md).'
Write-Host '  - run-all-audits.ps1: 39 koraka (37 read-only + TODO + npm); single entry point.'
Write-Host '  - Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md; pun mirror ukljucuje apps/omnigroup-web build osim sa -SkipOmnigroupWeb).'
Write-Host '  - Smoke (HTTP) i bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).'
Write-Host '  - Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md (LATEST verify Val 355; smoke Val 351).'
Write-Host '  - Operativni handbook (Talas 65->192 lessons): scripts/AGENT-AUTOMATION-GUIDE.md.'

if ($FailOnWarn -and $warn -gt 0) {
  exit 1
}
exit 0
