<#
.SYNOPSIS
  `.env.example` šablon presence + zdravlje preko 3 Node paketa (informativan, opciono pre-PR sa `-FailOnWarn`). Talas 93: security follow-up Talas 92 (`.gitignore` audit), nastavlja security domen u **secrets-template sloj**. Hub: `scripts/README.md`.

.DESCRIPTION
  Iz korena repoa parsira 3 paket-level `.env.example` fajla (`apps/omnigroup-web/.env.example` Next, `atina-platform/atina/.env.example` Node lib, `atina-system/.env.example` Nest) i validira **5 strukturalnih invarijanti**:

  1. **Postojanje `.env.example`** (WARN): paket sa `.env` reference-om u izvornom kodu mora imati `.env.example` šablon — bez ovog, novi developer ne može lokalno startovati paket bez ručnog kopiranja secrets-a.
  2. **Non-empty + bar 3 ne-komentar linija** (WARN): šablon ne sme biti prazan ili samo komentari — mora imati bar 3 stvarne `KEY=value` ili `KEY=` linije (Next app može legitimno imati 3-4; Node lib / Nest tipično 10+).
  3. **No real secrets** (WARN; **security regex**): šablon ne sme imati realne tajne. Skener traži česte secret patterns:
     - AWS access key: `AKIA[A-Z0-9]{16}`
     - AWS secret key (40 znakova base64): `=[A-Za-z0-9/+=]{40}\b` (samo ako linija nije komentar)
     - GitHub PAT: `ghp_[A-Za-z0-9]{36}`, `github_pat_[A-Za-z0-9_]{82}`
     - Stripe live key: `sk_live_[A-Za-z0-9]{24,}`
     - JWT token: `eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}`
     - Generic 32+ char hex: `=[a-f0-9]{32,}\b` (informativno; često hex hash)
  4. **Has placeholder patterns** (INFO): šablon treba imati eksplicitne placeholder-e (`change-me`, `your-`, `example`, `<...>`, `*`, `replace-with`) ili prazne vrednosti (`KEY=`) za required polja — daje signal developer-u šta treba popuniti.
  5. **Has helpful comments** (INFO): bar 3 `#` komentara koji opisuju polja — onboarding kvalitet.

  **Parsing strategija:**

  - `Get-Content -Encoding UTF8` čita sve linije.
  - Tokenizacija: trim whitespace, ignoriši prazne linije, klasifikuj `#` komentare odvojeno od `KEY=value` linija.
  - Validacija po invarijanti.

  Read-only audit: ne menja fajlove. **Nije** deo CI mirror-a (`verify-monorepo.ps1` job **`python`** / required check **`Python (Doslednost dok + pytest)`** — `docs/GIT-BRANCH-PROTECTION.md`) i ne menja njegov scope. Dopuna pre-PR pregleda; smoke (HTTP) i bundled `npm run smoke:all`: `scripts/smoke-stack.ps1` + `atina-platform/atina/docs/operations/release-gate-checklist.md` (*Local notes — Smoke tests*).

.PARAMETER FailOnWarn
  Vraća exit 1 ako bilo koji paket ima WARN nalaz (`.env.example` nedostaje / prazan / ima realne secrets). Bez ove opcije, uvek vraća 0 (skripta je informativna).

.PARAMETER MaxOutput
  Maksimalan broj redova u Detalji sekciji. Default 200.

.PARAMETER PackageRoots
  Lista relativnih putanja do `.env.example` fajlova koji se proveravaju. Default 3 paketa: `apps/omnigroup-web/.env.example`, `atina-platform/atina/.env.example`, `atina-system/.env.example`. Parametrizovan radi ekstenzibilnosti — ako se doda 4. Node paket sa `.env` reference-om, vlasnik može proširiti listu bez izmene koda.

.EXAMPLE
  .\scripts\check-env-example-presence.ps1
  # Default: skenira 3 .env.example fajla, prijavljuje WARN/INFO nalaze, exit 0 uvek.

.EXAMPLE
  .\scripts\check-env-example-presence.ps1 -FailOnWarn
  # Strogi rezim: exit 1 ako bilo koji paket ima WARN (nedostaje, prazan, ili sadrži real secrets).

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (Talas 93 = ovaj skript; ukupno 39 koraka Talas 65-192).
  Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md; pun mirror uključuje apps/omnigroup-web build osim sa -SkipOmnigroupWeb).
  Smoke (HTTP) + Atina bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).
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
  [string[]]$PackageRoots = @(
    'apps/omnigroup-web/.env.example',
    'atina-platform/atina/.env.example',
    'atina-system/.env.example'
  )
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

Write-Host '== check-env-example-presence.ps1 - .env.example presence + zdravlje preko 3 Node paketa (informativan) ==' -ForegroundColor Cyan
Write-Host ("   FailOnWarn: {0}" -f $FailOnWarn) -ForegroundColor DarkGray
Write-Host ("   PackageRoots ({0} fajla): {1}" -f $PackageRoots.Count, ($PackageRoots -join ', ')) -ForegroundColor DarkGray

# --- Helper: secret pattern lista ---
$secretPatterns = @(
  @{ Name = 'AWS-ACCESS-KEY'; Regex = 'AKIA[A-Z0-9]{16}' }
  @{ Name = 'GH-PAT-CLASSIC'; Regex = 'ghp_[A-Za-z0-9]{36}' }
  @{ Name = 'GH-PAT-FINE'; Regex = 'github_pat_[A-Za-z0-9_]{82}' }
  @{ Name = 'STRIPE-LIVE'; Regex = 'sk_live_[A-Za-z0-9]{24,}' }
  @{ Name = 'STRIPE-TEST'; Regex = 'sk_test_[A-Za-z0-9]{24,}' }
  @{ Name = 'JWT-TOKEN'; Regex = 'eyJ[A-Za-z0-9_\-]{20,}\.eyJ[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}' }
  @{ Name = 'GENERIC-HEX-32'; Regex = '=[a-f0-9]{32,}\s*$' }
)

# --- Helper: placeholder patterns ---
$placeholderPatterns = @('change-me', 'your-', 'example', '<', 'replace-with', 'TODO', 'XXX')

# --- Helper: parsiraj .env.example fajl ---
function Get-EnvExampleInfo {
  param(
    [string]$RelPath,
    [string]$AbsPath
  )
  $info = [pscustomobject]@{
    Package = $RelPath
    Exists = (Test-Path $AbsPath)
    LineCount = 0
    CommentCount = 0
    KeyCount = 0
    PlaceholderCount = 0
    SecretFindings = New-Object 'System.Collections.Generic.List[object]'
  }
  if (-not $info.Exists) { return $info }

  $lines = Get-Content -LiteralPath $AbsPath -Encoding UTF8
  $info.LineCount = $lines.Count
  $lineNo = 0
  foreach ($line in $lines) {
    $lineNo++
    $trim = $line.Trim()
    if ($trim -eq '') { continue }
    if ($trim.StartsWith('#')) {
      $info.CommentCount++
      continue
    }
    # KEY=value linija
    if ($trim -match '^[A-Za-z_][A-Za-z0-9_]*\s*=') {
      $info.KeyCount++
      # Placeholder check
      $valuePart = ($trim -split '=', 2)[1]
      if ($null -ne $valuePart) {
        $vp = $valuePart.Trim()
        if ($vp -eq '') {
          # Empty value je legitiman placeholder
          $info.PlaceholderCount++
        } else {
          foreach ($pp in $placeholderPatterns) {
            if ($vp.ToLowerInvariant().Contains($pp.ToLowerInvariant())) {
              $info.PlaceholderCount++
              break
            }
          }
        }
      }
      # Secret check
      foreach ($sp in $secretPatterns) {
        if ($trim -match $sp.Regex) {
          $info.SecretFindings.Add([pscustomobject]@{
            LineNo = $lineNo
            PatternName = $sp.Name
            Snippet = if ($trim.Length -gt 80) { $trim.Substring(0, 80) + '...' } else { $trim }
          }) | Out-Null
        }
      }
    }
  }
  return $info
}

# --- Skeniraj 3 paketa ---
$packages = New-Object 'System.Collections.Generic.List[object]'
$findings = New-Object 'System.Collections.Generic.List[object]'

foreach ($rel in $PackageRoots) {
  $abs = Join-Path $repoRoot $rel
  $info = Get-EnvExampleInfo -RelPath $rel -AbsPath $abs
  $packages.Add($info) | Out-Null
}

# --- Validacija + nalazi ---
foreach ($pkg in $packages) {
  # Inv 1: existence
  if (-not $pkg.Exists) {
    $findings.Add([pscustomobject]@{
      Package = $pkg.Package
      Severity = 'WARN'
      Code = 'MISSING-ENV-EXAMPLE'
      Detail = '.env.example fajl ne postoji - novi developer ne moze lokalno startovati paket'
    }) | Out-Null
    continue
  }

  # Inv 2: non-empty + bar 3 KEY=value linija (Next app moze legitimno imati 3-4)
  if ($pkg.KeyCount -lt 3) {
    $findings.Add([pscustomobject]@{
      Package = $pkg.Package
      Severity = 'WARN'
      Code = 'TOO-FEW-KEYS'
      Detail = ("Samo {0} KEY=value linija - bar 3 ocekivano za smislen sablon" -f $pkg.KeyCount)
    }) | Out-Null
  }

  # Inv 3: no real secrets (WARN)
  if ($pkg.SecretFindings.Count -gt 0) {
    foreach ($sec in $pkg.SecretFindings) {
      $findings.Add([pscustomobject]@{
        Package = $pkg.Package
        Severity = 'WARN'
        Code = ('REAL-SECRET-' + $sec.PatternName)
        Detail = ("Linija {0}: detektovan secret pattern '{1}' - .env.example NE sme imati realne secrets! ({2})" -f $sec.LineNo, $sec.PatternName, $sec.Snippet)
      }) | Out-Null
    }
  }

  # Inv 4: has placeholder patterns (INFO)
  if ($pkg.PlaceholderCount -eq 0 -and $pkg.KeyCount -gt 0) {
    $findings.Add([pscustomobject]@{
      Package = $pkg.Package
      Severity = 'INFO'
      Code = 'NO-PLACEHOLDERS'
      Detail = ("Nema eksplicitnih placeholder-a (change-me / your- / example / <...> / praznih vrednosti) u {0} KEY=value linija - signal developer-u sta treba popuniti je slabiji" -f $pkg.KeyCount)
    }) | Out-Null
  }

  # Inv 5: has helpful comments (INFO)
  if ($pkg.CommentCount -lt 3) {
    $findings.Add([pscustomobject]@{
      Package = $pkg.Package
      Severity = 'INFO'
      Code = 'FEW-COMMENTS'
      Detail = ("Samo {0} # komentara - onboarding kvalitet (bar 3 ocekivano za opise polja)" -f $pkg.CommentCount)
    }) | Out-Null
  }
}

# --- Sumarni izveštaj ---
$warns = @($findings | Where-Object { $_.Severity -eq 'WARN' })
$infos = @($findings | Where-Object { $_.Severity -eq 'INFO' })

Write-Host ''
Write-Host '== .env.example presence + zdravlje rezime ==' -ForegroundColor Cyan
Write-Host ("  Node paketa skenirano:        {0}" -f $packages.Count)
Write-Host ("  WARN (security / missing):    {0}" -f $warns.Count)
Write-Host ("  INFO (informativno):          {0}" -f $infos.Count)

# --- Tabela paketa ---
Write-Host ''
Write-Host '== Tabela paketa ==' -ForegroundColor Cyan
$packages |
  Select-Object @{N='Paket';E={$_.Package}}, @{N='Exists';E={$_.Exists}}, @{N='Lines';E={$_.LineCount}}, @{N='Keys';E={$_.KeyCount}}, @{N='Comments';E={$_.CommentCount}}, @{N='Placeh.';E={$_.PlaceholderCount}}, @{N='Secrets';E={$_.SecretFindings.Count}} |
  Format-Table -AutoSize | Out-String | Write-Host

# --- Detalji WARN + INFO ---
if ($findings.Count -gt 0) {
  Write-Host '== Detalji nalaza (WARN prvo, INFO posle) ==' -ForegroundColor Cyan
  $sorted = $findings | Sort-Object @{Expression='Severity'; Descending=$false}, Package, Code
  $sorted | Select-Object -First $MaxOutput | ForEach-Object {
    $color = if ($_.Severity -eq 'WARN') { 'Yellow' } else { 'DarkGray' }
    Write-Host ("  [{0}] {1} :: {2}" -f $_.Severity, $_.Package, $_.Code) -ForegroundColor $color
    Write-Host ("    {0}" -f $_.Detail) -ForegroundColor DarkGray
  }
}

Write-Host ''
Write-Host 'Napomene:' -ForegroundColor DarkGray
Write-Host '  - Komplementarni audit-i strukturalne doslednosti: package.json (Talas 79), workflow YAML (Talas 80), README (Talas 81), tsconfig.json (Talas 87), ESLint config (Talas 91), .gitignore (Talas 92).'
Write-Host '  - Talas 92 hvata "da li .env (sa secrets) moze biti commit-ovan?"; Talas 93 hvata "da li paket ima sablon (.env.example) za onboarding?" - dva komplementarna security signal-a.'
Write-Host '  - run-all-audits.ps1: 39 koraka (37 read-only + TODO + npm); single entry point.'
Write-Host '  - Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md).'
Write-Host '  - Smoke (HTTP) i bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).'
Write-Host '  - Vlasnik dashboard: docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md (LATEST verify Val 355; smoke Val 351).'
Write-Host '  - Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md i docs/NIVO-1-DRYRUN-LOG.md.'

if ($FailOnWarn -and $warns.Count -gt 0) {
  exit 1
}
exit 0
