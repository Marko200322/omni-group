<#
.SYNOPSIS
  PowerShell help blok pozicija skener (informativan, opciono pre-PR gate sa `-FailOnViolation`). Validira da svaki `scripts/*.ps1` ima comment-based help blok (otvoreno sa "less-than hash" i zatvoreno sa "hash greater-than") PRE `#Requires` direktive - eksplicitan preventivni gate za Talas 70 lesson (`#Requires` na vrhu raskida vezu help bloka sa script scope-om, `Get-Help.Description` vraca `$null`). Komplementaran sa [`scripts/regenerate-help-snapshot.ps1`](./regenerate-help-snapshot.ps1) (sporo otkriva indirektno preko `Get-Help`) - ovaj skener je 10x brzi (~0.5 s vs ~5 s) i daje preciznu poruku koja kaze sta tacno premestiti. Konsolidovani runbook (single entry point): `scripts/run-all-audits.ps1`. Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa skenira `scripts/*.ps1` (**43** PS skripte — 2026-05-15 baseline posle Talas **114**; Talas 76 bio 11–12 u ranijem monorepu) i za svaku validira poredak prvih nekoliko nekomentarisanih elemenata u sirovom tekstu fajla. Ekstraktuje 3 statusa:

    1. OK - help blok postoji i dolazi PRE bilo koje druge ne-komentarne / ne-prazne linije (ukljucujuci `#Requires`, `param(...)`, `function`, itd.).
    2. VIOLATION - `#Requires` (ili druga code linija) dolazi PRE help bloka. Ovo raskida PowerShell comment-based help binding pravilo (Talas 70 - vidi [`scripts/AGENT-AUTOMATION-GUIDE.md`](./AGENT-AUTOMATION-GUIDE.md) sekcija 2 korak 1) i `Get-Help <script> -Full` ce vratiti Description = $null cak i kad blok postoji. Eksplicitna poruka vraca liniju gde je problem, sa predlogom premestanja.
    3. NO-HELP - fajl uopste nema help open-tag. Nije VIOLATION sam po sebi (mozda je skripta toliko jednostavna da ne treba help), ali generator [`regenerate-help-snapshot.ps1`](./regenerate-help-snapshot.ps1) ce ga tretirati kao `0 / N` u smoke testu. Ovo je upozorenje, ne greska.

  Read-only audit: ne menja fajlove. Ne povecava scope `verify-monorepo.ps1` (pun mirror ukljucuje apps/omnigroup-web build osim sa -SkipOmnigroupWeb; CI mirror ostaje isti - `audit-doc-gate-references.ps1` (Doslednost dok md/txt+yaml/ps1/ini, uklj. par EVIDENCE-INDEX / NIVO-1-DRYRUN-LOG, u scripts/README.md), pytest, Atina test:ci, Omnigroup build, Nest verify:ci, compose). Optional pre-PR check za otkrivanje regresija u poretku help blok-a.
  Smoke (HTTP) i bundled Atina `npm run smoke:all`: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests). Required-check display: Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md.

.PARAMETER FailOnViolation
  Vraca exit 1 ako bilo koji `*.ps1` ima VIOLATION status (`#Requires` ili druga code linija pre help bloka). Bez ove opcije, uvek vraca 0 (skripta je informativna).

.PARAMETER FailOnNoHelp
  Strozija opcija: vraca exit 1 i za NO-HELP status (fajl nema help bloka uopste). Default `false` - NO-HELP je upozorenje, ne greska.

.PARAMETER MaxOutput
  Maksimalan broj redova u Detalji sekciji. Default 50.

.PARAMETER AdditionalPaths
  Niz dodatnih direktorijuma za skeniranje (relativni od repo root-a). Skripte iz tih direktorijuma se dodaju na default-ni `scripts/` skup. Default `@()` - prazan niz, samo `scripts/`. Primer: `-AdditionalPaths @("atina-platform/atina/scripts","atina-system/scripts")` skenira i Atina i Atina-system PS skripte. Talas 77 dodatak.

.PARAMETER IncludeAtinaScripts
  Shorthand switch za `-AdditionalPaths @("atina-platform/atina/scripts")`. Vlasnik moze pokrenuti `... -IncludeAtinaScripts -FailOnNoHelp` da dobije listu Atina PS skripti koje cekaju strukturirani help blok (NO-HELP status). Default **43 / 43 OK** iz `scripts/` (2026-05-15 baseline). Talas 77 dodatak.

.EXAMPLE
  .\scripts\check-help-blocks-position.ps1
  # Default: skenira samo scripts/*.ps1 (43 skripte), prijavljuje VIOLATION + NO-HELP, exit 0 uvek.

.EXAMPLE
  .\scripts\check-help-blocks-position.ps1 -FailOnViolation
  # Pre-PR gate-flavor: exit 1 ako bilo koja skripta ima `#Requires` pre help bloka.

.EXAMPLE
  .\scripts\check-help-blocks-position.ps1 -FailOnViolation -FailOnNoHelp
  # Maksimalna strogost: exit 1 i za VIOLATION i za NO-HELP.

.EXAMPLE
  .\scripts\check-help-blocks-position.ps1 -IncludeAtinaScripts
  # Talas 77: prosiruje skup na atina-platform/atina/scripts/*.ps1 (43 + 8 = 51 skripti). Korisno za vlasnika koji zeli pregled NO-HELP statusa u Atina-area.

.EXAMPLE
  .\scripts\check-help-blocks-position.ps1 -AdditionalPaths @("atina-platform/atina/scripts","atina-system/scripts")
  # Eksplicitno dodavanje vise direktorijuma.

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 76 = ovaj skript; ukupno 39 koraka Talas 65-192).
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
  [switch]$FailOnViolation,
  [switch]$FailOnNoHelp,
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

Write-Host '== check-help-blocks-position.ps1 - Talas 70 preventivni gate (help blok PRE #Requires) ==' -ForegroundColor Cyan
Write-Host ("   FailOnViolation: {0}" -f $FailOnViolation) -ForegroundColor DarkGray
Write-Host ("   FailOnNoHelp: {0}" -f $FailOnNoHelp) -ForegroundColor DarkGray
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
  $name = $relPath
  $lines = Get-Content -LiteralPath $f.FullName -Encoding UTF8

  # Naci prvu znacajnu liniju (ne-prazna, ne-komentar):
  # - <# pocinje help blok
  # - #Requires je direktiva (PROBLEM ako je pre <#)
  # - param(, function, $var =, ostalo = code linija (PROBLEM ako je pre <#)
  # - # komentar (jedan red) — preskoci
  # - prazna linija — preskoci

  $helpStartLine = $null  # gde pocinje <#
  $helpEndLine = $null    # gde se zavrsava #>
  $firstCodeLine = $null  # prva code linija (#Requires, param, etc)
  $firstCodeContent = $null
  $inHelpBlock = $false

  for ($i = 0; $i -lt $lines.Count; $i++) {
    $rawLine = $lines[$i]
    $trimmed = $rawLine.Trim()

    if ($inHelpBlock) {
      if ($trimmed -match '#>') {
        $helpEndLine = $i + 1
        $inHelpBlock = $false
      }
      continue
    }

    if ([string]::IsNullOrWhiteSpace($trimmed)) { continue }

    # Ako je <# — pocetak help bloka
    if ($trimmed -match '^<#') {
      $helpStartLine = $i + 1
      $inHelpBlock = $true
      # Mozda se zavrsava na istoj liniji
      if ($trimmed -match '#>') {
        $helpEndLine = $i + 1
        $inHelpBlock = $false
      }
      continue
    }

    # Ako je single-line komentar (# ali ne #Requires) — preskoci
    if ($trimmed -match '^#' -and -not ($trimmed -match '^#Requires')) {
      continue
    }

    # Inace, prva code linija (#Requires, param, function, $var=, etc)
    if (-not $firstCodeLine) {
      $firstCodeLine = $i + 1
      $firstCodeContent = if ($trimmed.Length -gt 60) { $trimmed.Substring(0, 57) + '...' } else { $trimmed }
    }

    # Ako vec imamo help blok, mozemo prekinuti — ne treba dalje
    if ($helpStartLine) { break }
    # Ako nema help bloka, nastavi da trazis (ali smo vec setovali firstCodeLine)
    # Mozemo prekinuti rano — ne treba ceo fajl
    break
  }

  $status = $null
  $detail = $null

  if ($helpStartLine -and -not $firstCodeLine) {
    # Help blok je prvi — OK
    $status = 'OK'
    $detail = ('help <# u L{0}, #> u L{1}' -f $helpStartLine, ($helpEndLine | ForEach-Object { if ($_) { $_ } else { '?' } }))
  }
  elseif ($helpStartLine -and $firstCodeLine -and $firstCodeLine -lt $helpStartLine) {
    # Code linija je pre help bloka — VIOLATION
    $status = 'VIOLATION'
    $detail = ('code u L{0} ("{1}") PRE help <# u L{2} - premesti #Requires/param ispod #>' -f $firstCodeLine, $firstCodeContent, $helpStartLine)
  }
  elseif ($helpStartLine -and $firstCodeLine -and $firstCodeLine -gt $helpStartLine) {
    # Help je prvi, ali smo nasli i code liniju kasnije — to je OK (znaci da je code bio posle #>)
    $status = 'OK'
    $detail = ('help <# u L{0}, code prvi posle u L{1}' -f $helpStartLine, $firstCodeLine)
  }
  elseif (-not $helpStartLine -and $firstCodeLine) {
    # Nema help bloka uopste, samo code
    $status = 'NO-HELP'
    $detail = ('nema <# bloka; prva code linija u L{0} ("{1}")' -f $firstCodeLine, $firstCodeContent)
  }
  else {
    # Prazno ili neuhvativo
    $status = 'NO-HELP'
    $detail = '(nema <# bloka, nema code linije — moguce prazan fajl)'
  }

  $results.Add([pscustomobject]@{
    Script = $name
    Status = $status
    Detail = $detail
  }) | Out-Null
}

$totalScripts = $results.Count
$okCount = @($results | Where-Object { $_.Status -eq 'OK' }).Count
$violationCount = @($results | Where-Object { $_.Status -eq 'VIOLATION' }).Count
$noHelpCount = @($results | Where-Object { $_.Status -eq 'NO-HELP' }).Count

Write-Host ''
Write-Host '== Pregled po skripti ==' -ForegroundColor Cyan
$results | Sort-Object -Property Status, Script | Select-Object -First $MaxOutput | Format-Table -AutoSize -Wrap | Out-String | Write-Host

Write-Host '== Sumirano ==' -ForegroundColor Cyan
Write-Host ("  PS skripti u scripts/:  {0}" -f $totalScripts)
Write-Host ("  OK (help <# pre #Requires):  {0}" -f $okCount)
Write-Host ("  VIOLATION (#Requires pre <#): {0}" -f $violationCount)
Write-Host ("  NO-HELP (nema <# bloka):     {0}" -f $noHelpCount)

if ($violationCount -gt 0) {
  Write-Host ''
  Write-Host ("UPOZORENJE: {0} skripta(e) sa VIOLATION - pogresan poredak help bloka (Talas 70 lesson)" -f $violationCount) -ForegroundColor Red
  $violations = $results | Where-Object { $_.Status -eq 'VIOLATION' }
  foreach ($v in $violations) {
    Write-Host ("  - {0}: {1}" -f $v.Script, $v.Detail) -ForegroundColor Red
  }
  Write-Host ''
  Write-Host 'Fix: premesti #Requires direktivu (i bilo koju code liniju) ISPOD #> closing-tag-a help bloka.' -ForegroundColor DarkGray
  Write-Host '     Razlog: PowerShell comment-based help parser raskida vezu help bloka sa script scope-om' -ForegroundColor DarkGray
  Write-Host '     ako bilo koja code linija dodje pre <# ... #>, sto cini Get-Help.Description = $null.' -ForegroundColor DarkGray
  Write-Host '     Detaljnije: scripts/AGENT-AUTOMATION-GUIDE.md sekcija 2, korak 1.' -ForegroundColor DarkGray
}

if ($noHelpCount -gt 0) {
  Write-Host ''
  Write-Host ("Info: {0} skripta(e) sa NO-HELP - bez <# blokova" -f $noHelpCount) -ForegroundColor Yellow
  $noHelps = $results | Where-Object { $_.Status -eq 'NO-HELP' }
  foreach ($n in $noHelps) {
    Write-Host ("  - {0}: {1}" -f $n.Script, $n.Detail) -ForegroundColor Yellow
  }
  Write-Host ''
  Write-Host 'Predlog: dodaj <# .SYNOPSIS .DESCRIPTION .EXAMPLE .NOTES #> blok (template u AGENT-AUTOMATION-GUIDE.md sekcija 2 korak 1).' -ForegroundColor DarkGray
}

Write-Host ''
Write-Host 'Napomene:' -ForegroundColor DarkGray
Write-Host '  - Komplementaran: regenerate-help-snapshot.ps1 (Get-Help indirektno otkriva, sporije ~5s).'
Write-Host '  - Komplementaran: check-script-readme-coverage.ps1 (svaki PS u scripts/README.md).'
Write-Host '  - Komplementaran: check-talas-cross-references.ps1 (Talas N uskladjenost master / dry-run / summary / TALAS-INDEX).'
Write-Host '  - run-all-audits.ps1: 39 koraka (37 read-only + TODO + npm); single entry point.'
Write-Host '  - Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md; pun mirror ukljucuje apps/omnigroup-web build osim sa -SkipOmnigroupWeb).'
Write-Host '  - Smoke (HTTP) i bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).'
Write-Host '  - Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md (LATEST verify Val 355; smoke Val 351).'
Write-Host '  - Operativni handbook (Talas 65->192 lessons): scripts/AGENT-AUTOMATION-GUIDE.md.'

if ($FailOnViolation -and $violationCount -gt 0) {
  exit 1
}
if ($FailOnNoHelp -and $noHelpCount -gt 0) {
  exit 1
}
exit 0
