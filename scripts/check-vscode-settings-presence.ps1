<#
.SYNOPSIS
  `.vscode/` direktorijum (settings.json + extensions.json) presence + zdravlje (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 104: **novi 11. domen — Developer Experience / IDE konfiguracija** koji pokriva onboarding kvalitet za Cursor / VSCode developere. Pre Talas 104, repo je imao `.editorconfig` audit (Talas 95 root meta) ali ne i `.vscode/` audit; `.editorconfig` je univerzalan (svi editor-i), dok `.vscode/` je VSCode-specifičan i potpuno različit slučaj — formatOnSave, defaultFormatter, eslint.workingDirectories za monorepo, plus extensions.json recommendations koje VSCode/Cursor automatski predloži pri otvaranju projekta. Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa skenira `.vscode/` direktorijum i validira **6 strukturalnih invarijanti** za VSCode/Cursor IDE konfiguraciju:

  - **`.vscode/settings.json`** — workspace settings koji override-uju korisnikove user settings; relevantni za monorepo (eslint.workingDirectories), formatOnSave, defaultFormatter (Prettier/ESLint), tailwindCSS.includeLanguages, typescript.tsdk pinning na lokalnu verziju.
  - **`.vscode/extensions.json`** — recommendations array koji VSCode/Cursor automatski prikazuje pri otvaranju projekta (banner "Do you want to install the recommended extensions?"); kritičan za onboarding novog developera koji ne mora pamti koje ekstenzije su potrebne.
  - **`.vscode/launch.json`** (opciono) — debug konfiguracija; agent može preporučiti za Node debug + Python debug, ali nije Required.

  **6 strukturalnih invarijanti:**

  1. **`.vscode/` direktorij postoji** (Required-WARN) — bez ovog, novi developer nema shared workspace settings; mora ručno konfigurisati formatOnSave / defaultFormatter / eslint setup.
  2. **`.vscode/settings.json` postoji + non-empty + valid JSON** (Required-WARN) — minimum recommendation: `editor.formatOnSave: true` + `editor.defaultFormatter` + monorepo-specifično polje (npr. `eslint.workingDirectories`).
  3. **`.vscode/extensions.json` postoji + non-empty + valid JSON sa `recommendations` array-om** (Required-WARN) — bez ovog, onboarding zahteva ručno traženje koje ekstenzije instalirati; recommendations array daje 1-click install banner.
  4. **`settings.json` ima `editor.formatOnSave`** (Optional-INFO) — common best practice za consistent format preko developera.
  5. **`settings.json` ima `editor.defaultFormatter`** (Optional-INFO) — konkretan formatter (Prettier / ESLint) umesto VSCode default.
  6. **`extensions.json` recommendations pokriva ključne tool-ove** (Optional-INFO) — `dbaeumer.vscode-eslint`, `esbenp.prettier-vscode`, `ms-azuretools.vscode-docker`, `ms-vscode.PowerShell`, `ms-python.python` ako monorepo ima Node + Docker + PS + Python (sve istovremeno za ovaj repo).

  **Per-fajl health check** — postojanje, non-empty, valid JSON parsing (uz strip line comments za JSONC), valid `recommendations` array. Ne validira semantiku ekstenzija (samo strukturu).

  **Tabela poređenja sa drugim DX/config audit slojevima**:

  | Audit | Talas | Sloj | Fokus |
  |-------|-------|------|-------|
  | `check-repo-meta-files-presence.ps1` | 95 | Root meta — OSS / GitHub UI | LICENSE, SECURITY.md, .editorconfig (cross-editor), CODE_OF_CONDUCT, CHANGELOG |
  | `check-github-meta-files-presence.ps1` | 97 | `.github/` — GitHub automation | dependabot.yml, workflows/, PULL_REQUEST_TEMPLATE.md, CODEOWNERS |
  | `check-vscode-settings-presence.ps1` (ovaj) | 104 | `.vscode/` — VSCode/Cursor IDE | settings.json (formatOnSave, defaultFormatter, monorepo-specifično), extensions.json recommendations |

  **Za vlasnik-orijentaciju**: ako paket ima 3+ developera, shared `.vscode/` je high-ROI (1 PR koji setup-uje za sve buduće developere). Ako je paket 1-developer projekat, `.vscode/` je opciono (developer ima personal user settings).

  **Cross-check sa Talas 92 (`.gitignore`)** — `.vscode/` ne sme biti gitignored ako je shared workspace; common antipattern u boilerplate-ovima koji ignorišu ceo `.vscode/` umesto samo `.vscode/.history` ili `.vscode/launch.json` (per-developer debug ports).

  Read-only audit: ne menja fajlove. **Nije** deo CI mirror-a (`verify-monorepo.ps1` job **`python`** / required check **`Python (Doslednost dok + pytest)`** — `docs/GIT-BRANCH-PROTECTION.md`). Dopuna pre-PR pregleda; smoke (HTTP) i bundled `npm run smoke:all`: `scripts/smoke-stack.ps1` + `atina-platform/atina/docs/operations/release-gate-checklist.md` (*Local notes — Smoke tests*).

.PARAMETER FailOnWarn
  Vraća exit 1 ako bilo koji od 6 strukturalnih invarijanti prijavi WARN. Bez ove opcije, uvek vraća 0 (skripta je informativna).

.PARAMETER MaxOutput
  Maksimalan broj redova u Detalji sekciji. Default 200.

.PARAMETER VsCodeDir
  Putanja do `.vscode/` direktorijuma. Default `.vscode` (root). Parametrizovan radi testiranja.

.EXAMPLE
  .\scripts\check-vscode-settings-presence.ps1
  # Default: skenira root `.vscode/`, prijavljuje WARN/INFO nalaze, exit 0 uvek.

.EXAMPLE
  .\scripts\check-vscode-settings-presence.ps1 -FailOnWarn
  # Strogi rezim: exit 1 ako bilo koji invariant fail-uje.

.EXAMPLE
  .\scripts\check-vscode-settings-presence.ps1 -VsCodeDir 'apps/omnigroup-web/.vscode'
  # Custom subset za testiranje paket-level `.vscode/` direktorijuma.

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 104 = ovaj skript; ukupno 39 koraka Talas 65-192).
  Pun verify (CI mirror): `scripts/verify-monorepo.ps1` (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — `docs/GIT-BRANCH-PROTECTION.md`; pun mirror uključuje `apps/omnigroup-web` build osim sa `-SkipOmnigroupWeb`).
  Smoke (HTTP) i bundled `npm run smoke:all`: `scripts/smoke-stack.ps1` + `atina-platform/atina/docs/operations/release-gate-checklist.md` (*Local notes — Smoke tests*).
  Vlasnik dashboard: `docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md`.
  Vlasnik akcije konsolidovane: `docs/OWNER-ACTION-CHECKLIST.md` (Talas 102, P0/P1/P2/P3 prioritetizacija svih 12 realnih WARN signala posle Talas 103 P1-G).
  Monorepo evidencija (indeks + dry-run): `docs/EVIDENCE-INDEX.md` i `docs/NIVO-1-DRYRUN-LOG.md`.
#>
#Requires -Version 5.1

[CmdletBinding()]
param(
  [switch]$FailOnWarn,
  [int]$MaxOutput = 200,
  [string]$VsCodeDir = '.vscode'
)

$ErrorActionPreference = 'Stop'

Write-Host "== check-vscode-settings-presence.ps1 - .vscode/ IDE konfiguracija (Talas 104) ==" -ForegroundColor Cyan
Write-Host "   FailOnWarn: $FailOnWarn"
Write-Host "   VsCodeDir: $VsCodeDir"
Write-Host ""

# --- Helper: tolerantan JSON parsing (strip line comments) ---

function ConvertFrom-JsonTolerant {
  param([string]$Raw)
  if (-not $Raw) { return $null }
  # Strip JSONC line comments (// ...) preserving JSON strings - simple heuristic
  $stripped = ($Raw -split "`r?`n" | ForEach-Object {
    $line = $_
    if ($line -match '^\s*//') { return '' }
    return $line
  }) -join "`n"
  try {
    return $stripped | ConvertFrom-Json
  } catch {
    return $null
  }
}

# --- Glavna analiza ---

$result = [pscustomobject]@{
  VsCodeDir          = $VsCodeDir
  HasVsCodeDir       = $false
  HasSettingsJson    = $false
  HasExtensionsJson  = $false
  HasLaunchJson      = $false
  SettingsValid      = $false
  ExtensionsValid    = $false
  HasFormatOnSave    = $false
  HasDefaultFormatter= $false
  HasEslintWorkdirs  = $false
  RecommendationsCount = 0
  HasEslintRec       = $false
  HasPrettierRec     = $false
  HasDockerRec       = $false
  HasPowerShellRec   = $false
  HasPythonRec       = $false
}

if (Test-Path $VsCodeDir -PathType Container) {
  $result.HasVsCodeDir = $true
}

$settingsPath = Join-Path $VsCodeDir 'settings.json'
$extensionsPath = Join-Path $VsCodeDir 'extensions.json'
$launchPath = Join-Path $VsCodeDir 'launch.json'

# settings.json
if (Test-Path $settingsPath -PathType Leaf) {
  $result.HasSettingsJson = $true
  $raw = Get-Content $settingsPath -Raw -Encoding UTF8
  $obj = ConvertFrom-JsonTolerant $raw
  if ($obj) {
    $result.SettingsValid = $true
    $names = @($obj.PSObject.Properties | ForEach-Object { $_.Name })
    if ($names -contains 'editor.formatOnSave') { $result.HasFormatOnSave = $true }
    if ($names -contains 'editor.defaultFormatter') { $result.HasDefaultFormatter = $true }
    if ($names -contains 'eslint.workingDirectories') { $result.HasEslintWorkdirs = $true }
  }
}

# extensions.json
if (Test-Path $extensionsPath -PathType Leaf) {
  $result.HasExtensionsJson = $true
  $raw = Get-Content $extensionsPath -Raw -Encoding UTF8
  $obj = ConvertFrom-JsonTolerant $raw
  if ($obj -and $obj.recommendations) {
    $result.ExtensionsValid = $true
    $recs = @($obj.recommendations)
    $result.RecommendationsCount = $recs.Count
    foreach ($r in $recs) {
      $rl = "$r".ToLower()
      if ($rl -like '*dbaeumer.vscode-eslint*') { $result.HasEslintRec = $true }
      if ($rl -like '*esbenp.prettier-vscode*') { $result.HasPrettierRec = $true }
      if ($rl -like '*ms-azuretools.vscode-docker*') { $result.HasDockerRec = $true }
      if ($rl -like '*ms-vscode.powershell*') { $result.HasPowerShellRec = $true }
      if ($rl -like '*ms-python.python*') { $result.HasPythonRec = $true }
    }
  }
}

# launch.json (info only)
if (Test-Path $launchPath -PathType Leaf) {
  $result.HasLaunchJson = $true
}

# --- Findings ---

$findings = [System.Collections.Generic.List[pscustomobject]]::new()

# Invariant 1: .vscode/ postoji (Required-WARN)
if (-not $result.HasVsCodeDir) {
  $findings.Add([pscustomobject]@{
    Severity = 'WARN'
    Code     = 'NO-VSCODE-DIR'
    Message  = ".vscode/ direktorij ne postoji - novi developer nema shared workspace settings (formatOnSave, defaultFormatter, eslint.workingDirectories za monorepo)"
  }) | Out-Null
} else {
  # Invariant 2: settings.json (Required-WARN)
  if (-not $result.HasSettingsJson) {
    $findings.Add([pscustomobject]@{
      Severity = 'WARN'
      Code     = 'NO-SETTINGS-JSON'
      Message  = "$VsCodeDir/settings.json ne postoji - bez workspace settings, novi developer mora rucno konfigurisati formatOnSave / defaultFormatter / eslint setup"
    }) | Out-Null
  } elseif (-not $result.SettingsValid) {
    $findings.Add([pscustomobject]@{
      Severity = 'WARN'
      Code     = 'INVALID-SETTINGS-JSON'
      Message  = "$VsCodeDir/settings.json postoji ali nije valid JSON - VSCode/Cursor ce ignorisati settings"
    }) | Out-Null
  }

  # Invariant 3: extensions.json sa recommendations (Required-WARN)
  if (-not $result.HasExtensionsJson) {
    $findings.Add([pscustomobject]@{
      Severity = 'WARN'
      Code     = 'NO-EXTENSIONS-JSON'
      Message  = "$VsCodeDir/extensions.json ne postoji - bez recommendations array-a, onboarding zahteva rucno trazenje ekstenzija"
    }) | Out-Null
  } elseif (-not $result.ExtensionsValid) {
    $findings.Add([pscustomobject]@{
      Severity = 'WARN'
      Code     = 'INVALID-EXTENSIONS-JSON'
      Message  = "$VsCodeDir/extensions.json postoji ali nije valid JSON ili nema recommendations array"
    }) | Out-Null
  }

  # Invariant 4: formatOnSave (Optional-INFO)
  if ($result.SettingsValid -and -not $result.HasFormatOnSave) {
    $findings.Add([pscustomobject]@{
      Severity = 'INFO'
      Code     = 'NO-FORMAT-ON-SAVE'
      Message  = "settings.json bez 'editor.formatOnSave' - razmotri true za consistent format preko developera"
    }) | Out-Null
  }

  # Invariant 5: defaultFormatter (Optional-INFO)
  if ($result.SettingsValid -and -not $result.HasDefaultFormatter) {
    $findings.Add([pscustomobject]@{
      Severity = 'INFO'
      Code     = 'NO-DEFAULT-FORMATTER'
      Message  = "settings.json bez 'editor.defaultFormatter' - razmotri 'esbenp.prettier-vscode' ili 'dbaeumer.vscode-eslint'"
    }) | Out-Null
  }

  # Invariant 6: extensions.json recommendations pokriva kljucne tool-ove (Optional-INFO)
  if ($result.ExtensionsValid) {
    $missingRecs = @()
    if (-not $result.HasEslintRec)     { $missingRecs += 'dbaeumer.vscode-eslint' }
    if (-not $result.HasPrettierRec)   { $missingRecs += 'esbenp.prettier-vscode' }
    if (-not $result.HasDockerRec)     { $missingRecs += 'ms-azuretools.vscode-docker' }
    if (-not $result.HasPowerShellRec) { $missingRecs += 'ms-vscode.PowerShell' }
    if (-not $result.HasPythonRec)     { $missingRecs += 'ms-python.python' }

    if ($missingRecs.Count -gt 0) {
      $findings.Add([pscustomobject]@{
        Severity = 'INFO'
        Code     = 'INCOMPLETE-RECOMMENDATIONS'
        Message  = "extensions.json recommendations ne sadrzi: $($missingRecs -join ', ') (monorepo ima Node + Docker + PS + Python)"
      }) | Out-Null
    }
  }
}

# --- Sumarna tabela ---

Write-Host ""
Write-Host "== .vscode/ analiza ==" -ForegroundColor Yellow
$summaryRow = [pscustomobject]@{
  'VsCodeDir'         = if ($result.HasVsCodeDir) { 'Yes' } else { '-' }
  'settings.json'     = if ($result.HasSettingsJson) { if ($result.SettingsValid) { 'Valid' } else { 'Invalid' } } else { '-' }
  'extensions.json'   = if ($result.HasExtensionsJson) { if ($result.ExtensionsValid) { "$($result.RecommendationsCount) recs" } else { 'Invalid' } } else { '-' }
  'launch.json'       = if ($result.HasLaunchJson) { 'Yes' } else { '-' }
  'FormatOnSave'      = if ($result.HasFormatOnSave) { 'Yes' } else { '-' }
  'DefaultFormatter'  = if ($result.HasDefaultFormatter) { 'Yes' } else { '-' }
  'ESLintWorkdirs'    = if ($result.HasEslintWorkdirs) { 'Yes' } else { '-' }
}
$summaryRow | Format-Table -AutoSize | Out-String | Write-Host

if ($result.ExtensionsValid -and $result.RecommendationsCount -gt 0) {
  Write-Host "Recommendation coverage:" -ForegroundColor Yellow
  $covRow = [pscustomobject]@{
    'ESLint'       = if ($result.HasEslintRec) { 'Yes' } else { '-' }
    'Prettier'     = if ($result.HasPrettierRec) { 'Yes' } else { '-' }
    'Docker'       = if ($result.HasDockerRec) { 'Yes' } else { '-' }
    'PowerShell'   = if ($result.HasPowerShellRec) { 'Yes' } else { '-' }
    'Python'       = if ($result.HasPythonRec) { 'Yes' } else { '-' }
  }
  $covRow | Format-Table -AutoSize | Out-String | Write-Host
}

# --- Findings output ---

$warnFindings = @($findings | Where-Object { $_.Severity -eq 'WARN' })
$infoFindings = @($findings | Where-Object { $_.Severity -eq 'INFO' })

Write-Host ""
Write-Host "== Findings ==" -ForegroundColor Yellow
Write-Host "  WARN (DX-rizik):          $($warnFindings.Count)"
Write-Host "  INFO (best practice):     $($infoFindings.Count)"
Write-Host ""

if ($findings.Count -gt 0) {
  Write-Host "== Detalji ==" -ForegroundColor Yellow
  $shown = 0
  foreach ($f in $findings) {
    if ($shown -ge $MaxOutput) { Write-Host "  ... (presečeno na $MaxOutput, koristite -MaxOutput za više)"; break }
    $color = if ($f.Severity -eq 'WARN') { 'Red' } else { 'DarkGray' }
    Write-Host ("  [{0,-4}] {1,-32} {2}" -f $f.Severity, $f.Code, $f.Message) -ForegroundColor $color
    $shown++
  }
}

Write-Host ""
Write-Host "Napomene:" -ForegroundColor DarkGray
Write-Host "  - Talas 104 otvara novi 11. domen (Developer Experience / IDE konfiguracija)."
Write-Host "  - Komplementaran sa Talas 95 (root meta sloj sa .editorconfig) i Talas 92 (.gitignore koji ne sme ignorisati .vscode/)."
Write-Host "  - run-all-audits.ps1: 39 koraka (37 read-only + TODO + npm); single entry point."
Write-Host "  - Vlasnik akcije konsolidovane: docs/OWNER-ACTION-CHECKLIST.md (Talas 102, P0/P1/P2/P3 prioritetizacija)."

# --- Exit code ---

if ($FailOnWarn -and $warnFindings.Count -gt 0) {
  Write-Host ""
  Write-Host "FAIL: $($warnFindings.Count) WARN nalaza pronađeno (FailOnWarn rezim)" -ForegroundColor Red
  exit 1
}

exit 0
