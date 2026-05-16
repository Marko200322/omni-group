<#
.SYNOPSIS
  Markdown code-block validacija skener (informativan, opciono pre-PR gate sa `-FailOnWarn`). Skenira sve `*.md` fajlove u monorepu (osim `node_modules/`) i validira: (1) **balansirani fence-ovi** - broj otvarajucih i zatvarajucih trojnih backtick fence-ova mora biti paran (`WARN` ako neuravnotezeno - znak nezatvorenog code bloka koji bi zbuni svaki dalji markdown skener); (2) **language tag** - svaki otvarajuci fence treba imati language tag npr. `\`\`\`powershell` ili `\`\`\`bash` (`INFO`); (3) **H1-u-code-block detekcija** - linije koje pocinju sa `# ` UNUTAR code blokova su pravi rizik za skenere koji broje H1 heading-e regex-om `^# [^#]` - ovaj uzorak je naucen u Talas 81 (`check-readme-presence.ps1` initial 4 MULTI-H1 false positives) i sada se proaktivno detektuje (`INFO`); (4) **nested fence detekcija** - dva otvarajuca fence-a u nizu (verovatno markdown anomalija - INFO). Talas 82 nastavak monorepo-wide structural consistency u **markdown content quality sloj** (Talas 79 `package.json`, Talas 80 workflow YAML, Talas 81 paket README.md). Read-only audit. Komplementaran sa `check-readme-presence.ps1` (paket README presence + zdravlje), `check-doc-links.ps1` (broken / empty link reference). Konsolidovani runbook (single entry point): `scripts/run-all-audits.ps1`. Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa skenira `*.md` fajlove u 6 default lokacija (`docs/`, `scripts/`, root level, `apps/omnigroup-web/`, `atina-system/`, `atina-platform/atina/`); preskace `node_modules/` na svakom nivou da izbegne stranje sadrzaj iz npm paketa. Validacije:

    1. **Balansirani fence-ovi (`UNBALANCED`)** - WARN ako broj `^\`\`\`` linija nije paran. Nezatvoren code blok je realan markdown bug koji moze rusiti syntax highlighting i zbuniti sve dalje skenere koji rade pattern matching na sadrzaju. Talas 81 lekcija #17.
    2. **Language tag (`NO-LANG-TAG`)** - INFO ako otvarajuci fence nema language identifier (npr. samo `\`\`\`` umesto `\`\`\`powershell`). Standardna praksa za syntax highlighting (GitHub renderer, dev/docs UI).
    3. **H1-in-code-block (`H1-IN-BLOCK`)** - INFO ako linija unutar code bloka pocinje sa `# ` (single hash + space + tekst). Te linije nisu markdown H1 heading-i, ali markdown skeneri sa naivnim regex-om mogu ih pogresno tretirati kao heading-e. Talas 81 self-fix #2 popravio `check-readme-presence.ps1` da preskace code blokove; ovaj signal pomaze vlasniku da vidi gde je rizik.
    4. **Nested fence (`NESTED-FENCE`)** - INFO ako se sretne dva uzastopna otvarajuca fence-a (vrednost `$inCodeBlock` toggle-uje 2x bez sadrzaja). Cesto markdown rendering bug.

  Read-only audit: ne menja fajlove. Default je informativan - prijavljuje sve nalaze, exit 0. Sa `-FailOnWarn` exit 1 ako bilo koji fajl ima UNBALANCED nalaz (INFO ostaje).

.PARAMETER FailOnWarn
  Vraca exit 1 ako bilo koji `.md` ima `UNBALANCED` status (nezatvoren code blok). INFO statusi (NO-LANG-TAG, H1-IN-BLOCK, NESTED-FENCE) NE podizu exit code.

.PARAMETER MaxOutput
  Maksimalan broj redova u Detalji sekciji. Default 50.

.PARAMETER Roots
  Niz relativnih putanja za skeniranje. Default 6 lokacija: root level (samo prvi nivo, ne rekurzivno - bez node_modules), `docs/`, `scripts/`, `apps/omnigroup-web/`, `atina-system/`, `atina-platform/atina/`. Vlasnik moze prosiriti.

.EXAMPLE
  .\scripts\check-markdown-code-blocks.ps1
  # Default: skenira sve *.md u 6 lokacija, prijavljuje WARN + INFO, exit 0 uvek (informativan).

.EXAMPLE
  .\scripts\check-markdown-code-blocks.ps1 -FailOnWarn
  # Strogi rezim: exit 1 ako bilo koji fajl ima UNBALANCED nalaz (nezatvoren code blok).

.EXAMPLE
  .\scripts\check-markdown-code-blocks.ps1 -Roots @("docs")
  # Samo docs/ direktorijum.

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 82 = ovaj skript; ukupno 39 koraka Talas 65-192).
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
  [string[]]$Roots = @('.', 'docs', 'scripts', 'apps/omnigroup-web', 'atina-system', 'atina-platform/atina')
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

Write-Host '== check-markdown-code-blocks.ps1 - markdown code-block validacija ==' -ForegroundColor Cyan
Write-Host ("   FailOnWarn: {0}" -f $FailOnWarn) -ForegroundColor DarkGray
Write-Host ("   Roots: {0}" -f ($Roots -join ', ')) -ForegroundColor DarkGray

# Sakupi *.md fajlove iz svih root-ova; preskoci node_modules
$mdFiles = New-Object 'System.Collections.Generic.List[object]'
$seen = New-Object 'System.Collections.Generic.HashSet[string]'
foreach ($r in $Roots) {
  $abs = Join-Path $repoRoot $r
  if (-not (Test-Path -LiteralPath $abs)) {
    Write-Host ("   UPOZORENJE: root ne postoji: {0}" -f $r) -ForegroundColor Yellow
    continue
  }
  if ($r -eq '.') {
    # Samo top-level *.md u repo root-u (ne -Recurse jer bi povukao node_modules)
    Get-ChildItem -LiteralPath $abs -Filter '*.md' -File | ForEach-Object {
      if (-not $seen.Contains($_.FullName)) {
        $seen.Add($_.FullName) | Out-Null
        $mdFiles.Add($_) | Out-Null
      }
    }
  } else {
    Get-ChildItem -LiteralPath $abs -Filter '*.md' -File -Recurse |
      Where-Object { $_.FullName -notmatch '\\node_modules\\' -and $_.FullName -notmatch '/node_modules/' } |
      ForEach-Object {
        if (-not $seen.Contains($_.FullName)) {
          $seen.Add($_.FullName) | Out-Null
          $mdFiles.Add($_) | Out-Null
        }
      }
  }
}

Write-Host ("   *.md fajlova ukupno: {0}" -f $mdFiles.Count) -ForegroundColor DarkGray
Write-Host ''

$findings = New-Object 'System.Collections.Generic.List[object]'
$totalBlocks = 0
$totalNoLang = 0
$totalH1InBlock = 0
$totalNested = 0
$totalUnbalanced = 0

foreach ($f in $mdFiles) {
  $rel = $f.FullName.Substring($repoRoot.Length).TrimStart('\','/').Replace('\','/')
  $lines = Get-Content -LiteralPath $f.FullName -Encoding UTF8

  $inBlock = $false
  $blockStartLine = 0
  $fenceCount = 0
  $fileBlocks = 0
  $fileNoLang = 0
  $fileH1InBlock = 0
  $fileNested = 0
  $h1InBlockLines = New-Object 'System.Collections.Generic.List[int]'

  for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    if ($line -match '^```(.*)$') {
      $fenceCount++
      $tag = $matches[1].Trim()
      if (-not $inBlock) {
        # Otvaranje
        $inBlock = $true
        $blockStartLine = $i + 1
        $fileBlocks++
        if (-not $tag) {
          $fileNoLang++
          $findings.Add([pscustomobject]@{
            Severity = 'INFO'
            Status   = 'NO-LANG-TAG'
            File     = $rel
            Line     = $i + 1
            Detail   = '```' + ' (otvarajuci fence bez language tag-a)'
          }) | Out-Null
        }
      } else {
        # Zatvaranje
        $inBlock = $false
        if ($tag) {
          # zatvaranje sa tag-om - markdown rendering bug, blok izgleda kao da je nested
          $fileNested++
          $findings.Add([pscustomobject]@{
            Severity = 'INFO'
            Status   = 'NESTED-FENCE'
            File     = $rel
            Line     = $i + 1
            Detail   = ('zatvarajuci fence sa language tag-om: ```{0}' -f $tag)
          }) | Out-Null
        }
      }
      continue
    }
    if ($inBlock -and ($line -match '^# [^#]')) {
      $fileH1InBlock++
      $h1InBlockLines.Add($i + 1) | Out-Null
    }
  }

  if ($inBlock) {
    # Fajl zavrsava sa otvorenim code blokom
    $fileUnbalanced = 1
    $totalUnbalanced++
    $findings.Add([pscustomobject]@{
      Severity = 'WARN'
      Status   = 'UNBALANCED'
      File     = $rel
      Line     = $blockStartLine
      Detail   = ('code blok otvoren u liniji {0} bez zatvaranja do EOF' -f $blockStartLine)
    }) | Out-Null
  }

  if ($fileH1InBlock -gt 0) {
    $totalH1InBlock += $fileH1InBlock
    $linesStr = ($h1InBlockLines -join ', ')
    $findings.Add([pscustomobject]@{
      Severity = 'INFO'
      Status   = 'H1-IN-BLOCK'
      File     = $rel
      Line     = $h1InBlockLines[0]
      Detail   = ("{0} `# ` linija u code blokovima (linije: {1}); naivni H1 skener bi ih pogresno detektovao - Talas 81 lekcija #17" -f $fileH1InBlock, $linesStr)
    }) | Out-Null
  }

  $totalBlocks += $fileBlocks
  $totalNoLang += $fileNoLang
  $totalNested += $fileNested
}

Write-Host '== Nalazi (non-OK) ==' -ForegroundColor Cyan
if ($findings.Count -eq 0) {
  Write-Host '  (svi *.md fajlovi su validni - balansirani fence-ovi, language tag-ovi, bez H1 u code blokovima)' -ForegroundColor Green
} else {
  $findings | Select-Object -First $MaxOutput | Format-Table Severity, Status, File, Line, Detail -AutoSize -Wrap | Out-String | Write-Host
  if ($findings.Count -gt $MaxOutput) {
    Write-Host ("  ... ({0} nalaza ukupno; -MaxOutput za vise)" -f $findings.Count) -ForegroundColor DarkGray
  }
}

Write-Host '== Sumirano ==' -ForegroundColor Cyan
Write-Host ("  *.md fajlova skenirano:        {0}" -f $mdFiles.Count)
Write-Host ("  Code blokova ukupno:            {0}" -f $totalBlocks)
Write-Host ("  UNBALANCED (nezatvoreni):       {0}" -f $totalUnbalanced)
Write-Host ("  NO-LANG-TAG (INFO):              {0}" -f $totalNoLang)
Write-Host ("  H1-IN-BLOCK (INFO; Talas 81 #17): {0}" -f $totalH1InBlock)
Write-Host ("  NESTED-FENCE (INFO):              {0}" -f $totalNested)

if ($totalUnbalanced -gt 0) {
  Write-Host ''
  Write-Host ("UPOZORENJE: {0} fajl(ova) sa nezatvorenim code blokovima" -f $totalUnbalanced) -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Napomene:' -ForegroundColor DarkGray
Write-Host '  - Komplementaran: check-readme-presence.ps1 (paket README presence + zdravlje sa code-block fence skip-om).'
Write-Host '  - Komplementaran: check-doc-links.ps1 (broken / empty link reference).'
Write-Host '  - run-all-audits.ps1: 39 koraka (37 read-only + TODO + npm); single entry point.'
Write-Host '  - Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md; pun mirror ukljucuje apps/omnigroup-web build osim sa -SkipOmnigroupWeb).'
Write-Host '  - Smoke (HTTP) i bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).'
Write-Host '  - Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md (LATEST verify Val 355; smoke Val 351).'
Write-Host '  - Operativni handbook (Talas 65->192 lessons): scripts/AGENT-AUTOMATION-GUIDE.md.'

if ($FailOnWarn -and $totalUnbalanced -gt 0) {
  exit 1
}
exit 0
