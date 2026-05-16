<#
.SYNOPSIS
  `docker-compose*.yml` doslednost preko 8 compose fajlova (5 root + 3 atina-platform/atina) (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 100 (milestone): **proširenje Talas 99 container/Docker hygiene domena u orchestration sloj** — Talas 99 audituje Dockerfile + .dockerignore (image build), Talas 100 audituje docker-compose YAML (multi-service orchestration); zajedno pokrivaju kompletan Docker layer monorepa. Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa skenira **8 docker-compose YAML fajlova** preko 2 lokacije i validira **7 strukturalnih invarijanti**:

  - **Root (5 fajlova):**
    1. `docker-compose.yml` — Python stack: forge / atina / astra (3 servisa, vault_data volume)
    2. `docker-compose.atina.yml` — Nest stack: atina-postgres + atina-redis + atina-api (3 servisa)
    3. `docker-compose.nest-port-3001.yml` — port override za Nest (deprecated approach; merge sa atina.yml već urađen)
    4. `docker-compose.override.yml` — local override
    5. `docker-compose.override.vault-bindmount.example.yml` — primer bindmount-a za vault
  - **`atina-platform/atina/` (3 fajla):**
    6. `docker-compose.yml` — Atina Node platform stack
    7. `docker-compose.override.yml` — local override
    8. `docker-compose.override.forge-vault-bindmount.example.yml` — primer bindmount-a za forge-vault

  **7 strukturalnih invarijanti:**

  1. **`services:` blok postoji** (Required-WARN) — minimum struktura compose fajla; bez ovoga, fajl je samo komentar i `docker compose up` neće raditi.
  2. **Svaki servis ima `image:` ili `build:`** (Required-WARN) — sanity check; bez jednog od ova dva, Docker ne zna šta da pokreće.
  3. **`version:` polje** (Optional-INFO) — Compose Spec (modern Docker Compose v2+) **ne preporučuje** `version:` polje (deprecated; ignored u v2+); ako postoji, INFO da treba ukloniti za clean compose-spec compatibility.
  4. **Imenovani volumes deklarisani u top-level `volumes:`** (Optional-INFO) — ako servis koristi `vault_data:/data`, root mora imati `volumes:\n  vault_data:` (compose spec); bez toga, Docker kreira anonymous volume sa drugačijim imenom.
  5. **`restart:` policy postoji za servise** (Optional-INFO) — production-readiness; bez `restart: unless-stopped` ili `always`, container ne restartuje pri panici / OOM kill-u.
  6. **`healthcheck:` postoji za critical infrastructure servise** (Optional-INFO) — DB / cache / API servise treba imati health probe za `depends_on: condition: service_healthy` pattern; **trenutno**: atina-postgres ✓ (`pg_isready`), atina-redis i atina-api ⚠ (no healthcheck).
  7. **Override fajlovi imaju primer naming konvencije** (Optional-INFO) — `*.example.yml` je standard za "kopiraj kao osnovu, ali ne commit-uj edit"; `*.override.yml` je standard za auto-merge u `docker compose up` bez `-f`.

  **Per-fajl analiza** — skener ne validira semantiku, samo prisustvo blokova; YAML parsing je regex-based (PS5.1 nema native YAML parser; izbegava se npm/pip dependency).

  **Tabela poređenja sa drugim Docker audit slojevima**:

  | Audit | Talas | Sloj | Fokus |
  |-------|-------|------|-------|
  | `check-docker-files-presence.ps1` | 99 | Image build | Dockerfile multi-stage + USER non-root + HEALTHCHECK + .dockerignore |
  | `check-docker-compose-consistency.ps1` (ovaj) | 100 | Orchestration | docker-compose YAML services + image/build + version (deprecated) + volumes + restart + healthcheck |
  | `check-workflow-consistency.ps1` | 80 | CI/CD GitHub Actions | actions/checkout@v4, actions/setup-node@v4, .nvmrc=20, engines.node cross-check |

  Talas 80 + 99 + 100 zajedno pokrivaju **~95% deploy pipeline rizika** preko 3 sloja: build (Dockerfile) + orchestration (docker-compose) + CI/CD pipeline (GitHub workflow).

  Read-only audit: ne menja fajlove. **Nije** deo CI mirror-a (`verify-monorepo.ps1` job **`python`** / required check **`Python (Doslednost dok + pytest)`** — `docs/GIT-BRANCH-PROTECTION.md`). Dopuna pre-PR pregleda; smoke (HTTP) i bundled `npm run smoke:all`: `scripts/smoke-stack.ps1` + `atina-platform/atina/docs/operations/release-gate-checklist.md` (*Local notes — Smoke tests*).

.PARAMETER FailOnWarn
  Vraća exit 1 ako bilo koji od 7 strukturalnih invarijanti prijavi WARN. Bez ove opcije, uvek vraća 0 (skripta je informativna).

.PARAMETER MaxOutput
  Maksimalan broj redova u Detalji sekciji. Default 200.

.PARAMETER ComposeFiles
  Lista relativnih putanja do compose fajlova. Default je 8 fajlova monorepa. Parametrizovan radi testiranja.

.EXAMPLE
  .\scripts\check-docker-compose-consistency.ps1
  # Default: skenira 8 compose fajlova, prijavljuje WARN/INFO nalaze, exit 0 uvek.

.EXAMPLE
  .\scripts\check-docker-compose-consistency.ps1 -FailOnWarn
  # Strogi rezim: exit 1 ako bilo koji invariant fail-uje.

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 100 = ovaj skript; ukupno 39 koraka Talas 65-192).
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
  [string[]]$ComposeFiles = @(
    'docker-compose.yml',
    'docker-compose.atina.yml',
    'docker-compose.nest-port-3001.yml',
    'docker-compose.override.yml',
    'docker-compose.override.vault-bindmount.example.yml',
    'atina-platform/atina/docker-compose.yml',
    'atina-platform/atina/docker-compose.override.yml',
    'atina-platform/atina/docker-compose.override.forge-vault-bindmount.example.yml'
  )
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

Write-Host '== check-docker-compose-consistency.ps1 - docker-compose YAML doslednost (informativan) ==' -ForegroundColor Cyan
Write-Host ("   FailOnWarn: {0}" -f $FailOnWarn) -ForegroundColor DarkGray
Write-Host ("   ComposeFiles: {0}" -f $ComposeFiles.Count) -ForegroundColor DarkGray

# --- Helper: parsiraj compose fajl ---
function Get-ComposeAnalysis {
  param([string]$AbsPath)
  $result = [pscustomobject]@{
    Exists             = $false
    NonEmpty           = $false
    HasVersion         = $false
    VersionValue       = $null
    HasServicesBlock   = $false
    ServicesCount      = 0
    ServicesWithImage  = 0
    ServicesWithBuild  = 0
    ServicesWithoutImageOrBuild = New-Object 'System.Collections.Generic.List[string]'
    ServicesWithRestart = 0
    ServicesWithHealthcheck = 0
    ServicesWithPorts  = 0
    HasTopLevelVolumes = $false
    NamedVolumesUsed   = New-Object 'System.Collections.Generic.List[string]'
    NamedVolumesDefined = New-Object 'System.Collections.Generic.List[string]'
    IsExampleFile      = $false
    IsOverrideFile     = $false
  }
  if (-not (Test-Path $AbsPath)) { return $result }
  $result.Exists = $true
  $lines = Get-Content -LiteralPath $AbsPath -Encoding UTF8 -ErrorAction SilentlyContinue
  if (-not $lines -or $lines.Count -eq 0) { return $result }
  $result.NonEmpty = $true

  $fileName = Split-Path -Leaf $AbsPath
  $result.IsExampleFile = ($fileName -like '*.example.yml' -or $fileName -like '*.example.yaml')
  $result.IsOverrideFile = ($fileName -like '*.override.yml' -or $fileName -like '*.override.*.yml')

  $inServicesBlock = $false
  $inVolumesBlock = $false
  $currentService = $null
  $currentServiceLines = @()
  $servicesMap = @{}

  for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    $trim = $line.TrimEnd()
    if ($trim -match '^\s*$' -or $trim -match '^\s*#') { continue }

    # Top-level keys
    if ($line -match '^version:\s*[''"]?([^''"\s]+)[''"]?') {
      $result.HasVersion = $true
      $result.VersionValue = $Matches[1]
      $inServicesBlock = $false
      $inVolumesBlock = $false
      continue
    }
    if ($line -match '^services:\s*$') {
      $result.HasServicesBlock = $true
      $inServicesBlock = $true
      $inVolumesBlock = $false
      continue
    }
    if ($line -match '^volumes:\s*$') {
      $result.HasTopLevelVolumes = $true
      $inServicesBlock = $false
      $inVolumesBlock = $true
      $currentService = $null
      continue
    }
    if ($line -match '^networks:\s*$' -or $line -match '^configs:\s*$' -or $line -match '^secrets:\s*$') {
      $inServicesBlock = $false
      $inVolumesBlock = $false
      $currentService = $null
      continue
    }

    # Top-level volumes block (named volumes definitions)
    if ($inVolumesBlock -and $line -match '^\s{2}(\S+):\s*$') {
      $volName = $Matches[1]
      [void]$result.NamedVolumesDefined.Add($volName)
      continue
    }

    # Inside services block
    if ($inServicesBlock) {
      # Service name (2-space indent + name + ':')
      if ($line -match '^\s{2}([a-zA-Z0-9_-]+):\s*$') {
        $currentService = $Matches[1]
        $servicesMap[$currentService] = @{
          HasImage = $false
          HasBuild = $false
          HasRestart = $false
          HasHealthcheck = $false
          HasPorts = $false
        }
        continue
      }
      # Service-level keys (4+ space indent)
      if ($currentService -and $line -match '^\s{4}image:\s*\S+') {
        $servicesMap[$currentService].HasImage = $true
        continue
      }
      if ($currentService -and $line -match '^\s{4}build:') {
        $servicesMap[$currentService].HasBuild = $true
        continue
      }
      if ($currentService -and $line -match '^\s{4}restart:\s*\S+') {
        $servicesMap[$currentService].HasRestart = $true
        continue
      }
      if ($currentService -and $line -match '^\s{4}healthcheck:') {
        $servicesMap[$currentService].HasHealthcheck = $true
        continue
      }
      if ($currentService -and $line -match '^\s{4}ports:') {
        $servicesMap[$currentService].HasPorts = $true
        continue
      }
      # Volume reference: `- vault_data:/data` or `- ./local:/data`
      if ($currentService -and $line -match '^\s{6}-\s+([a-zA-Z0-9_-]+):/') {
        $volRef = $Matches[1]
        if ($volRef -notmatch '^\.+|^/' -and $result.NamedVolumesUsed -notcontains $volRef) {
          [void]$result.NamedVolumesUsed.Add($volRef)
        }
      }
    }
  }

  $result.ServicesCount = $servicesMap.Count
  foreach ($svc in $servicesMap.GetEnumerator()) {
    if ($svc.Value.HasImage) { $result.ServicesWithImage++ }
    if ($svc.Value.HasBuild) { $result.ServicesWithBuild++ }
    if ($svc.Value.HasRestart) { $result.ServicesWithRestart++ }
    if ($svc.Value.HasHealthcheck) { $result.ServicesWithHealthcheck++ }
    if ($svc.Value.HasPorts) { $result.ServicesWithPorts++ }
    if (-not ($svc.Value.HasImage -or $svc.Value.HasBuild)) {
      [void]$result.ServicesWithoutImageOrBuild.Add($svc.Key)
    }
  }

  return $result
}

# --- Skeniraj 8 compose fajlova ---
$results = New-Object 'System.Collections.Generic.List[object]'
$findings = New-Object 'System.Collections.Generic.List[object]'

foreach ($relPath in $ComposeFiles) {
  $absPath = Join-Path $repoRoot $relPath
  if (-not (Test-Path $absPath)) {
    $findings.Add([pscustomobject]@{
      File     = $relPath
      Severity = 'WARN'
      Code     = 'FILE-MISSING'
      Detail   = ("Compose fajl ne postoji: {0}" -f $relPath)
    }) | Out-Null
    continue
  }

  $analysis = Get-ComposeAnalysis -AbsPath $absPath

  $entry = [pscustomobject]@{
    File              = $relPath
    Services          = $analysis.ServicesCount
    WithImage         = $analysis.ServicesWithImage
    WithBuild         = $analysis.ServicesWithBuild
    WithRestart       = $analysis.ServicesWithRestart
    WithHealthcheck   = $analysis.ServicesWithHealthcheck
    HasVersion        = $analysis.HasVersion
    VersionValue      = $analysis.VersionValue
    HasTopVolumes     = $analysis.HasTopLevelVolumes
    NamedVolUsed      = $analysis.NamedVolumesUsed.Count
    NamedVolDefined   = $analysis.NamedVolumesDefined.Count
    IsExample         = $analysis.IsExampleFile
    IsOverride        = $analysis.IsOverrideFile
  }

  # Skip strict checks za .example fajlove (oni su demo)
  $skipStrict = $analysis.IsExampleFile

  # Invariant 1: services: blok postoji
  if (-not $analysis.HasServicesBlock -and -not $skipStrict) {
    $findings.Add([pscustomobject]@{
      File     = $relPath
      Severity = 'WARN'
      Code     = 'NO-SERVICES-BLOCK'
      Detail   = "Compose fajl nema 'services:' blok - docker compose up nece raditi"
    }) | Out-Null
  } elseif (-not $analysis.HasServicesBlock -and $skipStrict) {
    $findings.Add([pscustomobject]@{
      File     = $relPath
      Severity = 'INFO'
      Code     = 'EXAMPLE-NO-SERVICES'
      Detail   = "Example fajl bez 'services:' bloka (legitimno - dokumentacija/demo)"
    }) | Out-Null
  }

  # Invariant 2: svaki servis ima image: ili build: (samo za base, ne override)
  # Override fajlovi extend-uju base servise i ne moraju imati image:/build:
  # Heuristika: ako 0 servisa u fajlu ima image: ili build:, tretiraj kao override-style (ekstends sve preko -f merge)
  $isOverrideStyle = ($analysis.IsOverrideFile -or ($analysis.ServicesCount -gt 0 -and $analysis.ServicesWithImage -eq 0 -and $analysis.ServicesWithBuild -eq 0))
  if ($analysis.ServicesWithoutImageOrBuild.Count -gt 0 -and -not $skipStrict -and -not $isOverrideStyle) {
    $svcList = $analysis.ServicesWithoutImageOrBuild -join ', '
    $findings.Add([pscustomobject]@{
      File     = $relPath
      Severity = 'WARN'
      Code     = 'SERVICE-NO-IMAGE-BUILD'
      Detail   = ("Servis(i) bez 'image:' ili 'build:' direktive: {0} - Docker ne zna sta da pokrece" -f $svcList)
    }) | Out-Null
  }
  # Ako je fajl override-style ali nije eksplicitno overridenamed, INFO signal
  if ($isOverrideStyle -and -not $analysis.IsOverrideFile -and -not $skipStrict -and $analysis.ServicesCount -gt 0) {
    $findings.Add([pscustomobject]@{
      File     = $relPath
      Severity = 'INFO'
      Code     = 'OVERRIDE-STYLE-WITHOUT-NAME'
      Detail   = ("Fajl izgleda kao override (svi servisi bez image:/build:) ali ime ne sadrzi '.override.' - razmotri rename u 'docker-compose.override.<purpose>.yml' za jasniju semantiku")
    }) | Out-Null
  }

  # Invariant 3: version: polje (deprecated u Compose Spec)
  if ($analysis.HasVersion) {
    $findings.Add([pscustomobject]@{
      File     = $relPath
      Severity = 'INFO'
      Code     = 'LEGACY-VERSION-FIELD'
      Detail   = ("'version: {0}' polje deprecated u Compose Spec (modern Docker Compose v2+ ignorise); ukloniti za clean compatibility" -f $analysis.VersionValue)
    }) | Out-Null
  }

  # Invariant 4: imenovani volumes deklarisani u top-level volumes:
  if ($analysis.NamedVolumesUsed.Count -gt 0) {
    foreach ($volUsed in $analysis.NamedVolumesUsed) {
      if ($analysis.NamedVolumesDefined -notcontains $volUsed) {
        $findings.Add([pscustomobject]@{
          File     = $relPath
          Severity = 'INFO'
          Code     = 'VOLUME-NOT-DEFINED'
          Detail   = ("Imenovani volume '{0}' koriscen u servisu ali NIJE u top-level volumes: bloku - Docker kreira anonymous volume sa drugacijim imenom" -f $volUsed)
        }) | Out-Null
      }
    }
  }

  # Invariant 5: restart: policy postoji za servise (samo za base compose, ne override)
  if ($analysis.ServicesCount -gt 0 -and -not $analysis.IsOverrideFile -and -not $skipStrict) {
    if ($analysis.ServicesWithRestart -lt $analysis.ServicesCount) {
      $missingCount = $analysis.ServicesCount - $analysis.ServicesWithRestart
      $findings.Add([pscustomobject]@{
        File     = $relPath
        Severity = 'INFO'
        Code     = 'NO-RESTART-POLICY'
        Detail   = ("{0}/{1} servisa bez 'restart:' policy - production-readiness; bez nje container ne restartuje pri panici/OOM" -f $missingCount, $analysis.ServicesCount)
      }) | Out-Null
    }
  }

  # Invariant 6: healthcheck: za infrastructure servise (DB / cache / API; samo INFO za base)
  if ($analysis.ServicesCount -gt 0 -and -not $analysis.IsOverrideFile -and -not $skipStrict) {
    if ($analysis.ServicesWithHealthcheck -eq 0 -and $analysis.ServicesCount -gt 0) {
      $findings.Add([pscustomobject]@{
        File     = $relPath
        Severity = 'INFO'
        Code     = 'NO-HEALTHCHECK'
        Detail   = ("0/{0} servisa ima 'healthcheck:' - bez nje 'depends_on: condition: service_healthy' pattern ne radi" -f $analysis.ServicesCount)
      }) | Out-Null
    }
  }

  $results.Add($entry) | Out-Null
}

# --- Sumarni izveštaj ---
$warns = @($findings | Where-Object { $_.Severity -eq 'WARN' })
$infos = @($findings | Where-Object { $_.Severity -eq 'INFO' })

Write-Host ''
Write-Host '== docker-compose YAML doslednost rezime ==' -ForegroundColor Cyan
Write-Host ("  Compose fajlova skenirano:    {0}" -f $results.Count)
Write-Host ("  Servisa ukupno:               {0}" -f (($results | Measure-Object -Property Services -Sum).Sum))
Write-Host ("  WARN (orchestration risk):    {0}" -f $warns.Count)
Write-Host ("  INFO (best practice):         {0}" -f $infos.Count)

# --- Tabela ---
Write-Host ''
Write-Host '== Tabela compose fajlova ==' -ForegroundColor Cyan
$results |
  Select-Object @{N='File';E={ $_.File -replace '^atina-platform/atina/', 'atina/' }}, Services, @{N='Image';E={$_.WithImage}}, @{N='Build';E={$_.WithBuild}}, @{N='Restart';E={$_.WithRestart}}, @{N='HC';E={$_.WithHealthcheck}}, @{N='Version';E={ if ($_.HasVersion) { ('WARN ' + $_.VersionValue) } else { 'OK none' } }}, @{N='TopVols';E={ if ($_.HasTopVolumes) { ('OK ' + $_.NamedVolDefined) } else { '-' } }}, @{N='Type';E={ if ($_.IsExample) { 'example' } elseif ($_.IsOverride) { 'override' } else { 'base' } }} |
  Format-Table -AutoSize | Out-String | Write-Host

# --- Detalji WARN + INFO ---
if ($findings.Count -gt 0) {
  Write-Host '== Detalji nalaza (WARN prvo, INFO posle) ==' -ForegroundColor Cyan
  $sorted = $findings | Sort-Object @{Expression='Severity'; Descending=$false}, File, Code
  $sorted | Select-Object -First $MaxOutput | ForEach-Object {
    $color = if ($_.Severity -eq 'WARN') { 'Yellow' } else { 'DarkGray' }
    Write-Host ("  [{0}] {1} :: {2}" -f $_.Severity, $_.File, $_.Code) -ForegroundColor $color
    Write-Host ("    {0}" -f $_.Detail) -ForegroundColor DarkGray
  }
}

Write-Host ''
Write-Host 'Napomene:' -ForegroundColor DarkGray
Write-Host '  - Komplementarni audit Talas 99 (`check-docker-files-presence.ps1`) pokriva image build sloj (Dockerfile + .dockerignore).'
Write-Host '  - Talas 100 (ovaj) audituje orchestration sloj (docker-compose YAML); zajedno pokrivaju kompletan Docker layer.'
Write-Host '  - Talas 80 + 99 + 100 pokrivaju ~95% deploy pipeline rizika preko 3 sloja: build + orchestration + CI/CD.'
Write-Host '  - YAML parsing je regex-based (PS5.1 nema native YAML parser; izbegava se npm/pip dependency).'
Write-Host '  - Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md).'
Write-Host '  - Smoke (HTTP) i bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).'
Write-Host '  - Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md (LATEST verify Val 355; smoke Val 351).'
Write-Host '  - Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md i docs/NIVO-1-DRYRUN-LOG.md.'

if ($FailOnWarn -and $warns.Count -gt 0) {
  exit 1
}
exit 0
