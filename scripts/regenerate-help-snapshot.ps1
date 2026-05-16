<#
.SYNOPSIS
  Generiše `docs/SCRIPTS-HELP-SNAPSHOT.md` — statičnu stranicu sa `Get-Help` izveštajem za sve `*.ps1` skripte u izabranom direktorijumu (podrazumevano **43** PowerShell skripte u `scripts/`). Vlasnik može pregledati synopsis, sintaksu, parametre i primere bez pokretanja terminala.

.DESCRIPTION
  Iz korena repoa skenira `scripts/*.ps1` (root, ne rekurzivno — Atina podpaket ima svoje smoke skripte u `atina-platform/atina/scripts/`), za svaku pokreće `Get-Help -Full` i generiše konsolidovan markdown sa H2 sekcijom po skripti:

  - `## <Ime skripte>` (linkovan na fajl)
  - **Synopsis:** prvi `.SYNOPSIS` red
  - **Sintaksa:** kompletan `SYNTAX` blok
  - **Parametri:** lista parametara sa kratkim opisom
  - **Primeri:** prvi `.EXAMPLE` blok (ako postoji)
  - Link ka punom `Get-Help -Full` izlazu (komanda za vlasnika)

  Na kraju ispisuje **smoke test rezultat** — broj skripti, koliko ima `.SYNOPSIS`, koliko ima `.DESCRIPTION`, koliko ima bar 1 `.EXAMPLE`, i da li je bilo parsing greške u comment-based help-u za bilo koju.

  **Nije** deo CI mirror-a (`verify-monorepo.ps1` job **`python`** / required check **`Python (Doslednost dok + pytest)`** — [`docs/GIT-BRANCH-PROTECTION.md`](../docs/GIT-BRANCH-PROTECTION.md); pun mirror uključuje `apps/omnigroup-web` build osim sa `-SkipOmnigroupWeb`) i ne menja njegov scope. Po konvenciji se pokreće povremeno (kad se doda nova skripta ili izmeni comment-based help). Output dokument ide u `docs/` (commit-able).

.PARAMETER OutputPath
  Putanja gde se snima generisan markdown. Default: `docs/SCRIPTS-HELP-SNAPSHOT.md` (relativno na koren repoa).

.PARAMETER FailOnError
  Vraća exit 1 ako bilo koja skripta nema `.SYNOPSIS` ili `Get-Help` baci grešku. Po defaultu **uvek exit 0**.

.PARAMETER ScriptDir
  Direktorijum gde se traže `*.ps1` skripte. Default: `scripts/` (root). Set na drugu putanju za regen drugog snapshot-a (npr. `atina-platform/atina/scripts`).

.EXAMPLE
  .\scripts\regenerate-help-snapshot.ps1
  # Pun pregled — generiše docs/SCRIPTS-HELP-SNAPSHOT.md.

.EXAMPLE
  .\scripts\regenerate-help-snapshot.ps1 -FailOnError
  # CI-friendly — non-zero exit ako bilo koja skripta nema .SYNOPSIS ili Get-Help padne.

.EXAMPLE
  .\scripts\regenerate-help-snapshot.ps1 -OutputPath docs\SCRIPTS-HELP-ATINA.md -ScriptDir atina-platform\atina\scripts
  # Drugi snapshot za Atina podpaket smoke skripte.

.NOTES
  Read-only: ne menja izvorne skripte. Konsolidovani pre-PR ulaz: `scripts/run-all-audits.ps1` — **39** koraka (**37** read-only + TODO skener + npm audit); ovaj generator **nije** jedan od tih koraka, već se ručno ili povremeno pokreće posle izmene help blokova. Pun spisak koraka: `Get-Help .\\scripts\\run-all-audits.ps1 -Full`.
  Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md; pun mirror ukljucuje apps/omnigroup-web osim sa -SkipOmnigroupWeb).
  Smoke (HTTP) + Atina bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes — Smoke tests).
  LATEST verify: docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md (Val 355); smoke: docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md (Val 351).
  Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md.
  Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md · docs/NIVO-1-DRYRUN-LOG.md.
  PowerShell 5.1+.
#>
param(
  [string]$OutputPath = 'docs/SCRIPTS-HELP-SNAPSHOT.md',
  [string]$ScriptDir = 'scripts',
  [switch]$FailOnError
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

$absScriptDir = $ScriptDir
if (-not [System.IO.Path]::IsPathRooted($absScriptDir)) {
  $absScriptDir = Join-Path $repoRoot $absScriptDir
}
$absOutput = $OutputPath
if (-not [System.IO.Path]::IsPathRooted($absOutput)) {
  $absOutput = Join-Path $repoRoot $absOutput
}

if (-not (Test-Path $absScriptDir)) {
  Write-Host "ERROR: ScriptDir ne postoji: $absScriptDir" -ForegroundColor Red
  exit 2
}

Write-Host '== regenerate-help-snapshot.ps1 - Get-Help snapshot generator ==' -ForegroundColor Cyan
Write-Host ("   ScriptDir: {0}" -f $absScriptDir) -ForegroundColor DarkGray
Write-Host ("   OutputPath: {0}" -f $absOutput) -ForegroundColor DarkGray
Write-Host ("   FailOnError: {0}" -f $FailOnError) -ForegroundColor DarkGray

$ps1Files = Get-ChildItem -LiteralPath $absScriptDir -File -Filter '*.ps1' -ErrorAction SilentlyContinue |
            Sort-Object Name
Write-Host ("   Pronadjeno: {0} *.ps1 fajlova" -f $ps1Files.Count) -ForegroundColor DarkGray

if ($ps1Files.Count -eq 0) {
  Write-Host 'ERROR: nijedna *.ps1 skripta u ScriptDir' -ForegroundColor Red
  exit 2
}

# --- Generate markdown ---
$now = Get-Date -Format 'yyyy-MM-dd HH:mm'
$relScriptDir = ($absScriptDir.Substring($repoRoot.Length).TrimStart('\', '/').Replace('\', '/'))
$relOutputDir = (Split-Path $absOutput -Parent).Substring($repoRoot.Length).TrimStart('\', '/').Replace('\', '/')
if (-not $relOutputDir) { $relOutputDir = '.' }

# Number of `..` segments needed to go from output file up to repo root.
$outputDirParts = $relOutputDir.Split('/')
$upPrefix = ('../' * $outputDirParts.Count)

$lines = New-Object System.Collections.Generic.List[string]
# NOTE: backtick in PS double-quoted strings is escape; for markdown code-spans we use single-quoted
# concatenation instead of -f operator (single-quoted = literal, no parser surprises with backticks).
$BT = [char]96  # backtick literal as variable so -f format strings don't have to escape it

# Markdown linkovi unutar Get-Help (Synopsis/Description/Example) su pisani relativno u odnosu na
# direktorijum SKRIPTE (npr. scripts/foo.ps1 koristi ./bar.ps1, ../docs/X.md). Snapshot pak zivi u
# direktorijumu IZLAZA (npr. docs/SCRIPTS-HELP-SNAPSHOT.md), pa iste relativne putanje vise nisu
# validne. Ovaj helper prepisuje svaki relativan markdown link tako da resolvira preko apsolutnog
# fajl-sistema iz scripts/ direktorijuma, a zatim ga izrazava kao relativni iz direktorijuma izlaza.
$scriptDirAbs = (Resolve-Path -LiteralPath $absScriptDir).Path.TrimEnd('\', '/')
$outDirAbs = (Split-Path -Parent $absOutput).TrimEnd('\', '/')

function Convert-RelLinks {
  param([string]$Text)
  if (-not $Text) { return $Text }
  # Captures markdown link target between ]( ... ) where target ne pocinje sa # (anchor),
  # protocol scheme (http://, https://, mailto:, tel:, ftp://) ni '/' (apsolutni URL).
  $pattern = '\]\((?<t>(?!https?://|mailto:|tel:|ftp://|#|/)[^)\s]+)\)'
  return [regex]::Replace($Text, $pattern, {
    param($m)
    $target = $m.Groups['t'].Value
    if (-not ($target.StartsWith('./') -or $target.StartsWith('../'))) { return $m.Value }
    try {
      $abs = [System.IO.Path]::GetFullPath((Join-Path $scriptDirAbs $target))
      $rel = ''
      if ($abs.StartsWith($outDirAbs, [System.StringComparison]::OrdinalIgnoreCase)) {
        $rel = './' + $abs.Substring($outDirAbs.Length).TrimStart('\', '/').Replace('\', '/')
      } else {
        $outUri = New-Object System.Uri(($outDirAbs.TrimEnd('\', '/') + '\'))
        $absUri = New-Object System.Uri($abs)
        $rel = [System.Uri]::UnescapeDataString($outUri.MakeRelativeUri($absUri).ToString())
        if (-not ($rel.StartsWith('./') -or $rel.StartsWith('../'))) { $rel = './' + $rel }
      }
      return '](' + $rel + ')'
    } catch {
      return $m.Value
    }
  })
}
$lines.Add(('# ' + $BT + 'Get-Help' + $BT + ' snapshot - ' + $BT + $relScriptDir + $BT))
$lines.Add('')
$lines.Add('**Generisan:** ' + $now + ' | **Skripta za regen:** ' + $BT + $upPrefix + 'scripts/regenerate-help-snapshot.ps1' + $BT + ' | **Broj skripti:** ' + $ps1Files.Count)
$lines.Add('')
$lines.Add('**Refs:**')
$lines.Add('')
$lines.Add('- **Pun verify (CI mirror):** ' + $BT + $upPrefix + 'scripts/verify-monorepo.ps1' + $BT + ' (job ' + $BT + 'python' + $BT + ' / required check ' + $BT + 'Python (Doslednost dok + pytest)' + $BT + ' - ' + $BT + $upPrefix + 'docs/GIT-BRANCH-PROTECTION.md' + $BT + '; pun mirror ukljucuje apps/omnigroup-web build osim sa -SkipOmnigroupWeb)')
$lines.Add('- **Smoke (HTTP):** ' + $BT + $upPrefix + 'scripts/smoke-stack.ps1' + $BT + ' + bundled Atina ' + $BT + 'npm run smoke:all' + $BT + ' (formalni Atina release gate: ' + $BT + $upPrefix + 'atina-platform/atina/docs/operations/release-gate-checklist.md' + $BT + ' - *Local notes - Smoke tests*)')
$lines.Add('- **Konsolidovani audit suite (single entry point):** ' + $BT + $upPrefix + 'scripts/run-all-audits.ps1' + $BT + ' — **39** koraka (**37** read-only skripte + TODO skener + npm audit); pun spisak koraka u `Get-Help` za taj fajl.')
$lines.Add('- **Vlasnik dashboard:** ' + $BT + $upPrefix + 'docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md' + $BT)
$lines.Add('- **Monorepo evidencija (indeks + dry-run):** ' + $BT + $upPrefix + 'docs/EVIDENCE-INDEX.md' + $BT + ' / ' + $BT + $upPrefix + 'docs/NIVO-1-DRYRUN-LOG.md' + $BT)
$lines.Add('')
$lines.Add('> **Svrha dokumenta:** staticka jednostranicna referenca za sve PowerShell skripte u ' + $BT + $relScriptDir + '/' + $BT + '. Vlasnik moze pregledati synopsis, sintaksu, parametre i primere bez pokretanja terminala. Pun Get-Help izlaz dobija sa komandom uz svaki red ispod (npr. Get-Help .\scripts\verify-monorepo.ps1 -Full). **Regen pri svakoj izmeni comment-based help-a u bilo kojoj skripti** - pokreni ' + $BT + $upPrefix + 'scripts/regenerate-help-snapshot.ps1' + $BT + ' (read-only, smoke test rezultat na kraju).')
$lines.Add('')
$lines.Add('---')
$lines.Add('')

$summaryStats = [pscustomobject]@{
  Total       = $ps1Files.Count
  WithSynopsis = 0
  WithDescription = 0
  WithExample = 0
  WithNotes   = 0
  Errors      = 0
  ErrorList   = New-Object System.Collections.Generic.List[string]
}

foreach ($f in $ps1Files) {
  $name = $f.Name
  $relPath = ($f.FullName.Substring($repoRoot.Length).TrimStart('\', '/').Replace('\', '/'))
  Write-Host ("   ... {0}" -f $name) -ForegroundColor DarkGray

  $help = $null
  $hadError = $false
  try {
    # Get-Help sa punim putanjama koja sadrže razmak (npr. ...\omni group\...) u PS 5.1 često baci
    # "could not find ... in a help file in this session" ili pokvari UTF-8 iz comment-based help-a.
    # Relativni .\ime.ps1 iz samog ScriptDir obilazi oba problema.
    Push-Location -LiteralPath $absScriptDir
    try {
      $help = Get-Help -Name (".\$name") -Full -ErrorAction Stop
    } finally {
      Pop-Location
    }
  } catch {
    $hadError = $true
    $summaryStats.Errors++
    $summaryStats.ErrorList.Add(("{0}: {1}" -f $name, $_.Exception.Message)) | Out-Null
  }

  $synopsis = ''
  $synopsisIsFallback = $false
  $description = ''
  $syntaxBlock = ''
  $parameters = @()
  $firstExample = ''

  if (-not $hadError -and $help) {
    if ($help.Synopsis) { $synopsis = ($help.Synopsis | Out-String).Trim() }
    if ($help.Description) {
      $descText = ($help.Description | Out-String).Trim()
      if ($descText) {
        $firstPara = ($descText -split "`r?`n`r?`n")[0].Trim()
        if ($firstPara) { $description = ($firstPara -split "`r?`n")[0].Trim() }
      }
    }
    if ($help.Syntax) { $syntaxBlock = ($help.Syntax | Out-String).Trim() }
    if ($help.Parameters -and $help.Parameters.Parameter) {
      $parameters = $help.Parameters.Parameter
    }
    if ($help.Examples -and $help.Examples.Example) {
      $firstExample = ($help.Examples.Example[0] | Out-String).Trim()
    }
  }

  # Kad nema strukturisanog `<# .SYNOPSIS ... #>` bloka, Get-Help pravi fallback synopsis iz
  # auto-generisanog Syntax bloka (tipa "free-port.ps1 [[-Port] <int>] [-DryRun]"). Tu nije
  # autorska poruka — to je sintaksa poziva. Heuristika: synopsis je "fallback" ako (a) pocinje
  # imenom skripte praceno [, ili (b) je jednak prvom redu syntax bloka.
  if ($synopsis) {
    $synFirstLine = ($synopsis -split "`r?`n")[0].Trim()
    $syntaxFirstLine = ''
    if ($syntaxBlock) { $syntaxFirstLine = ($syntaxBlock -split "`r?`n")[0].Trim() }
    if ($synFirstLine -match ('^' + [regex]::Escape($name) + '\s*\[')) {
      $synopsisIsFallback = $true
    } elseif ($syntaxFirstLine -and ($synFirstLine -eq $syntaxFirstLine)) {
      $synopsisIsFallback = $true
    }
  }

  if ($synopsis -and -not $synopsisIsFallback) { $summaryStats.WithSynopsis++ }
  if ($description) { $summaryStats.WithDescription++ }
  if ($firstExample) { $summaryStats.WithExample++ }

  # Prepisi relativne markdown linkove iz scripts/ perspective u perspective izlaznog fajla.
  $synopsis = Convert-RelLinks $synopsis
  $description = Convert-RelLinks $description
  $firstExample = Convert-RelLinks $firstExample
  $rawText = Get-Content -LiteralPath $f.FullName -Raw -ErrorAction SilentlyContinue
  if ($rawText -match '\.NOTES') { $summaryStats.WithNotes++ }

  $lines.Add('## ' + $BT + $name + $BT)
  $lines.Add('')
  $lines.Add('**Putanja:** ' + $BT + $upPrefix + $relPath + $BT)
  $lines.Add('')
  if ($hadError) {
    $lines.Add(('**Greška pri `Get-Help`:** ' + $summaryStats.ErrorList[$summaryStats.ErrorList.Count - 1]))
    $lines.Add('')
    $lines.Add('---')
    $lines.Add('')
    continue
  }

  if ($synopsis -and -not $synopsisIsFallback) {
    $lines.Add(('**Synopsis:** ' + $synopsis))
    $lines.Add('')
  } elseif ($synopsis -and $synopsisIsFallback) {
    $lines.Add(('**Synopsis (fallback iz syntax bloka — nema strukturisanog `.SYNOPSIS`):** ' + $BT + $synopsis + $BT))
    $lines.Add('')
  } else {
    $lines.Add('**Synopsis:** _(nema `.SYNOPSIS` bloka)_')
    $lines.Add('')
  }

  if ($description) {
    $lines.Add(('**Opis (prvi paragraf):** ' + $description))
    $lines.Add('')
  }

  if ($syntaxBlock) {
    $lines.Add('**Sintaksa:**')
    $lines.Add('')
    $lines.Add('```powershell')
    $syntaxBlock -split "`n" | ForEach-Object {
      $line = $_.TrimEnd()
      if ($line) { $lines.Add($line) }
    }
    $lines.Add('```')
    $lines.Add('')
  }

  if ($parameters.Count -gt 0) {
    $lines.Add('**Parametri:**')
    $lines.Add('')
    foreach ($p in $parameters) {
      $pName = $p.name
      $pType = ''
      if ($p.type) { $pType = $p.type.name }
      $pDesc = ''
      if ($p.Description) {
        $pDesc = ($p.Description | Out-String).Trim()
        $pDesc = ($pDesc -split "`n")[0].Trim()
      }
      $line = '- ' + $BT + '-' + $pName + $BT
      if ($pType) { $line += ' (' + $BT + $pType + $BT + ')' }
      if ($pDesc) { $line += ' - ' + $pDesc }
      $lines.Add($line)
    }
    $lines.Add('')
  }

  if ($firstExample) {
    $lines.Add('**Primer (prvi):**')
    $lines.Add('')
    $lines.Add('```powershell')
    $firstExample -split "`n" | ForEach-Object {
      $line = $_.TrimEnd()
      if ($line) { $lines.Add($line) }
    }
    $lines.Add('```')
    $lines.Add('')
  }

  $lines.Add('**Pun help za vlasnika:** ' + $BT + 'Get-Help .\' + $relPath.Replace('/', '\') + ' -Full' + $BT)
  $lines.Add('')
  $lines.Add('---')
  $lines.Add('')
}

# --- Smoke test summary at the bottom ---
$lines.Add('## Smoke test rezime')
$lines.Add('')
$lines.Add(('| Provera | Rezultat |'))
$lines.Add(('|---------|----------|'))
$lines.Add('| Skripti ukupno | **' + $summaryStats.Total + '** |')
$lines.Add('| Sa ' + $BT + '.SYNOPSIS' + $BT + ' | **' + $summaryStats.WithSynopsis + '** / ' + $summaryStats.Total + ' |')
$lines.Add('| Sa ' + $BT + '.DESCRIPTION' + $BT + ' | **' + $summaryStats.WithDescription + '** / ' + $summaryStats.Total + ' |')
$lines.Add('| Sa bar 1 ' + $BT + '.EXAMPLE' + $BT + ' | **' + $summaryStats.WithExample + '** / ' + $summaryStats.Total + ' |')
$lines.Add('| Sa ' + $BT + '.NOTES' + $BT + ' | **' + $summaryStats.WithNotes + '** / ' + $summaryStats.Total + ' |')
$lines.Add('| ' + $BT + 'Get-Help' + $BT + ' greske | **' + $summaryStats.Errors + '** / ' + $summaryStats.Total + ' |')
$lines.Add('')

if ($summaryStats.Errors -gt 0) {
  $lines.Add('### Greške')
  $lines.Add('')
  foreach ($e in $summaryStats.ErrorList) {
    $lines.Add(('- ' + $e))
  }
  $lines.Add('')
}

$lines.Add('### Reprodukcija')
$lines.Add('')
$lines.Add('Iz korena repoa: ' + $BT + 'powershell -NoProfile -ExecutionPolicy Bypass -File ' + $upPrefix.Replace('/', '\') + 'scripts\regenerate-help-snapshot.ps1' + $BT)
$lines.Add('')
$lines.Add('Pre-PR gate-flavor (non-zero exit ako bilo koja skripta nema ' + $BT + '.SYNOPSIS' + $BT + ' ili ' + $BT + 'Get-Help' + $BT + ' padne): dodaj ' + $BT + '-FailOnError' + $BT + '.')
$lines.Add('')

# --- Write output ---
$outputDir = Split-Path -Parent $absOutput
if (-not (Test-Path $outputDir)) {
  New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}
$content = $lines -join "`r`n"
# UTF-8 em dash (U+2014) u .ps1 bez BOM-a na Windows-u cesto se procita kao CP1252 i pretvori u
# tri znaka U+00E2 U+20AC U+201D (vizuelno "â€""). Kad se taj pogresan string ponovo snimi kao UTF-8,
# snapshot dobija osmerobajtnu sekvencu umesto pravog em dash-a. Zameni kanonskim em dash-om.
$badEmDash = ([string][char]0x00E2) + ([string][char]0x20AC) + ([string][char]0x201D)
$content = $content.Replace($badEmDash, [string][char]0x2014)
# Isti uzorak sa U+201C (levi navodnik) umesto U+201D — tipicno za UTF-8 en dash (U+2013) E2 80 93.
$badEnDash = ([string][char]0x00E2) + ([string][char]0x20AC) + ([string][char]0x201C)
$content = $content.Replace($badEnDash, [string][char]0x2013)

$utf8Bom = New-Object System.Text.UTF8Encoding $true
[System.IO.File]::WriteAllText($absOutput, $content, $utf8Bom)

# --- Console summary ---
Write-Host ''
Write-Host '== Smoke test rezime ==' -ForegroundColor Cyan
Write-Host ("  Skripti ukupno:        {0}" -f $summaryStats.Total)
$colorSyn = 'Yellow'; if ($summaryStats.WithSynopsis -eq $summaryStats.Total) { $colorSyn = 'Green' }
$colorDesc = 'Yellow'; if ($summaryStats.WithDescription -eq $summaryStats.Total) { $colorDesc = 'Green' }
$colorExm = 'Yellow'; if ($summaryStats.WithExample -eq $summaryStats.Total) { $colorExm = 'Green' }
$colorNot = 'Yellow'; if ($summaryStats.WithNotes -eq $summaryStats.Total) { $colorNot = 'Green' }
$colorErr = 'Green'; if ($summaryStats.Errors -gt 0) { $colorErr = 'Red' }
Write-Host ("  Sa .SYNOPSIS:          {0} / {1}" -f $summaryStats.WithSynopsis, $summaryStats.Total) -ForegroundColor $colorSyn
Write-Host ("  Sa .DESCRIPTION:       {0} / {1}" -f $summaryStats.WithDescription, $summaryStats.Total) -ForegroundColor $colorDesc
Write-Host ("  Sa bar 1 .EXAMPLE:     {0} / {1}" -f $summaryStats.WithExample, $summaryStats.Total) -ForegroundColor $colorExm
Write-Host ("  Sa .NOTES:             {0} / {1}" -f $summaryStats.WithNotes, $summaryStats.Total) -ForegroundColor $colorNot
Write-Host ("  Get-Help greške:       {0} / {1}" -f $summaryStats.Errors, $summaryStats.Total) -ForegroundColor $colorErr
if ($summaryStats.Errors -gt 0) {
  foreach ($e in $summaryStats.ErrorList) {
    Write-Host ("    {0}" -f $e) -ForegroundColor Red
  }
}
Write-Host ''
Write-Host ("Snapshot snimljen: {0}" -f $absOutput) -ForegroundColor Green
Write-Host ''

if ($FailOnError -and ($summaryStats.Errors -gt 0 -or $summaryStats.WithSynopsis -ne $summaryStats.Total)) {
  Write-Host '== EXIT 1: -FailOnError i postoji bar jedna skripta sa greškom ili bez .SYNOPSIS ==' -ForegroundColor Red
  exit 1
}
exit 0
