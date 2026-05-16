<#
.SYNOPSIS
  `.github/` direktorijum metadata fajlovi presence + zdravlje (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 97: nastavak Talas 95 (root-level OSS / GitHub meta fajlovi: `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `.editorconfig`) u **novi sloj — `.github/` direktorijum metadata** koje GitHub renderuje u repo UI-u i koristi za automation: `dependabot.yml`, `workflows/`, `PULL_REQUEST_TEMPLATE.md`, `ISSUE_TEMPLATE/`, `CODEOWNERS`, `FUNDING.yml`. Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa proverava prisustvo i zdravlje **6 strukturalnih meta entita** u `.github/` direktorijumu:

  1. **`.github/dependabot.yml`** (WARN ako nedostaje) — automatski security update PR-ovi za npm dependencies + GitHub Actions; bez fajla, repo nema automatske dependency updates i ostavlja security ranjivosti otvorene; **trenutno postoji u repu** ✓.
  2. **`.github/workflows/`** direktorijum sa bar 1 `.yml` ili `.yaml` fajlom (WARN ako nema workflow-a) — CI/CD pipeline; **trenutno ima `ci-monorepo.yml`** ✓; **dopuna Talas 80** (Talas 80 audituje workflow YAML doslednost, Talas 97 audituje samo presence).
  3. **`.github/PULL_REQUEST_TEMPLATE.md`** (WARN ako nedostaje) — GitHub renderuje sadržaj kao default body novog PR-a; bez šablona, PR-ovi mogu imati nedosledan format (review checklist, testing instructions, related issues); standardno za production-ready repoe.
  4. **`.github/ISSUE_TEMPLATE/`** direktorijum sa bar 1 template (INFO; opciono) — GitHub renderuje template-e kao opcije pri otvaranju novog issue-a (bug report, feature request, question); INFO jer je opciono za internal repo-e.
  5. **`.github/CODEOWNERS`** (WARN ako nedostaje) — automatski PR reviewer routing po path-u; bez fajla, vlasnik mora ručno tagovati reviewere; ozbiljno za multi-team repo-e; sintaksa kao `.gitignore` sa GitHub username-ima.
  6. **`.github/FUNDING.yml`** (INFO; opciono) — GitHub Sponsors; renderuje "Sponsor" dugme u repo header-u; samo za public OSS repo-e koji prihvataju sponzorstvo.

  **Per-fajl health check** (samo za fajlove koji postoje):

  - **Postojanje** — `Test-Path` na korenu `.github/` direktorijuma.
  - **Non-empty** — `Get-Item.Length -gt 0`; **0-byte** se klasifikuje kao `EMPTY` WARN jer GitHub renderuje prazan dokument bez korisnog sadržaja.
  - **Bar 1 H1** (samo za `*.md` fajlove poput PULL_REQUEST_TEMPLATE.md, sa code-block fence skip preko Lekcije #17) — bez H1, GitHub render nema naslov; **NO-H1** WARN.
  - **YAML osnovna validnost** (samo za `*.yml` fajlove poput dependabot.yml — light check: prvi non-comment linija nije prazna, fajl ima bar 5 linija) — **EMPTY-YAML** WARN ako prazan YAML.

  **`.github/workflows/` direktorijum check** — Test-Path + count `.yml` / `.yaml` fajlova; **dopuna Talas 80** koji audituje YAML doslednost preko 3 wf fajla (`actions/checkout@v4`, `actions/setup-node@v4`, `.nvmrc=20`); Talas 97 fokusiran je samo na presence (postoji li workflow direktorijum).

  **`.github/ISSUE_TEMPLATE/` direktorijum check** — Test-Path + count `.md` / `.yml` template-a; ako direktorijum postoji ali nema template-a, ne brija `MISSING` već `EMPTY-DIR` INFO.

  Read-only audit: ne menja fajlove. **Nije** deo CI mirror-a (`verify-monorepo.ps1` job **`python`** / required check **`Python (Doslednost dok + pytest)`** — `docs/GIT-BRANCH-PROTECTION.md`). Dopuna pre-PR pregleda; smoke (HTTP) i bundled `npm run smoke:all`: `scripts/smoke-stack.ps1` + `atina-platform/atina/docs/operations/release-gate-checklist.md` (*Local notes — Smoke tests*).

.PARAMETER FailOnWarn
  Vraća exit 1 ako bilo koji od 4 obaveznih meta entita (`dependabot.yml`, `workflows/`, `PULL_REQUEST_TEMPLATE.md`, `CODEOWNERS`) nedostaje ili je `EMPTY` / `NO-H1`. `ISSUE_TEMPLATE/` i `FUNDING.yml` su INFO-only i ne podižu exit. Bez ove opcije, uvek vraća 0 (skripta je informativna).

.PARAMETER MaxOutput
  Maksimalan broj redova u Detalji sekciji. Default 200.

.PARAMETER RepoRoot
  Putanja do korena repoa. Default je 1 nivo iznad `scripts/` direktorijuma. Parametrizovan radi testiranja.

.EXAMPLE
  .\scripts\check-github-meta-files-presence.ps1
  # Default: skenira 6 .github/ meta entita, prijavljuje WARN/INFO nalaze, exit 0 uvek.

.EXAMPLE
  .\scripts\check-github-meta-files-presence.ps1 -FailOnWarn
  # Strogi rezim: exit 1 ako bilo koji od 4 obaveznih (dependabot/workflows/PR_TEMPLATE/CODEOWNERS) nedostaje ili nije zdrav.

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 97 = ovaj skript; ukupno 39 koraka Talas 65-192).
  Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md; pun mirror uključuje apps/omnigroup-web build osim sa -SkipOmnigroupWeb).
  Smoke (HTTP) + Atina bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (*Local notes — Smoke tests*).
  LATEST verify: docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md (Val 355); smoke: docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md (Val 351).
  Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md.
  Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md + docs/NIVO-1-DRYRUN-LOG.md.
  Help snapshot za sve scripts/*.ps1: docs/SCRIPTS-HELP-SNAPSHOT.md (regen: scripts/regenerate-help-snapshot.ps1).
  PowerShell 5.1+.
#>
#Requires -Version 5.1
param(
  [switch]$FailOnWarn,
  [int]$MaxOutput = 200,
  [string]$RepoRoot
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $RepoRoot) {
  $RepoRoot = Split-Path -Parent $scriptsDir
}
Set-Location $RepoRoot

Write-Host '== check-github-meta-files-presence.ps1 - .github/ direktorijum metadata fajlovi presence + zdravlje (informativan) ==' -ForegroundColor Cyan
Write-Host ("   FailOnWarn: {0}" -f $FailOnWarn) -ForegroundColor DarkGray
Write-Host ("   RepoRoot: {0}" -f $RepoRoot) -ForegroundColor DarkGray

$githubDir = Join-Path $RepoRoot '.github'
if (-not (Test-Path $githubDir)) {
  Write-Host ''
  Write-Host '== ZAUSTAVLJENO: .github/ direktorijum ne postoji u korenu ==' -ForegroundColor Yellow
  Write-Host '   Bez .github/ direktorijuma, repo nema GitHub Actions / Dependabot / template-e.' -ForegroundColor DarkGray
  if ($FailOnWarn) { exit 1 } else { exit 0 }
}

# --- Helper: skipuj markdown code blokove pre H1 detekcije (Lekcija #17) ---
function Test-HasH1 {
  param([string]$AbsPath)
  $lines = Get-Content -LiteralPath $AbsPath -Encoding UTF8
  $inCodeBlock = $false
  foreach ($line in $lines) {
    $trim = $line.TrimStart()
    if ($trim -match '^```' -or $trim -match '^~~~') {
      $inCodeBlock = -not $inCodeBlock
      continue
    }
    if ($inCodeBlock) { continue }
    if ($line -match '^# ') {
      return $true
    }
  }
  return $false
}

# --- Helper: light YAML validnost (prvi non-comment linija nije prazna, fajl ima bar 5 linija) ---
function Test-YamlBasicValid {
  param([string]$AbsPath)
  $lines = @(Get-Content -LiteralPath $AbsPath -Encoding UTF8)
  if ($lines.Count -lt 3) { return $false }
  $hasNonComment = $false
  foreach ($line in $lines) {
    $trim = $line.TrimStart()
    if ($trim -eq '' -or $trim.StartsWith('#')) { continue }
    $hasNonComment = $true
    break
  }
  return $hasNonComment
}

# --- Definicija meta entita ---
# Type:
#   File-Required   — file fali => WARN
#   File-Optional   — file fali => INFO
#   Dir-Required    — direktorijum + bar 1 child file fali => WARN
#   Dir-Optional    — direktorijum + bar 1 child file fali => INFO
$metaEntities = @(
  @{ Name = '.github/dependabot.yml'; Type = 'File-Required'; CheckH1 = $false; CheckYaml = $true; Description = 'Automatski security update PR-ovi za npm + GitHub Actions' }
  @{ Name = '.github/workflows/'; Type = 'Dir-Required'; ChildPattern = '*.yml','*.yaml'; Description = 'GitHub Actions CI/CD pipeline (dopuna Talas 80 koji audituje YAML doslednost)' }
  @{ Name = '.github/PULL_REQUEST_TEMPLATE.md'; Type = 'File-Required'; CheckH1 = $true; CheckYaml = $false; Description = 'Default PR body template (review checklist, testing, related issues)' }
  @{ Name = '.github/ISSUE_TEMPLATE/'; Type = 'Dir-Optional'; ChildPattern = '*.md','*.yml','*.yaml'; Description = 'Issue template-e (bug report, feature request) - GitHub renderuje pri otvaranju novog issue-a' }
  @{ Name = '.github/CODEOWNERS'; Type = 'File-Required'; CheckH1 = $false; CheckYaml = $false; Description = 'Automatski PR reviewer routing po path-u (sintaksa kao .gitignore sa GitHub username-ima)' }
  @{ Name = '.github/FUNDING.yml'; Type = 'File-Optional'; CheckH1 = $false; CheckYaml = $true; Description = 'GitHub Sponsors - renderuje "Sponsor" dugme u repo header-u (opciono za public OSS)' }
)

# --- Skeniraj .github/ entitete ---
$results = New-Object 'System.Collections.Generic.List[object]'
$findings = New-Object 'System.Collections.Generic.List[object]'

foreach ($meta in $metaEntities) {
  $absPath = Join-Path $RepoRoot $meta.Name
  $absPath = $absPath.TrimEnd('\','/')

  $entry = [pscustomobject]@{
    Name = $meta.Name
    Type = $meta.Type
    Found = (Test-Path $absPath)
    Size = 0
    HasH1 = $null
    YamlValid = $null
    ChildCount = $null
    Description = $meta.Description
  }

  if ($entry.Found) {
    $isDir = $meta.Type -like 'Dir-*'
    if ($isDir) {
      $children = @()
      foreach ($pat in $meta.ChildPattern) {
        $children += Get-ChildItem -LiteralPath $absPath -Filter $pat -ErrorAction SilentlyContinue
      }
      $entry.ChildCount = $children.Count
    } else {
      $entry.Size = (Get-Item -LiteralPath $absPath).Length
      if ($meta.CheckH1) {
        $entry.HasH1 = Test-HasH1 -AbsPath $absPath
      }
      if ($meta.CheckYaml) {
        $entry.YamlValid = Test-YamlBasicValid -AbsPath $absPath
      }
    }
  }

  $results.Add($entry) | Out-Null

  # --- Validacija ---
  $isRequired = ($meta.Type -like '*-Required')
  $sevForMissing = if ($isRequired) { 'WARN' } else { 'INFO' }

  if (-not $entry.Found) {
    $findings.Add([pscustomobject]@{
      Meta = $meta.Name
      Severity = $sevForMissing
      Code = 'MISSING'
      Detail = ("{0} - {1}" -f $meta.Name, $meta.Description)
    }) | Out-Null
    continue
  }

  if ($meta.Type -like 'Dir-*') {
    if ($entry.ChildCount -eq 0) {
      $findings.Add([pscustomobject]@{
        Meta = $meta.Name
        Severity = $sevForMissing
        Code = 'EMPTY-DIR'
        Detail = ("{0} postoji ali nema fajlova ({1}) - direktorijum prazan" -f $meta.Name, ($meta.ChildPattern -join '/'))
      }) | Out-Null
    }
    continue
  }

  # File entity validacija
  if ($entry.Size -eq 0) {
    $findings.Add([pscustomobject]@{
      Meta = $meta.Name
      Severity = $sevForMissing
      Code = 'EMPTY'
      Detail = ("{0} postoji ali je 0-byte - GitHub render nema sadrzaja" -f $meta.Name)
    }) | Out-Null
    continue
  }

  if ($meta.CheckH1 -and $entry.HasH1 -eq $false) {
    $findings.Add([pscustomobject]@{
      Meta = $meta.Name
      Severity = $sevForMissing
      Code = 'NO-H1'
      Detail = ("{0} nema H1 heading (# Naslov) - GitHub render nema naslov; code blokovi preskoceni per Lekciji #17" -f $meta.Name)
    }) | Out-Null
  }

  if ($meta.CheckYaml -and $entry.YamlValid -eq $false) {
    $findings.Add([pscustomobject]@{
      Meta = $meta.Name
      Severity = $sevForMissing
      Code = 'EMPTY-YAML'
      Detail = ("{0} izgleda kao prazan YAML (samo komentari ili manje od 3 linije)" -f $meta.Name)
    }) | Out-Null
  }
}

# --- Sumarni izveštaj ---
$warns = @($findings | Where-Object { $_.Severity -eq 'WARN' })
$infos = @($findings | Where-Object { $_.Severity -eq 'INFO' })

Write-Host ''
Write-Host '== .github/ meta entiteti presence rezime ==' -ForegroundColor Cyan
Write-Host ("  Meta entiteta proverljivo:    {0}" -f $results.Count)
Write-Host ("  WARN (obavezni nedostaju):    {0}" -f $warns.Count)
Write-Host ("  INFO (opcioni nedostaju):     {0}" -f $infos.Count)

# --- Tabela ---
Write-Host ''
Write-Host '== Tabela .github/ entiteta ==' -ForegroundColor Cyan
$results |
  Select-Object @{N='Meta';E={$_.Name}}, @{N='Tip';E={if ($_.Type -like '*-Required') { 'Required' } else { 'Optional' }}}, @{N='Kind';E={if ($_.Type -like 'Dir-*') { 'Dir' } else { 'File' }}}, @{N='Found';E={$_.Found}}, @{N='Size/Children';E={
    if ($_.Type -like 'Dir-*') {
      if ($null -eq $_.ChildCount) { '-' } else { ("{0} child" -f $_.ChildCount) }
    } else {
      ("{0} bytes" -f $_.Size)
    }
  }}, @{N='Health';E={
    $tags = @()
    if ($_.HasH1 -eq $true) { $tags += 'H1' }
    elseif ($_.HasH1 -eq $false) { $tags += 'NO-H1' }
    if ($_.YamlValid -eq $true) { $tags += 'YAML-OK' }
    elseif ($_.YamlValid -eq $false) { $tags += 'YAML-EMPTY' }
    if ($tags.Count -eq 0) { '-' } else { $tags -join ',' }
  }} |
  Format-Table -AutoSize | Out-String | Write-Host

# --- Detalji WARN + INFO ---
if ($findings.Count -gt 0) {
  Write-Host '== Detalji nalaza (WARN prvo, INFO posle) ==' -ForegroundColor Cyan
  $sorted = $findings | Sort-Object @{Expression='Severity'; Descending=$false}, Meta, Code
  $sorted | Select-Object -First $MaxOutput | ForEach-Object {
    $color = if ($_.Severity -eq 'WARN') { 'Yellow' } else { 'DarkGray' }
    Write-Host ("  [{0}] {1} :: {2}" -f $_.Severity, $_.Meta, $_.Code) -ForegroundColor $color
    Write-Host ("    {0}" -f $_.Detail) -ForegroundColor DarkGray
  }
}

Write-Host ''
Write-Host 'Napomene:' -ForegroundColor DarkGray
Write-Host '  - Komplementarni audit: Talas 95 (`check-repo-meta-files-presence.ps1`) skenira root-level meta fajlove (LICENSE, SECURITY.md, .editorconfig); Talas 97 fokusiran na .github/ direktorijum koji GitHub koristi za automation + UI.'
Write-Host '  - Talas 80 (`check-workflow-consistency.ps1`) audituje YAML doslednost preko 3 wf fajla; Talas 97 audituje samo presence .github/workflows/ direktorijuma - dva komplementarna signala.'
Write-Host '  - Vlasnik akcija opciono: dodavanje PULL_REQUEST_TEMPLATE.md / CODEOWNERS / ISSUE_TEMPLATE/ ako audit prijavi WARN.'
Write-Host '  - Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md).'
Write-Host '  - Smoke (HTTP) i bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).'
Write-Host '  - Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md (LATEST verify Val 355; smoke Val 351).'
Write-Host '  - Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md i docs/NIVO-1-DRYRUN-LOG.md.'

if ($FailOnWarn -and $warns.Count -gt 0) {
  exit 1
}
exit 0
