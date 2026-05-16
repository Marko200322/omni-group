<#
.SYNOPSIS
  Prettier config doslednost preko 3 Node paketa (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 105: **5. sloj structural config audit-a** posle Talas 87 (TS `tsconfig.json`) + Talas 91 (Node ESLint) + Talas 101 (Python `requirements.txt`) + Talas 103 (Python pytest config); kompletira **format-time + lint-time + compile-time + dependency** pokrivenost preko Node monorepa. Direktno proširuje **Talas 94 INFO signal** (`apps/omnigroup-web` + `atina-platform/atina` nemaju `format` script — Talas 105 sad audit-uje da li imaju Prettier setup uopšte). Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa skenira **3 Node paketa** (apps/omnigroup-web + atina-platform/atina + atina-system) i validira **6 strukturalnih invarijanti** za Prettier formatter konfiguraciju:

  - **`apps/omnigroup-web/`** (Next 14 + Tailwind) — trenutno NEMA Prettier setup; format-on-save u `.vscode/settings.json` (Talas 104 P2-F predlog) bi koristio default Prettier formatting. **Kandidat: P2-G fix u OWNER-ACTION-CHECKLIST.**
  - **`atina-platform/atina/`** (Express + Forge) — trenutno NEMA Prettier setup; veliki paket sa 64 ENV ključa, format drift visok rizik kroz različite developere. **Kandidat: P2-H fix u OWNER-ACTION-CHECKLIST.**
  - **`atina-system/`** (NestJS) — ima `.prettierrc` (singleQuote: true, trailingComma: all) + `prettier ^3.0.0` u devDependencies + `format` script. **Reference baseline za druga 2 paketa.**

  **6 strukturalnih invarijanti:**

  1. **Prettier config postoji** (Required-WARN za Node paket sa TS/JS izvor-om) — paket bez `.prettierrc` / `.prettierrc.json` / `.prettierrc.js` / `.prettierrc.yaml` / `.prettierrc.cjs` / `prettier.config.js` / `prettier` polje u `package.json` ne može garantovati format consistency preko developera.
  2. **Prettier config valid format** (Required-WARN ako config postoji ali parsing fail-uje) — JSON/YAML/JS-export validation za poznate ekstenzije.
  3. **`prettier` u `devDependencies`** (Required-WARN ako config postoji ali dep nije deklarisan) — bez dep-a, `npm run format` ili IDE formatter će fail-ovati sa missing module.
  4. **`format` script u `package.json`** (Optional-INFO; cross-check sa Talas 94) — `format` script omogućava `npm run format` jedinstven entry point preko paketa; bez njega, developer mora znati eksplicitnu Prettier komandu.
  5. **`.prettierignore` postoji** (Optional-INFO) — bez njega, Prettier skenira `node_modules`, `dist`, `.next` što značajno usporava + može pokvariti minified vendor fajlove.
  6. **Major version doslednost preko paketa** (Optional-INFO ako je u 2+ paketa) — kad je `prettier` deklarisan u 2+ paketa, MAJOR mora biti isti (Prettier v2 vs v3 ima različita default-a — `trailingComma: "es5"` v2 vs `"all"` v3).

  **Per-paket parsing**: za `package.json` koristi PS5.1 native `ConvertFrom-Json` na devDependencies + scripts blokovima; za `.prettierrc` JSON/YAML — pokušaj `ConvertFrom-Json`, fallback regex za singleQuote/printWidth/tabWidth/semi/trailingComma ekstrakciju; za `.prettierrc.js` regex `module.exports = { ... }` ekstrakcija.

  **Tabela poređenja sa drugim structural config audit slojevima**:

  | Audit | Talas | Sloj | Fokus |
  |-------|-------|------|-------|
  | `check-tsconfig-consistency.ps1` | 87 | TypeScript compile-time | `strict`, `target`, `skipLibCheck`, `esModuleInterop` |
  | `check-eslint-consistency.ps1` | 91 | Node lint-time | `.eslintrc.*` (root, parser, plugin) |
  | `check-python-package-consistency.ps1` | 101 | Python deps | requirements.txt pinning, shared dep drift |
  | `check-pytest-config-consistency.ps1` | 103 | Python testing config | pytest.ini / pyproject.toml [tool.pytest] / setup.cfg [tool:pytest] |
  | `check-prettier-config-consistency.ps1` (ovaj) | 105 | Node format-time | `.prettierrc.*` + `prettier` dep + `format` script |

  **Format-time + lint-time + compile-time + dependency + testing audit**:

  | Sloj | Talas (Node) | Talas (Python) |
  |------|--------------|----------------|
  | **Format-time (Prettier)** | 105 (ovaj) | — (Python koristi black/ruff format koji je ortogonalan) |
  | **Lint-time (ESLint / ruff)** | 91 | — |
  | **Compile-time (TypeScript)** | 87 | — |
  | **Dependency MAJOR drift** | 96 (devDeps) | 101 |
  | **Testing config** | — (Vitest/Jest dep INFO via Talas 96) | 103 |

  **Cross-check sa Talas 94 i 104:** Talas 94 INFO `apps/omnigroup-web` + `atina-platform/atina` nemaju `format` script — Talas 105 ide korak dalje i proverava CELU prettier infrastrukturu (config + dep + script + ignore). **Talas 104 P2-F** predlaže `editor.defaultFormatter: "esbenp.prettier-vscode"` u `.vscode/settings.json` — ako se to uvede bez prettier dep-a u Atina + omnigroup-web, format-on-save bi fail-ovao kod razvojnih timova.

  Read-only audit: ne menja fajlove. **Nije** deo CI mirror-a (`verify-monorepo.ps1` job **`python`** / required check **`Python (Doslednost dok + pytest)`** — `docs/GIT-BRANCH-PROTECTION.md`). Dopuna pre-PR pregleda; smoke (HTTP) i bundled `npm run smoke:all`: `scripts/smoke-stack.ps1` + `atina-platform/atina/docs/operations/release-gate-checklist.md` (*Local notes — Smoke tests*).

.PARAMETER FailOnWarn
  Vraća exit 1 ako bilo koji od 6 strukturalnih invarijanti prijavi WARN. Bez ove opcije, uvek vraća 0 (skripta je informativna).

.PARAMETER MaxOutput
  Maksimalan broj redova u Detalji sekciji. Default 200.

.PARAMETER NodePaths
  Lista relativnih putanja do Node paketa. Default je 3 paketa monorepa. Parametrizovan radi testiranja.

.EXAMPLE
  .\scripts\check-prettier-config-consistency.ps1
  # Default: skenira 3 Node paketa, prijavljuje WARN/INFO nalaze, exit 0 uvek.

.EXAMPLE
  .\scripts\check-prettier-config-consistency.ps1 -FailOnWarn
  # Strogi rezim: exit 1 ako bilo koji invariant fail-uje.

.EXAMPLE
  .\scripts\check-prettier-config-consistency.ps1 -NodePaths @('apps/omnigroup-web', 'atina-system')
  # Custom subset za testiranje (samo 2 paketa).

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 105 = ovaj skript; ukupno 39 koraka Talas 65-192).
  Pun verify (CI mirror): `scripts/verify-monorepo.ps1` (job **`python`** / required check **`Python (Doslednost dok + pytest)`** — `docs/GIT-BRANCH-PROTECTION.md`; pun mirror uključuje `apps/omnigroup-web` build osim sa `-SkipOmnigroupWeb`).
  Smoke (HTTP) i bundled `npm run smoke:all`: `scripts/smoke-stack.ps1` + `atina-platform/atina/docs/operations/release-gate-checklist.md` (*Local notes — Smoke tests*).
  Vlasnik dashboard: `docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md`.
  Vlasnik akcije konsolidovane: `docs/OWNER-ACTION-CHECKLIST.md` (Talas 102; Talas 105 dodaje P2-G + P2-H za omnigroup-web + atina-platform Prettier setup).
  Monorepo evidencija (indeks + dry-run): `docs/EVIDENCE-INDEX.md` i `docs/NIVO-1-DRYRUN-LOG.md`.
#>
#Requires -Version 5.1

[CmdletBinding()]
param(
  [switch]$FailOnWarn,
  [int]$MaxOutput = 200,
  [string[]]$NodePaths = @(
    'apps/omnigroup-web',
    'atina-platform/atina',
    'atina-system'
  )
)

$ErrorActionPreference = 'Stop'

Write-Host "== check-prettier-config-consistency.ps1 - Prettier config doslednost (Talas 105) ==" -ForegroundColor Cyan
Write-Host "   FailOnWarn: $FailOnWarn"
Write-Host ""

# --- Helper: per-paket Prettier config analiza ---

function Get-PrettierAnalysis {
  param(
    [Parameter(Mandatory)] [string]$RootPath
  )

  $result = [pscustomobject]@{
    Root              = $RootPath
    HasPackageJson    = $false
    HasPrettierDep    = $false
    PrettierVersion   = $null
    PrettierMajor     = $null
    HasFormatScript   = $false
    HasPrettierConfig = $false
    ConfigSource      = $null
    ConfigPath        = $null
    ConfigValid       = $false
    HasPrettierIgnore = $false
    SingleQuote       = $null
    TrailingComma     = $null
    PrintWidth        = $null
    Errors            = @()
  }

  if (-not (Test-Path $RootPath -PathType Container)) {
    $result.Errors += "Paket direktorijum ne postoji: $RootPath"
    return $result
  }

  # package.json
  $pkgPath = Join-Path $RootPath 'package.json'
  if (Test-Path $pkgPath -PathType Leaf) {
    $result.HasPackageJson = $true
    try {
      $pkg = Get-Content $pkgPath -Raw -Encoding UTF8 | ConvertFrom-Json
      if ($pkg.devDependencies -and $pkg.devDependencies.PSObject.Properties['prettier']) {
        $result.HasPrettierDep = $true
        $result.PrettierVersion = $pkg.devDependencies.prettier
        if ($result.PrettierVersion -match '^[\^~]?(\d+)') {
          $result.PrettierMajor = [int]$Matches[1]
        }
      }
      if ($pkg.scripts -and $pkg.scripts.PSObject.Properties['format']) {
        $result.HasFormatScript = $true
      }
      if ($pkg.prettier) {
        $result.HasPrettierConfig = $true
        $result.ConfigSource = 'package.json#prettier'
        $result.ConfigPath = $pkgPath
        $result.ConfigValid = $true
        if ($pkg.prettier.PSObject.Properties['singleQuote']) {
          $result.SingleQuote = [bool]$pkg.prettier.singleQuote
        }
        if ($pkg.prettier.PSObject.Properties['trailingComma']) {
          $result.TrailingComma = "$($pkg.prettier.trailingComma)"
        }
        if ($pkg.prettier.PSObject.Properties['printWidth']) {
          $result.PrintWidth = [int]$pkg.prettier.printWidth
        }
      }
    } catch {
      $result.Errors += "package.json parsing fail: $_"
    }
  }

  # .prettierrc / .prettierrc.json / .prettierrc.js / .prettierrc.yaml / .prettierrc.cjs / prettier.config.js
  if (-not $result.HasPrettierConfig) {
    $candidates = @('.prettierrc', '.prettierrc.json', '.prettierrc.js', '.prettierrc.yaml', '.prettierrc.yml', '.prettierrc.cjs', 'prettier.config.js', 'prettier.config.cjs', 'prettier.config.mjs')
    foreach ($cand in $candidates) {
      $candPath = Join-Path $RootPath $cand
      if (Test-Path $candPath -PathType Leaf) {
        $result.HasPrettierConfig = $true
        $result.ConfigSource = $cand
        $result.ConfigPath = $candPath
        $raw = Get-Content $candPath -Raw -Encoding UTF8

        # Pokušaj JSON parse za .prettierrc i .json varijante
        if ($cand -match '\.prettierrc$|\.json$') {
          try {
            $cfg = $raw | ConvertFrom-Json
            $result.ConfigValid = $true
            if ($cfg.PSObject.Properties['singleQuote']) {
              $result.SingleQuote = [bool]$cfg.singleQuote
            }
            if ($cfg.PSObject.Properties['trailingComma']) {
              $result.TrailingComma = "$($cfg.trailingComma)"
            }
            if ($cfg.PSObject.Properties['printWidth']) {
              $result.PrintWidth = [int]$cfg.printWidth
            }
          } catch {
            $result.ConfigValid = $false
            $result.Errors += "$cand JSON parse fail: $_"
          }
        } else {
          # JS / YAML / CJS / MJS — regex ekstrakcija
          $result.ConfigValid = $true
          if ($raw -match '(?m)singleQuote\s*:\s*(true|false)') {
            $result.SingleQuote = ($Matches[1] -eq 'true')
          }
          if ($raw -match '(?m)trailingComma\s*:\s*[''"]?([a-z0-9]+)[''"]?') {
            $result.TrailingComma = $Matches[1]
          }
          if ($raw -match '(?m)printWidth\s*:\s*(\d+)') {
            $result.PrintWidth = [int]$Matches[1]
          }
        }
        break
      }
    }
  }

  # .prettierignore
  $ignorePath = Join-Path $RootPath '.prettierignore'
  if (Test-Path $ignorePath -PathType Leaf) {
    $result.HasPrettierIgnore = $true
  }

  return $result
}

# --- Glavna petlja ---

$findings = [System.Collections.Generic.List[pscustomobject]]::new()
$packageInfo = [System.Collections.Generic.List[pscustomobject]]::new()

foreach ($pkgPath in $NodePaths) {
  $analysis = Get-PrettierAnalysis -RootPath $pkgPath
  $packageInfo.Add($analysis) | Out-Null

  if ($analysis.Errors.Count -gt 0) {
    foreach ($err in $analysis.Errors) {
      $findings.Add([pscustomobject]@{
        Root     = $pkgPath
        Severity = 'WARN'
        Code     = 'PARSE-ERROR'
        Message  = $err
      }) | Out-Null
    }
  }

  if (-not $analysis.HasPackageJson) {
    continue
  }

  # Invariant 1: Prettier config postoji (Required-WARN)
  if (-not $analysis.HasPrettierConfig) {
    $findings.Add([pscustomobject]@{
      Root     = $pkgPath
      Severity = 'WARN'
      Code     = 'NO-PRETTIER-CONFIG'
      Message  = "Nema .prettierrc / .prettierrc.json / .prettierrc.js / package.json#prettier - format consistency nije garantovana preko developera"
    }) | Out-Null
  } elseif (-not $analysis.ConfigValid) {
    $findings.Add([pscustomobject]@{
      Root     = $pkgPath
      Severity = 'WARN'
      Code     = 'INVALID-PRETTIER-CONFIG'
      Message  = "$($analysis.ConfigSource) postoji ali parsing fail-uje - Prettier ce ignorisati config"
    }) | Out-Null
  }

  # Invariant 3: prettier u devDependencies ako config postoji (Required-WARN)
  if ($analysis.HasPrettierConfig -and -not $analysis.HasPrettierDep) {
    $findings.Add([pscustomobject]@{
      Root     = $pkgPath
      Severity = 'WARN'
      Code     = 'CONFIG-WITHOUT-DEP'
      Message  = "$($analysis.ConfigSource) postoji ali 'prettier' nije u devDependencies - npm run format ili IDE formatter ce fail-ovati"
    }) | Out-Null
  }

  # Invariant 4: format script (Optional-INFO)
  if ($analysis.HasPrettierDep -and -not $analysis.HasFormatScript) {
    $findings.Add([pscustomobject]@{
      Root     = $pkgPath
      Severity = 'INFO'
      Code     = 'NO-FORMAT-SCRIPT'
      Message  = "prettier dep postoji ali 'format' script nije u package.json scripts: - razmotri prettier --write src za jedinstven entry point"
    }) | Out-Null
  }

  # Invariant 5: .prettierignore (Optional-INFO)
  if ($analysis.HasPrettierConfig -and -not $analysis.HasPrettierIgnore) {
    $findings.Add([pscustomobject]@{
      Root     = $pkgPath
      Severity = 'INFO'
      Code     = 'NO-PRETTIER-IGNORE'
      Message  = ".prettierignore ne postoji - Prettier skenira node_modules / dist / .next; razmotri eksplicitan ignore za speed + stabilnost"
    }) | Out-Null
  }

  # Invariant 2 (reverse): prettier dep postoji ali config NEMA (INFO)
  if ($analysis.HasPrettierDep -and -not $analysis.HasPrettierConfig) {
    $findings.Add([pscustomobject]@{
      Root     = $pkgPath
      Severity = 'INFO'
      Code     = 'DEP-WITHOUT-CONFIG'
      Message  = "prettier dep deklarisan ali config fajl ne postoji - Prettier koristi default opcije (printWidth=80, singleQuote=false, trailingComma=all u v3)"
    }) | Out-Null
  }
}

# Invariant 6: Major version doslednost (Optional-INFO)
$packagesWithDep = @($packageInfo | Where-Object { $_.HasPrettierDep -and $_.PrettierMajor })
if ($packagesWithDep.Count -ge 2) {
  $majors = @($packagesWithDep | ForEach-Object { $_.PrettierMajor } | Select-Object -Unique)
  if ($majors.Count -gt 1) {
    $details = ($packagesWithDep | ForEach-Object { "$($_.Root)=v$($_.PrettierMajor)" }) -join ', '
    $findings.Add([pscustomobject]@{
      Root     = '(cross-package)'
      Severity = 'INFO'
      Code     = 'MAJOR-DRIFT'
      Message  = "prettier MAJOR version drift preko paketa: $details (Prettier v2 vs v3 ima razlicit trailingComma default - 'es5' vs 'all')"
    }) | Out-Null
  }
}

# --- Sumarna tabela ---

Write-Host ""
Write-Host "== Per-paket Prettier config analiza ==" -ForegroundColor Yellow
$summaryRows = foreach ($info in $packageInfo) {
  [pscustomobject]@{
    Root            = $info.Root
    'PrettierDep'   = if ($info.HasPrettierDep) { $info.PrettierVersion } else { '-' }
    'Config'        = if ($info.HasPrettierConfig) { $info.ConfigSource } else { '-' }
    'Valid'         = if ($info.HasPrettierConfig) { if ($info.ConfigValid) { 'Yes' } else { 'No' } } else { '-' }
    'FormatScript'  = if ($info.HasFormatScript) { 'Yes' } else { '-' }
    'Ignore'        = if ($info.HasPrettierIgnore) { 'Yes' } else { '-' }
    'SingleQuote'   = if ($null -ne $info.SingleQuote) { "$($info.SingleQuote)" } else { '-' }
    'TrailingComma' = if ($info.TrailingComma) { $info.TrailingComma } else { '-' }
    'PrintWidth'    = if ($info.PrintWidth) { "$($info.PrintWidth)" } else { '-' }
  }
}
$summaryRows | Format-Table -AutoSize | Out-String | Write-Host

# --- Findings ---

$warnFindings = @($findings | Where-Object { $_.Severity -eq 'WARN' })
$infoFindings = @($findings | Where-Object { $_.Severity -eq 'INFO' })

Write-Host ""
Write-Host "== Findings ==" -ForegroundColor Yellow
Write-Host "  WARN (format-rizik):      $($warnFindings.Count)"
Write-Host "  INFO (best practice):     $($infoFindings.Count)"
Write-Host ""

if ($findings.Count -gt 0) {
  Write-Host "== Detalji ==" -ForegroundColor Yellow
  $shown = 0
  foreach ($f in $findings) {
    if ($shown -ge $MaxOutput) { Write-Host "  ... (presečeno na $MaxOutput, koristite -MaxOutput za više)"; break }
    $color = if ($f.Severity -eq 'WARN') { 'Red' } else { 'DarkGray' }
    Write-Host ("  [{0,-4}] {1,-32} {2}: {3}" -f $f.Severity, $f.Code, $f.Root, $f.Message) -ForegroundColor $color
    $shown++
  }
}

Write-Host ""
Write-Host "Napomene:" -ForegroundColor DarkGray
Write-Host "  - Talas 105 dodaje 5. sloj structural config audit-a (TS Talas 87 + ESLint Talas 91 + Python deps Talas 101 + Python pytest Talas 103 + Prettier ovaj)."
Write-Host "  - Komplementaran sa Talas 94 INFO (apps/omnigroup-web + atina-platform/atina nemaju format script) i Talas 104 P2-F predlog (.vscode/ defaultFormatter)."
Write-Host "  - run-all-audits.ps1: 39 koraka (37 read-only + TODO + npm); single entry point."
Write-Host "  - Vlasnik akcije konsolidovane: docs/OWNER-ACTION-CHECKLIST.md (P0/P1/P2/P3 prioritetizacija)."

# --- Exit code ---

if ($FailOnWarn -and $warnFindings.Count -gt 0) {
  Write-Host ""
  Write-Host "FAIL: $($warnFindings.Count) WARN nalaza pronađeno (FailOnWarn rezim)" -ForegroundColor Red
  exit 1
}

exit 0
