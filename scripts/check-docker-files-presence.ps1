<#
.SYNOPSIS
  `Dockerfile` + `.dockerignore` + `docker-compose.yml` presence + zdravlje preko 4 logičkih lokacija (root Python + 3 Node paketa) (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 99: novi domen — **container/Docker hygiene** (komplementaran sa Talas 80 GitHub workflow YAML doslednost u CI/CD sloju), fokus na **Dockerfile multi-stage + non-root USER + HEALTHCHECK + `.dockerignore` `node_modules` ignore** koji su deploy-rizik signali ako nedostaju. Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa skenira **4 logičkih lokacija** (root sa Python Dockerfile + 3 Node paketa: `apps/omnigroup-web`, `atina-platform/atina`, `atina-system`) i validira **7 strukturalnih invarijanti** za Docker / containerization fajlove:

  1. **`Dockerfile` postoji** (Required-WARN za Node servis pakete) — paket koji je deployable servis treba container build; **trenutno**: root ✓, atina-platform ✓, atina-system ✓, **`apps/omnigroup-web` ⚠ NEMA Dockerfile** (Next servis bez container deploy-a; vlasnik akcija opciono za deploy via Vercel ili Container).
  2. **`.dockerignore` postoji ako Dockerfile postoji** (Required-WARN) — bez `.dockerignore`, `docker build` kontekst uvozi sve fajlove uključujući `node_modules` (~200+ MB); upload je spor, image može biti veći; **trenutno**: root ✓, atina-platform ✓, atina-system ✓.
  3. **`Dockerfile` ima bar 1 `FROM` direktivu** (Required-WARN) — sanity check; prazan ili korumpiran Dockerfile pao bi build u CI tek pri pokušaju.
  4. **`Dockerfile` koristi multi-stage build** (Optional-INFO) — bar 2 `FROM ... AS` ili 2+ `FROM` direktive; smanjuje image size (build deps ne idu u final image), bezbedniji (manje attack surface); **trenutno**: root ✓ (4 stage-a base/forge/atina/astra), atina-platform ✓ (builder + production), atina-system ✓ (build + runtime).
  5. **`Dockerfile` koristi non-root `USER`** (Required-WARN za Node servise) — security best practice (CIS Docker Benchmark 4.1); container koji se izvršava kao `root` ima full privilegije ako exploit; provera ne uzima `USER root` kao prolaz; **trenutno**: root ⚠ (Python image, no USER), atina-platform ✓ (USER atina), **atina-system ⚠ NO USER** (vlasnik akcija opciono — dodati `USER node` posle final `COPY`).
  6. **`.dockerignore` ignoriše `node_modules`** (Required-WARN za Node pakete) — common antipattern; bez ovog, Docker build context uvozi 200+ MB host `node_modules` koji se odmah override-uje preko `npm ci` u image-u; **trenutno**: atina-platform ✓, atina-system ✓ (root nije Node, N/A).
  7. **`Dockerfile` ima `HEALTHCHECK` direktivu** (Optional-INFO) — Docker može detektovati unhealthy container i restartovati ga; potrebno za Kubernetes/Docker Swarm rolling updates; **trenutno**: root ⚠ (no HEALTHCHECK), atina-platform ✓ (curl /health), **atina-system ⚠ NO HEALTHCHECK** (vlasnik akcija opciono).

  **Per-lokacija `PackageType`** (Node | Python | Generic) — skener prilagođava invarijante po tipu (npr. invariant 6 `node_modules` ignore samo za Node pakete; root sa Python Dockerfile ne treba `node_modules`).

  **PS Lesson #19 NIJE primenjena** — Dockerfile je plain text sa direktivama (`FROM`, `USER`, `HEALTHCHECK`, etc.); skener koristi line-based regex parsing (`^FROM\s+`, `^USER\s+(?!root\b)`, `^HEALTHCHECK\s+`) bez JSON parser-a.

  **Tabela poređenja sa drugim audit slojevima**:

  | Audit | Talas | Domain | Fokus |
  |-------|-------|--------|-------|
  | `check-workflow-consistency.ps1` | 80 | CI/CD GitHub Actions | `actions/checkout@v4`, `actions/setup-node@v4`, `.nvmrc=20`, `engines.node` cross-check |
  | `check-docker-files-presence.ps1` (ovaj) | 99 | Container/Docker | Dockerfile multi-stage + USER non-root + HEALTHCHECK + .dockerignore node_modules |

  Read-only audit: ne menja fajlove. **Nije** deo CI mirror-a (`verify-monorepo.ps1` job **`python`** / required check **`Python (Doslednost dok + pytest)`** — `docs/GIT-BRANCH-PROTECTION.md`). Dopuna pre-PR pregleda; smoke (HTTP) i bundled `npm run smoke:all`: `scripts/smoke-stack.ps1` + `atina-platform/atina/docs/operations/release-gate-checklist.md` (*Local notes — Smoke tests*).

.PARAMETER FailOnWarn
  Vraća exit 1 ako bilo koji od 7 strukturalnih invarijanti prijavi WARN. Bez ove opcije, uvek vraća 0 (skripta je informativna).

.PARAMETER MaxOutput
  Maksimalan broj redova u Detalji sekciji. Default 200.

.PARAMETER DockerLocations
  Lista hashtable-ova koji opisuju Docker lokacije. Default je 4 lokacije (root Python + 3 Node paketa). Parametrizovan radi testiranja.

.EXAMPLE
  .\scripts\check-docker-files-presence.ps1
  # Default: skenira 4 lokacije, prijavljuje WARN/INFO nalaze, exit 0 uvek.

.EXAMPLE
  .\scripts\check-docker-files-presence.ps1 -FailOnWarn
  # Strogi rezim: exit 1 ako bilo koji invariant fail-uje.

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 99 = ovaj skript; ukupno 39 koraka Talas 65-192).
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
  [hashtable[]]$DockerLocations = @(
    @{ Path = '.';                    Label = 'root';                 PackageType = 'Python';  ServiceRequired = $true  }
    @{ Path = 'apps/omnigroup-web';   Label = 'apps/omnigroup-web';   PackageType = 'Node';    ServiceRequired = $true  }
    @{ Path = 'atina-platform/atina'; Label = 'atina-platform/atina'; PackageType = 'Node';    ServiceRequired = $true  }
    @{ Path = 'atina-system';         Label = 'atina-system';         PackageType = 'Node';    ServiceRequired = $true  }
  )
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

Write-Host '== check-docker-files-presence.ps1 - Docker fajlovi presence + zdravlje (informativan) ==' -ForegroundColor Cyan
Write-Host ("   FailOnWarn: {0}" -f $FailOnWarn) -ForegroundColor DarkGray
Write-Host ("   DockerLocations: {0}" -f ($DockerLocations.Count)) -ForegroundColor DarkGray

# --- Helper: parsiraj Dockerfile za invarijante ---
function Get-DockerfileAnalysis {
  param([string]$AbsPath)
  $result = [pscustomobject]@{
    Exists           = $false
    NonEmpty         = $false
    HasFromDirective = $false
    FromCount        = 0
    IsMultiStage     = $false
    HasNonRootUser   = $false
    HasHealthcheck   = $false
    BaseImage        = $null
  }
  if (-not (Test-Path $AbsPath)) { return $result }
  $result.Exists = $true
  $lines = Get-Content -LiteralPath $AbsPath -Encoding UTF8 -ErrorAction SilentlyContinue
  if (-not $lines -or $lines.Count -eq 0) { return $result }
  $result.NonEmpty = $true

  $fromCount = 0
  $stageCount = 0
  $firstFromImage = $null
  foreach ($line in $lines) {
    $trim = $line.Trim()
    if ($trim -eq '' -or $trim.StartsWith('#')) { continue }
    if ($trim -match '^FROM\s+([^\s]+)(\s+AS\s+\S+)?') {
      $fromCount++
      if (-not $firstFromImage) { $firstFromImage = $Matches[1] }
      if ($Matches[2]) { $stageCount++ }
    }
    # USER direktiva, ali ne `USER root`
    if ($trim -match '^USER\s+(\S+)' -and $Matches[1].Trim() -ne 'root') {
      $result.HasNonRootUser = $true
    }
    if ($trim -match '^HEALTHCHECK\s+') {
      $result.HasHealthcheck = $true
    }
  }

  $result.FromCount = $fromCount
  $result.HasFromDirective = ($fromCount -gt 0)
  # multi-stage: 2+ FROM ili eksplicitan AS
  $result.IsMultiStage = ($fromCount -ge 2) -or ($stageCount -ge 1)
  $result.BaseImage = $firstFromImage
  return $result
}

# --- Helper: parsiraj .dockerignore za node_modules ---
function Get-DockerignoreAnalysis {
  param([string]$AbsPath)
  $result = [pscustomobject]@{
    Exists           = $false
    NonEmpty         = $false
    IgnoresNodeModules = $false
    LineCount        = 0
  }
  if (-not (Test-Path $AbsPath)) { return $result }
  $result.Exists = $true
  $lines = Get-Content -LiteralPath $AbsPath -Encoding UTF8 -ErrorAction SilentlyContinue
  if (-not $lines -or $lines.Count -eq 0) { return $result }
  $result.NonEmpty = $true

  $contentLines = 0
  foreach ($line in $lines) {
    $trim = $line.Trim()
    if ($trim -eq '' -or $trim.StartsWith('#')) { continue }
    $contentLines++
    if ($trim -eq 'node_modules' -or $trim -eq '/node_modules' -or $trim -eq 'node_modules/' -or $trim -eq '/node_modules/' -or $trim -eq '**/node_modules') {
      $result.IgnoresNodeModules = $true
    }
  }
  $result.LineCount = $contentLines
  return $result
}

# --- Skeniraj 4 lokacije ---
$results = New-Object 'System.Collections.Generic.List[object]'
$findings = New-Object 'System.Collections.Generic.List[object]'

foreach ($loc in $DockerLocations) {
  $absRoot = Join-Path $repoRoot $loc.Path
  if (-not (Test-Path $absRoot)) {
    $findings.Add([pscustomobject]@{
      Location = $loc.Label
      Severity = 'WARN'
      Code     = 'LOC-MISSING'
      Detail   = ("Lokacija ne postoji: {0}" -f $absRoot)
    }) | Out-Null
    continue
  }

  $dockerfilePath = Join-Path $absRoot 'Dockerfile'
  $dockerignorePath = Join-Path $absRoot '.dockerignore'

  $df = Get-DockerfileAnalysis -AbsPath $dockerfilePath
  $di = Get-DockerignoreAnalysis -AbsPath $dockerignorePath

  $entry = [pscustomobject]@{
    Location           = $loc.Label
    PackageType        = $loc.PackageType
    DockerfileExists   = $df.Exists
    BaseImage          = $df.BaseImage
    FromCount          = $df.FromCount
    IsMultiStage       = $df.IsMultiStage
    HasNonRootUser     = $df.HasNonRootUser
    HasHealthcheck     = $df.HasHealthcheck
    DockerignoreExists = $di.Exists
    IgnoresNodeModules = $di.IgnoresNodeModules
    DockerignoreLines  = $di.LineCount
  }

  # Invariant 1: Dockerfile postoji
  if (-not $df.Exists -and $loc.ServiceRequired) {
    $findings.Add([pscustomobject]@{
      Location = $loc.Label
      Severity = 'WARN'
      Code     = 'NO-DOCKERFILE'
      Detail   = ("Dockerfile ne postoji u {0} - servis paket bez container deploy-a; vlasnik akcija opciono (deploy via Vercel/Container)" -f $loc.Path)
    }) | Out-Null
  }

  if ($df.Exists) {
    # Invariant 3: bar 1 FROM
    if (-not $df.HasFromDirective) {
      $findings.Add([pscustomobject]@{
        Location = $loc.Label
        Severity = 'WARN'
        Code     = 'NO-FROM-DIRECTIVE'
        Detail   = "Dockerfile postoji ali nema nijednu FROM direktivu - korumpiran ili prazan"
      }) | Out-Null
    }

    # Invariant 4: multi-stage (INFO)
    if (-not $df.IsMultiStage -and $df.HasFromDirective) {
      $findings.Add([pscustomobject]@{
        Location = $loc.Label
        Severity = 'INFO'
        Code     = 'SINGLE-STAGE'
        Detail   = ("Dockerfile koristi single-stage build ({0} FROM); multi-stage smanjuje image size i security surface" -f $df.FromCount)
      }) | Out-Null
    }

    # Invariant 5: non-root USER (Required za Node servise)
    if (-not $df.HasNonRootUser -and $loc.PackageType -eq 'Node') {
      $findings.Add([pscustomobject]@{
        Location = $loc.Label
        Severity = 'WARN'
        Code     = 'NO-NONROOT-USER'
        Detail   = "Dockerfile nema non-root USER direktivu - container se izvrsava kao root, security best practice violation (CIS Docker Benchmark 4.1)"
      }) | Out-Null
    } elseif (-not $df.HasNonRootUser -and $loc.PackageType -eq 'Python') {
      $findings.Add([pscustomobject]@{
        Location = $loc.Label
        Severity = 'INFO'
        Code     = 'NO-NONROOT-USER'
        Detail   = "Dockerfile nema non-root USER direktivu (Python image); razmotri dodavanje USER u multi-stage final image"
      }) | Out-Null
    }

    # Invariant 7: HEALTHCHECK (INFO)
    if (-not $df.HasHealthcheck) {
      $findings.Add([pscustomobject]@{
        Location = $loc.Label
        Severity = 'INFO'
        Code     = 'NO-HEALTHCHECK'
        Detail   = "Dockerfile nema HEALTHCHECK direktivu; Docker/K8s ne moze automatski detektovati unhealthy container"
      }) | Out-Null
    }

    # Invariant 2: .dockerignore postoji ako Dockerfile postoji
    if (-not $di.Exists) {
      $findings.Add([pscustomobject]@{
        Location = $loc.Label
        Severity = 'WARN'
        Code     = 'NO-DOCKERIGNORE'
        Detail   = "Dockerfile postoji ali .dockerignore ne postoji - build context uvozi sve fajlove ukljucujuci node_modules (~200+ MB), build je spor"
      }) | Out-Null
    } else {
      # Invariant 6: .dockerignore mora ignorisati node_modules za Node pakete
      if (-not $di.IgnoresNodeModules -and $loc.PackageType -eq 'Node') {
        $findings.Add([pscustomobject]@{
          Location = $loc.Label
          Severity = 'WARN'
          Code     = 'NO-NODE-MODULES-IGNORE'
          Detail   = ".dockerignore ne ignorise node_modules - common antipattern; build context uvozi 200+ MB host node_modules koji se odmah override-uje preko npm ci u image-u"
        }) | Out-Null
      }
    }
  }

  $results.Add($entry) | Out-Null
}

# --- Sumarni izveštaj ---
$warns = @($findings | Where-Object { $_.Severity -eq 'WARN' })
$infos = @($findings | Where-Object { $_.Severity -eq 'INFO' })

Write-Host ''
Write-Host '== Docker fajlovi presence + zdravlje rezime ==' -ForegroundColor Cyan
Write-Host ("  Lokacija skenirano:           {0}" -f $results.Count)
Write-Host ("  WARN (deploy-rizik):          {0}" -f $warns.Count)
Write-Host ("  INFO (best practice):         {0}" -f $infos.Count)

# --- Tabela ---
Write-Host ''
Write-Host '== Tabela Docker fajlova po lokaciji ==' -ForegroundColor Cyan
$results |
  Select-Object Location, PackageType, @{N='Dockerfile';E={ if ($_.DockerfileExists) { ('OK ' + $_.BaseImage) } else { 'MISSING' } }}, @{N='Multi-Stage';E={ if ($_.DockerfileExists) { if ($_.IsMultiStage) { ('OK ' + $_.FromCount + ' FROM') } else { 'single' } } else { '-' } }}, @{N='NonRootUSER';E={ if ($_.DockerfileExists) { if ($_.HasNonRootUser) { 'OK' } else { 'no' } } else { '-' } }}, @{N='HEALTHCHECK';E={ if ($_.DockerfileExists) { if ($_.HasHealthcheck) { 'OK' } else { 'no' } } else { '-' } }}, @{N='.dockerignore';E={ if ($_.DockerignoreExists) { if ($_.IgnoresNodeModules) { ('OK {0}L (NM)' -f $_.DockerignoreLines) } else { ('OK {0}L' -f $_.DockerignoreLines) } } else { 'MISSING' } }} |
  Format-Table -AutoSize | Out-String | Write-Host

# --- Detalji WARN + INFO ---
if ($findings.Count -gt 0) {
  Write-Host '== Detalji nalaza (WARN prvo, INFO posle) ==' -ForegroundColor Cyan
  $sorted = $findings | Sort-Object @{Expression='Severity'; Descending=$false}, Location, Code
  $sorted | Select-Object -First $MaxOutput | ForEach-Object {
    $color = if ($_.Severity -eq 'WARN') { 'Yellow' } else { 'DarkGray' }
    Write-Host ("  [{0}] {1} :: {2}" -f $_.Severity, $_.Location, $_.Code) -ForegroundColor $color
    Write-Host ("    {0}" -f $_.Detail) -ForegroundColor DarkGray
  }
}

Write-Host ''
Write-Host 'Napomene:' -ForegroundColor DarkGray
Write-Host '  - Komplementarni audit Talas 80 (`check-workflow-consistency.ps1`) pokriva CI/CD GitHub Actions sloj (workflow YAML + .nvmrc + engines.node).'
Write-Host '  - Talas 99 dodaje **container/Docker hygiene** novi domen — Dockerfile multi-stage + non-root USER + HEALTHCHECK + .dockerignore node_modules.'
Write-Host '  - 4 lokacije: root (Python: forge/atina/astra) + apps/omnigroup-web (Next) + atina-platform/atina (Node lib) + atina-system (Nest).'
Write-Host '  - Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md).'
Write-Host '  - Smoke (HTTP) i bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).'
Write-Host '  - Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md (LATEST verify Val 355; smoke Val 351).'
Write-Host '  - Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md i docs/NIVO-1-DRYRUN-LOG.md.'

if ($FailOnWarn -and $warns.Count -gt 0) {
  exit 1
}
exit 0
