<#
.SYNOPSIS
  GitHub workflow + .nvmrc + package.json engines.node doslednost skener (informativan, opciono pre-PR gate sa `-FailOnWarn`). Validira da `.github/workflows/*.yml` u 3 lokacije monorepa (root, atina-system, atina-platform/atina) koriste konzistentne `actions/checkout@vN` i `actions/setup-node@vN` verzije, da `node-version-file` putanje postoje i da `.nvmrc` sadrzaj svuda kazuje istu Node verziju. Talas 80 nastavak monorepo-wide structural consistency domena (Talas 79). Read-only audit. Komplementaran sa [`scripts/check-package-json-consistency.ps1`](./check-package-json-consistency.ps1) - taj radi `engines.node` doslednost preko paketa, ovaj radi `.nvmrc` doslednost + cross-check sa `engines.node`. Konsolidovani runbook (single entry point): `scripts/run-all-audits.ps1`. Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa cita 3 workflow YAML fajla i prati `node-version-file:` reference do .nvmrc fajlova:

    1. **`uses:` action doslednost** - regex hvata sve `actions/<name>@v<n>` reference i grupise po imenu action-a. `WARN` ako isti action ima razlicite verzije preko workflow-a (npr. `actions/checkout@v4` u 2 i `@v3` u 1).
    2. **`node-version-file:` putanje** - validira da svaka putanja iz workflow yaml-a fizicki postoji (Test-Path). `WARN` ako fali (broken CI reference).
    3. **`.nvmrc` sadrzaj doslednost** - cita sve referencirane `.nvmrc` fajlove i broji jedinstvene Node verzije. `WARN` ako su razlicite (npr. `apps/omnigroup-web/.nvmrc=18` ali `atina-system/.nvmrc=20`).
    4. **Cross-check `.nvmrc` ↔ `engines.node`** (informativan) - za svaki paket sa `.nvmrc`, proverava da li paralelni `package.json` ima `engines.node` polje. `INFO` ako nedostaje (preklapa sa Talas 79 audit-om), `INFO` ako je razlicit (npr. `.nvmrc=20` ali `engines.node=">=18"`).

  Parsuje YAML preko regex-a (PowerShell 5.1 nema native YAML parser; `powershell-yaml` modul nije zavisnost agent-safe alata). Regex-i hvataju 90% slucajeva u tipicnim GitHub Actions yaml fajlovima. Read-only audit: ne menja fajlove. Default je informativan - prijavljuje sve nalaze, exit 0. Sa `-FailOnWarn` exit 1 ako ima WARN-a.

.PARAMETER FailOnWarn
  Vraca exit 1 ako bilo koji workflow / .nvmrc / cross-check ima WARN nalaz. Bez ove opcije, uvek vraca 0 (informativan).

.PARAMETER MaxOutput
  Maksimalan broj redova u Detalji sekciji. Default 50.

.PARAMETER WorkflowPaths
  Niz relativnih putanja do workflow YAML fajlova. Default: 3 trenutna CI pipelines (`.github/workflows/ci-monorepo.yml`, `atina-system/.github/workflows/ci.yml`, `atina-platform/atina/.github/workflows/ci.yml`). Vlasnik moze prosiriti ako se doda novi workflow.

.EXAMPLE
  .\scripts\check-workflow-consistency.ps1
  # Default: validira 3 workflow-a + sve .nvmrc reference, prijavljuje WARN + INFO, exit 0 uvek (informativan).

.EXAMPLE
  .\scripts\check-workflow-consistency.ps1 -FailOnWarn
  # Strogi rezim: exit 1 ako bilo koji workflow ima nedosledne action verzije ili .nvmrc nedoslednost.

.EXAMPLE
  .\scripts\check-workflow-consistency.ps1 -WorkflowPaths @(".github/workflows/ci-monorepo.yml")
  # Eksplicitno suzavanje skupa (npr. samo root workflow).

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 80 = ovaj skript; ukupno 39 koraka Talas 65-192).
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
  [string[]]$WorkflowPaths = @(
    '.github/workflows/ci-monorepo.yml',
    'atina-system/.github/workflows/ci.yml',
    'atina-platform/atina/.github/workflows/ci.yml'
  )
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

Write-Host '== check-workflow-consistency.ps1 - GitHub workflows + .nvmrc + engines.node cross-check ==' -ForegroundColor Cyan
Write-Host ("   FailOnWarn: {0}" -f $FailOnWarn) -ForegroundColor DarkGray
Write-Host ("   WorkflowPaths: {0} fajlova" -f $WorkflowPaths.Count) -ForegroundColor DarkGray

# 1. Citanje workflow-a i ekstrakcija reference-a
$workflows = New-Object 'System.Collections.Generic.List[object]'
foreach ($rel in $WorkflowPaths) {
  $abs = Join-Path $repoRoot $rel
  if (-not (Test-Path -LiteralPath $abs)) {
    Write-Host ("   UPOZORENJE: workflow ne postoji: {0}" -f $rel) -ForegroundColor Yellow
    continue
  }
  $content = Get-Content -LiteralPath $abs -Raw -Encoding UTF8
  $usesMatches = [regex]::Matches($content, '(?m)^\s*-?\s*uses:\s*([^\s#]+)')
  $nvmrcRefs = [regex]::Matches($content, '(?m)node-version-file:\s*[''"]?([^''"\n#]+)[''"]?')
  $nodeVerInline = [regex]::Matches($content, '(?m)node-version:\s*[''"]?([^''"\n#]+)[''"]?')
  $workflows.Add([pscustomobject]@{
    Path = $rel
    UsesRefs = @($usesMatches | ForEach-Object { $_.Groups[1].Value.Trim() })
    NvmrcRefs = @($nvmrcRefs | ForEach-Object { $_.Groups[1].Value.Trim() })
    NodeVerInline = @($nodeVerInline | ForEach-Object { $_.Groups[1].Value.Trim() })
  }) | Out-Null
}

$totalWorkflows = $workflows.Count
Write-Host ''
Write-Host '== Pregled po workflow-u ==' -ForegroundColor Cyan
foreach ($wf in $workflows) {
  $nvmrcStr = if ($wf.NvmrcRefs.Count -gt 0) { $wf.NvmrcRefs -join ', ' } else { '(none)' }
  $inlineStr = if ($wf.NodeVerInline.Count -gt 0) { $wf.NodeVerInline -join ', ' } else { '(none)' }
  Write-Host ("  {0}" -f $wf.Path) -ForegroundColor White
  Write-Host ("    uses ({0}): {1}" -f $wf.UsesRefs.Count, ($wf.UsesRefs -join ', ')) -ForegroundColor DarkGray
  Write-Host ("    node-version-file ({0}): {1}" -f $wf.NvmrcRefs.Count, $nvmrcStr) -ForegroundColor DarkGray
  Write-Host ("    node-version inline ({0}): {1}" -f $wf.NodeVerInline.Count, $inlineStr) -ForegroundColor DarkGray
}

$findings = New-Object 'System.Collections.Generic.List[object]'

# 2. Action doslednost preko workflow-a (grupisi po action-name@version)
$allUses = @()
foreach ($wf in $workflows) {
  foreach ($u in $wf.UsesRefs) {
    if ($u -match '^([^@]+)@(.+)$') {
      $allUses += [pscustomobject]@{ Action = $matches[1]; Version = $matches[2]; Workflow = $wf.Path }
    }
  }
}
$actionGroups = $allUses | Group-Object -Property Action
foreach ($g in $actionGroups) {
  $versions = @($g.Group | Select-Object -ExpandProperty Version -Unique)
  if ($versions.Count -gt 1) {
    $findings.Add([pscustomobject]@{
      Severity = 'WARN'
      Field    = ('uses: {0}' -f $g.Name)
      Issue    = ('{0} razlicitih verzija preko workflow-a' -f $versions.Count)
      Detail   = ($versions -join ' | ')
    }) | Out-Null
  }
}

# 3. .nvmrc putanje postoje + sadrzaj sinhronizovan
$nvmrcAbsPaths = New-Object 'System.Collections.Generic.HashSet[string]'
foreach ($wf in $workflows) {
  foreach ($n in $wf.NvmrcRefs) {
    # GitHub Actions cita node-version-file relativno od $GITHUB_WORKSPACE (checkout root,
    # tipicno paket root - parent of .github/). Probamo 3 candidate lokacije:
    #   1. relativno od repo root-a (root monorepo workflow sa eksplicitnim sub-paket putanjama)
    #   2. relativno od paketa root-a (parent of .github/) - tipicno za sub-paket workflow-e
    #   3. relativno od workflow direktorijuma (rare fallback)
    $workflowAbs = Join-Path $repoRoot $wf.Path
    $packageRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $workflowAbs))
    $candidates = @(
      (Join-Path $repoRoot $n),
      (Join-Path $packageRoot $n),
      (Join-Path (Split-Path -Parent $workflowAbs) $n)
    )
    $found = $null
    foreach ($c in $candidates) {
      $cNorm = [System.IO.Path]::GetFullPath($c)
      if (Test-Path -LiteralPath $cNorm) { $found = $cNorm; break }
    }
    if (-not $found) {
      $findings.Add([pscustomobject]@{
        Severity = 'WARN'
        Field    = ('node-version-file in {0}' -f $wf.Path)
        Issue    = 'putanja ne postoji'
        Detail   = $n
      }) | Out-Null
    } else {
      $null = $nvmrcAbsPaths.Add($found)
    }
  }
}

# Citanje .nvmrc sadrzaja
$nvmrcContents = New-Object 'System.Collections.Generic.List[object]'
foreach ($abs in $nvmrcAbsPaths) {
  $rel = $abs.Substring($repoRoot.Length).TrimStart('\','/').Replace('\','/')
  $val = (Get-Content -LiteralPath $abs -Raw -Encoding UTF8).Trim()
  $nvmrcContents.Add([pscustomobject]@{ Path = $rel; Version = $val }) | Out-Null
}

Write-Host ''
Write-Host '== .nvmrc fajlovi (referencirani iz workflow-a) ==' -ForegroundColor Cyan
$nvmrcContents | Format-Table -AutoSize | Out-String | Write-Host

$nvmrcVersions = @($nvmrcContents | Select-Object -ExpandProperty Version -Unique)
if ($nvmrcVersions.Count -gt 1) {
  $findings.Add([pscustomobject]@{
    Severity = 'WARN'
    Field    = '.nvmrc'
    Issue    = ('{0} razlicitih Node verzija preko paketa' -f $nvmrcVersions.Count)
    Detail   = ($nvmrcVersions -join ' | ')
  }) | Out-Null
}

# 4. Cross-check .nvmrc ↔ package.json engines.node
foreach ($n in $nvmrcContents) {
  $pkgPath = $n.Path -replace '\.nvmrc$','package.json'
  $pkgAbs = Join-Path $repoRoot $pkgPath
  if (-not (Test-Path -LiteralPath $pkgAbs)) {
    continue  # .nvmrc bez paralelnog package.json (npr. root .nvmrc) — preskoci cross-check
  }
  try {
    $j = Get-Content -LiteralPath $pkgAbs -Raw -Encoding UTF8 | ConvertFrom-Json
    $engNode = if ($j.engines -and $j.engines.node) { [string]$j.engines.node } else { $null }
    if (-not $engNode) {
      $findings.Add([pscustomobject]@{
        Severity = 'INFO'
        Field    = ('cross-check {0}' -f $pkgPath)
        Issue    = ('package.json bez engines.node iako .nvmrc kaze "{0}"' -f $n.Version)
        Detail   = '(preklapa sa Talas 79 audit-om — vlasnik akcija opciono)'
      }) | Out-Null
    } elseif ($engNode -notmatch [regex]::Escape($n.Version)) {
      $findings.Add([pscustomobject]@{
        Severity = 'INFO'
        Field    = ('cross-check {0}' -f $pkgPath)
        Issue    = ('engines.node "{0}" ne sadrzi .nvmrc verziju "{1}"' -f $engNode, $n.Version)
        Detail   = '(potencijalno nedosledno)'
      }) | Out-Null
    }
  } catch {
    Write-Host ("   UPOZORENJE: ne mogu da parsiram {0}: {1}" -f $pkgPath, $_.Exception.Message) -ForegroundColor Yellow
  }
}

Write-Host '== Nalazi ==' -ForegroundColor Cyan
if ($findings.Count -eq 0) {
  Write-Host '  (nema WARN ili INFO nalaza - sve usaglaseno)' -ForegroundColor Green
} else {
  $findings | Select-Object -First $MaxOutput | Format-Table Severity, Field, Issue, Detail -AutoSize -Wrap | Out-String | Write-Host
}

$warnCount = @($findings | Where-Object { $_.Severity -eq 'WARN' }).Count
$infoCount = @($findings | Where-Object { $_.Severity -eq 'INFO' }).Count

Write-Host '== Sumirano ==' -ForegroundColor Cyan
Write-Host ("  Workflows skenirano:    {0}" -f $totalWorkflows)
Write-Host ("  .nvmrc referencirano:   {0}" -f $nvmrcContents.Count)
Write-Host ("  WARN (realan rizik):     {0}" -f $warnCount)
Write-Host ("  INFO (informativno):     {0}" -f $infoCount)

if ($warnCount -gt 0) {
  Write-Host ''
  Write-Host ("UPOZORENJE: {0} WARN nalaz(a) - workflow / .nvmrc nedoslednost" -f $warnCount) -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Napomene:' -ForegroundColor DarkGray
Write-Host '  - Komplementaran: check-package-json-consistency.ps1 (engines.node doslednost preko paketa).'
Write-Host '  - Komplementaran: audit-npm-monorepo.ps1 (npm audit advisory snapshot).'
Write-Host '  - Parsuje YAML preko regex-a (PS 5.1 nema native YAML parser); 90% pokrice tipicnih GitHub Actions yaml-a.'
Write-Host '  - run-all-audits.ps1: 39 koraka (37 read-only + TODO + npm); single entry point.'
Write-Host '  - Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md; pun mirror ukljucuje apps/omnigroup-web build osim sa -SkipOmnigroupWeb).'
Write-Host '  - Smoke (HTTP) i bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).'
Write-Host '  - Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md (LATEST verify Val 355; smoke Val 351).'
Write-Host '  - Operativni handbook (Talas 65->192 lessons): scripts/AGENT-AUTOMATION-GUIDE.md.'

if ($FailOnWarn -and $warnCount -gt 0) {
  exit 1
}
exit 0
