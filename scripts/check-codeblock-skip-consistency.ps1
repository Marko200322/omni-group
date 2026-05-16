<#
.SYNOPSIS
  Talas 85 preventivni gate: doslednost Lekcije #17 (markdown code-block fence skip) preko svih PS skripti koje parsiraju `*.md`. Read-only audit. Skenira `scripts/*.ps1` i prijavljuje status za svaku skriptu: `OK` (cita md i ima skip logiku), `MISSING-SKIP` (cita md ali nema skip logiku - WARN), `N/A` (ne cita md - irelevantno). Talas 81 / 82 / 83 / 84 ucenje formalizovano u mehanizovan regression sentinel: ako neko u buducnosti doda novi PS skener koji parsira markdown bez code-block skip-a, ovaj audit ce ga uhvatiti.

.DESCRIPTION
  Talas 81 je definisao Lekciju #17: markdown skeneri moraju preskakati code blokove (` ``` ... ``` `) pre primene line-pattern regex-a. Razlog: PowerShell komentari u markdown code blokovima (npr. `# Komentar` u code block sa PS primerom) mogu biti pogresno detektovani kao H1 heading-i, TODO markeri, i drugi line patterns. To dovodi do **false positive-a** koji vlasnika dezinformisu o kvalitetu / dugu monorepa.

  Trenutno **4 markdown skenera u monorepu su Lekcija #17 - compliant** (validirano u Talas 84 retroaktivnim auditom):

    1. `check-doc-links.ps1` - **preventivno od Talas 65** (linije 88-93: triple/tilde fence + inline backtick skip)
    2. `check-readme-presence.ps1` - Talas 81 post-hoc fix (code-block skip pre H1 regex-a)
    3. `check-markdown-code-blocks.ps1` - Talas 82 proaktivna detekcija (sam je validacioni alat)
    4. `scan-todo-markers.ps1` - Talas 83 post-hoc fix sa `-IncludeMdCodeBlocks` opt-out

  Ovaj skener proverava 2 nivoa:

    1. **MD-PARSING detekcija:** da li skripta cita / parsira `*.md` fajlove (heuristike: `Filter '*.md'`, `'\\.md'`, `Get-ChildItem.+md`, `'\.md$'`, ili eksplicitan spomen `*.md` u parametrima ili komandama)
    2. **SKIP-LOGIC detekcija:** ako parsira md, da li ima code-block skip logiku (heuristike: `\^[`]{3}` regex za fence, `inCodeBlock` toggle, `^```` u Where-Object filter, ili `Strip fenced code blocks` komentar)

  Statusi:

    - `OK` - cita md i ima skip logiku (ili je sam validacioni alat za md code blokove)
    - `MISSING-SKIP` - cita md ali nema detektovanu skip logiku (WARN: rizik false positive-a)
    - `N/A` - ne cita md (irelevantno za Lekciju #17)

  Read-only audit: ne menja fajlove. Default je informativan - prijavljuje sve nalaze, exit 0. Sa `-FailOnMissing` exit 1 ako bilo koji `MISSING-SKIP` postoji.

  Heuristicki pristup: regex-bazirana detekcija nije 100% precizna (false positive-i moguci ako skripta sadrzi `*.md` u komentaru ili literalu bez stvarnog parsiranja; false negativi moguci ako skripta koristi neobicnu sintaksu za skip). Vlasnik moze pregledati MISSING-SKIP nalaze rucno i potvrditi ili dodati explicit allow-list u parametar `-IgnoreScripts`.

.PARAMETER FailOnMissing
  Vraca exit 1 ako bilo koja skripta ima `MISSING-SKIP` status. Default off (informativan).

.PARAMETER MaxOutput
  Maksimalan broj redova u Detalji sekciji. Default 50.

.PARAMETER ScriptsDir
  Putanja do direktorijuma sa PS skriptama za skeniranje. Default `scripts` (relativno na koren repoa).

.PARAMETER IgnoreScripts
  Niz basename-ova skripti koje treba preskociti (case-insensitive). Spaja se sa default-om ako je `-IgnoreDefaults` off. Korisno za skripte koje su poznata false positive (spominju `*.md` ali ne parsiraju liniju-po-liniju, npr. generator help snapshota koji koristi Get-Help, ne Get-Content).

.PARAMETER IgnoreDefaults
  Switch - ako je on (default), skripta automatski ignorise listu poznatih skripti koje listiraju `*.md` ali ne parsiraju sadrzaj liniju-po-liniju (npr. `check-dev-docs-coverage.ps1` koristi `Get-ChildItem -Filter '*.md'` samo za file existence comparison, ne za content parsing). Ovaj allow-list mozes prepisati slanjem `-IgnoreDefaults:$false`.

.EXAMPLE
  .\scripts\check-codeblock-skip-consistency.ps1
  # Default: skenira `scripts/*.ps1`, prijavljuje sve statuse, exit 0.

.EXAMPLE
  .\scripts\check-codeblock-skip-consistency.ps1 -FailOnMissing
  # Strogi rezim: exit 1 ako bilo koja skripta ima MISSING-SKIP status.

.EXAMPLE
  .\scripts\check-codeblock-skip-consistency.ps1 -IgnoreScripts @('regenerate-help-snapshot.ps1')
  # Preskace listu skripti (npr. ako vlasnik zna da to nije pravi parser).

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 85 = ovaj skript; ukupno 39 koraka Talas 65-192).
  Regression sentinel za Lekciju #17 (markdown code-block fence skip) preko PS skenera koji parsiraju `*.md`.
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
[CmdletBinding()]
param(
  [switch]$FailOnMissing,
  [int]$MaxOutput = 50,
  [string]$ScriptsDir = 'scripts',
  [string[]]$IgnoreScripts = @(),
  [bool]$IgnoreDefaults = $true
)

# Default ignore list: skripte koje rade SUBSTRING ili WHOLE-FILE matching umesto line-anchored regex.
# Lekcija #17 (code-block fence skip) je aplicabilna SAMO za skenere koji rade line-anchored regex
# tipa `^# heading`, `^TODO`, `^[`]{3}` (H1, TODO marker, fence). Substring matching tipa
# .Contains('verify-monorepo') je legitimno bez code-block skip-a jer mention unutar code bloka
# treba da se broji kao validan signal (npr. doc-gate par-rule signal).
$defaultIgnoreList = @(
  'check-dev-docs-coverage.ps1',          # samo Get-ChildItem -Filter '*.md', Get-Content je samo na page.tsx
  'audit-doc-gate-references.ps1',        # Get-Content -Raw + substring matching (verify-monorepo, EVIDENCE-INDEX par-rules)
  'check-script-readme-coverage.ps1',     # Get-Content -Raw na scripts/README.md + counts mention-e (substring)
  'check-help-blocks-position.ps1',       # skenira *.ps1 (ne *.md); spomen README.md u help bloku je false positive
  'regenerate-help-snapshot.ps1'          # GENERISE *.md (ne parsira); spomen .md u opisu je false positive
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Get-Location).Path
$scriptsRoot = Join-Path $repoRoot $ScriptsDir

if (-not (Test-Path -LiteralPath $scriptsRoot)) {
  Write-Error "ScriptsDir ne postoji: $scriptsRoot"
  exit 2
}

Write-Host '== check-codeblock-skip-consistency: skener Lekcije #17 (Talas 85) ==' -ForegroundColor Cyan
Write-Host ''
Write-Host ("   skenira: {0}" -f $scriptsRoot) -ForegroundColor DarkGray

$psFiles = @(Get-ChildItem -Path $scriptsRoot -File -Filter '*.ps1' -ErrorAction SilentlyContinue | Sort-Object Name)

Write-Host ("   PS skripti: {0}" -f $psFiles.Count) -ForegroundColor DarkGray
Write-Host ''

# Heuristicke za detekciju da skripta parsira `*.md` SADRZAJ (ne samo file listing)
# Kljuc: trazimo Get-Content / Select-String / [regex] na md sadrzaj, NE Get-ChildItem -Filter '*.md' (samo listing)
$mdParsingPatterns = @(
  "Get-Content[^\n]*\.md",                      # Get-Content na .md fajl putanji
  "Get-Content[^\n]*\$\w+\.FullName",           # Get-Content $f.FullName posle md filter (multi-line; ne lovi savrseno)
  "Select-String[^\n]*\.md",                    # Select-String na .md
  "Select-String.+(README|md)",                 # Select-String sa md sadrzajem
  "['""]README\.md['""]",                       # eksplicitan README.md literal kao putanja
  "['""]\\\.md['""]",                           # '\.md' regex koji se primenjuje na content
  "['""]\.md\$['""]"                            # '.md$' regex
)

# Heuristicke za detekciju code-block skip logike
$skipPatterns = @(
  "\^[``]{3}",                    # ^``` regex za fence (line-start triple backtick)
  '\$inCodeBlock',                # PowerShell variable $inCodeBlock
  '\$inBlock',                    # PowerShell variable $inBlock
  '\$applyCodeBlockSkip',         # specijalan name iz scan-todo-markers
  'Strip fenced code blocks',     # eksplicitan komentar (check-doc-links.ps1)
  'fenced code block',            # opsti komentar
  'code-block fence skip',        # spomen Lekcije #17 u komentaru
  'code-block skip',              # spomen Lekcije #17 u komentaru
  'Lekcij[ae] #17',               # eksplicitan spomen lekcije
  '\(\?ms\).*\^```',              # multiline regex sa fence-om
  'NO-LANG-TAG',                  # check-markdown-code-blocks specifican (sam je validator)
  'H1-IN-BLOCK',                  # check-markdown-code-blocks specifican
  '\$fenceCount'                  # check-markdown-code-blocks specifican
)

$results = New-Object System.Collections.Generic.List[pscustomobject]
$ignoreUnion = @()
$ignoreUnion += $IgnoreScripts
if ($IgnoreDefaults) { $ignoreUnion += $defaultIgnoreList }
$ignoreLower = @($ignoreUnion | ForEach-Object { $_.ToLowerInvariant() } | Sort-Object -Unique)

foreach ($f in $psFiles) {
  $name = $f.Name
  $nameLower = $name.ToLowerInvariant()
  if ($ignoreLower -contains $nameLower) {
    $userIgnoreLower = @($IgnoreScripts | ForEach-Object { $_.ToLowerInvariant() })
    $reason = if ($userIgnoreLower -contains $nameLower) {
      'preskoceno preko -IgnoreScripts'
    } else {
      'default ignore (substring/whole-file matching, ne line-anchored regex)'
    }
    [void]$results.Add([pscustomobject]@{ Name = $name; Status = 'IGNORED'; Note = $reason })
    continue
  }
  $content = Get-Content -LiteralPath $f.FullName -Raw -ErrorAction SilentlyContinue
  if ([string]::IsNullOrEmpty($content)) {
    [void]$results.Add([pscustomobject]@{ Name = $name; Status = 'N/A'; Note = '0-byte ili nemoguce procitati' })
    continue
  }

  # PRVO: detekcija skip logike (primarni signal - ako ima skip, sigurno je MD parser)
  $hasSkipLogic = $false
  $matchedPattern = ''
  foreach ($p in $skipPatterns) {
    if ($content -match $p) {
      $hasSkipLogic = $true
      $matchedPattern = $p
      break
    }
  }

  if ($hasSkipLogic) {
    [void]$results.Add([pscustomobject]@{ Name = $name; Status = 'OK'; Note = "Lekcija #17 OK (match: $matchedPattern)" })
    continue
  }

  # DRUGO: ako nema skip logike, proveri da li uopste parsira md sadrzaj
  $hasMdParsing = $false
  foreach ($p in $mdParsingPatterns) {
    if ($content -match $p) { $hasMdParsing = $true; break }
  }

  if (-not $hasMdParsing) {
    [void]$results.Add([pscustomobject]@{ Name = $name; Status = 'N/A'; Note = 'ne parsira *.md sadrzaj (irelevantno)' })
    continue
  }

  # Parsira md ali nema skip logike -> MISSING-SKIP
  [void]$results.Add([pscustomobject]@{ Name = $name; Status = 'MISSING-SKIP'; Note = 'parsira *.md sadrzaj ali nema detektovanu code-block skip logiku' })
}

# Output
Write-Host '== Pregled po skripti ==' -ForegroundColor Cyan
Write-Host ''
$shown = 0
foreach ($r in $results) {
  if ($shown -ge $MaxOutput) {
    Write-Host ("   ... (+{0} jos redova; podigni -MaxOutput za pun pregled)" -f ($results.Count - $shown)) -ForegroundColor DarkGray
    break
  }
  $color = switch ($r.Status) {
    'OK'           { 'Green' }
    'N/A'          { 'DarkGray' }
    'IGNORED'      { 'DarkYellow' }
    'MISSING-SKIP' { 'Red' }
    default        { 'Gray' }
  }
  Write-Host ("   {0,-12} {1,-45} {2}" -f $r.Status, $r.Name, $r.Note) -ForegroundColor $color
  $shown++
}

# Rezime
$okCount = @($results | Where-Object { $_.Status -eq 'OK' }).Count
$naCount = @($results | Where-Object { $_.Status -eq 'N/A' }).Count
$ignoredCount = @($results | Where-Object { $_.Status -eq 'IGNORED' }).Count
$missingCount = @($results | Where-Object { $_.Status -eq 'MISSING-SKIP' }).Count

Write-Host ''
Write-Host '== Rezime ==' -ForegroundColor Cyan
Write-Host ("   PS skripti skenirano:  {0,3}" -f $psFiles.Count)
Write-Host ("   OK (Lekcija #17 implementirana):  {0,3}" -f $okCount) -ForegroundColor Green
Write-Host ("   N/A (ne parsira *.md):            {0,3}" -f $naCount) -ForegroundColor DarkGray
if ($ignoredCount -gt 0) {
  Write-Host ("   IGNORED (preko -IgnoreScripts):   {0,3}" -f $ignoredCount) -ForegroundColor DarkYellow
}
$missingColor = if ($missingCount -gt 0) { 'Red' } else { 'Green' }
Write-Host ("   MISSING-SKIP (rizik false pozitiva): {0,3}" -f $missingCount) -ForegroundColor $missingColor

Write-Host ''
$exitCode = 0
if ($FailOnMissing -and $missingCount -gt 0) {
  Write-Host ("FAIL: {0} skripti sa MISSING-SKIP statusom (FailOnMissing=ON)" -f $missingCount) -ForegroundColor Red
  $exitCode = 1
} elseif ($missingCount -gt 0) {
  Write-Host ("WARN: {0} skripti sa MISSING-SKIP statusom (default informativan, exit 0)" -f $missingCount) -ForegroundColor Yellow
} else {
  Write-Host 'OK: sve PS skripte koje parsiraju *.md imaju Lekciju #17 implementiranu (regression sentinel zelen).' -ForegroundColor Green
}

exit $exitCode
