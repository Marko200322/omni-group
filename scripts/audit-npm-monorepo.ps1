<#
.SYNOPSIS
  Konsolidovani `npm audit` runner preko sve 3 Node tačke u monorepu (Atina, Nest, omnigroup-web). Konsoliduje rezultate u jednu tabelu i (opciono) snima JSON snapshot. Konsolidovani audit runbook: docs/NPM-AUDIT-MONOREPO.md (uz Nest-specifičan trag atina-system/docs/NPM-AUDIT-NIVO1.md).

.DESCRIPTION
  Iz korena repoa pokreće `npm audit --json` u atina-platform/atina, atina-system i apps/omnigroup-web. Parsira `metadata.vulnerabilities` polje (info / low / moderate / high / critical / total) i ispisuje uniformnu tabelu. **Ne pokreće** `npm audit fix` ni `npm audit fix --force` — samo read-only audit; sve `--force` rezolucije ostaju vlasnik-akcije (vidi docs/NPM-AUDIT-MONOREPO.md sekciju "Predloženi redosled vlasnik-akcija").

  Ne menja gate scope `verify-monorepo.ps1` — `npm audit` advisory-ji su build warnings, ne build failures. Pun verify: scripts/verify-monorepo.ps1 (job python / required check Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md).

  Smoke (HTTP, opciono kad su servisi gore): scripts/smoke-stack.ps1 (Atina Node = GET /health). Bundled Atina (login / Forge / admin): atina-platform/atina npm run smoke:all — formalni Atina release gate: atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes — Smoke tests).

.PARAMETER OmitDev
  Pokreće `npm audit --omit=dev` (samo produkcijske zavisnosti). Korisno za odvajanje stvarnog production-impact-a od dev-only buke (lint chains, build alati). Bez ove opcije, podrazumevano je `npm audit` preko svih zavisnosti.

.PARAMETER OutDir
  Opciona putanja folder-a za JSON snapshot-ove. Ako je zadat, skripta snima `<paket>-<YYYYMMDD-HHmm>.json` po paketu — koristan kao machine-readable evidencija za audit log. Folder se kreira ako ne postoji. Putanja može biti relativna na koren repoa ili apsolutna.

.PARAMETER FailOnCritical
  Ako je zadato, skripta vraća exit code 1 ako bilo koji paket ima `critical` advisory. Bez ove opcije, skripta uvek vraća 0 (audit je informativan, ne blokirajući).

.EXAMPLE
  .\scripts\audit-npm-monorepo.ps1
  # Sve zavisnosti, samo tabela; uvek exit 0.

.EXAMPLE
  .\scripts\audit-npm-monorepo.ps1 -OmitDev
  # Samo produkcijske zavisnosti — bolji signal za "stvaran rizik".

.EXAMPLE
  .\scripts\audit-npm-monorepo.ps1 -OutDir evidence/npm-audit
  # Snima JSON snapshot za svaki paket u evidence/npm-audit/<paket>-<datum>.json.

.EXAMPLE
  .\scripts\audit-npm-monorepo.ps1 -OmitDev -FailOnCritical
  # CI / pre-merge varijanta: prod-only + non-zero exit ako se pojavi critical.

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (npm audit baseline, korak 36; ukupno 39 koraka Talas 65-192).
  Konsolidovani audit runbook (snapshot 2026-05-14, Val 355): docs/NPM-AUDIT-MONOREPO.md
  Nest-specifičan trag: atina-system/docs/NPM-AUDIT-NIVO1.md
  LATEST verify (kanon): docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md (Val 355);
  LATEST smoke (sekcija H): docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md (Val 351).
  Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md + docs/NIVO-1-DRYRUN-LOG.md.
  Kad podižeš novi Val širom dokova: scripts/README.md — odeljak Kad podigneš novi broj.
  PowerShell 5.1+.
#>
param(
  [switch]$OmitDev,
  [string]$OutDir,
  [switch]$FailOnCritical
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

# Resolve OutDir relative to repo root (if provided) and create if missing.
$outDirAbs = $null
if ($OutDir) {
  if ([System.IO.Path]::IsPathRooted($OutDir)) {
    $outDirAbs = $OutDir
  } else {
    $outDirAbs = Join-Path $repoRoot $OutDir
  }
  if (-not (Test-Path $outDirAbs)) {
    New-Item -ItemType Directory -Path $outDirAbs -Force | Out-Null
  }
}

$packages = @(
  @{ Name = 'atina'; Path = 'atina-platform/atina'; Label = 'atina-platform/atina (Atina Node SaaS)' },
  @{ Name = 'nest'; Path = 'atina-system'; Label = 'atina-system (Nest)' },
  @{ Name = 'omnigroup-web'; Path = 'apps/omnigroup-web'; Label = 'apps/omnigroup-web (Next 14)' }
)

$auditFlag = if ($OmitDev) { '--omit=dev' } else { '' }
$mode = if ($OmitDev) { 'prod-only (--omit=dev)' } else { 'all dependencies' }

Write-Host "== npm audit (monorepo) - mode: $mode ==" -ForegroundColor Cyan
Write-Host '   Konsolidovani runbook: docs/NPM-AUDIT-MONOREPO.md' -ForegroundColor DarkGray
if ($outDirAbs) {
  Write-Host "   JSON snapshots → $outDirAbs" -ForegroundColor DarkGray
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmm'
$rows = @()
$hadCritical = $false

foreach ($pkg in $packages) {
  $pkgPath = Join-Path $repoRoot $pkg.Path
  if (-not (Test-Path (Join-Path $pkgPath 'package.json'))) {
    Write-Host "   [skip] $($pkg.Label) - package.json not found" -ForegroundColor Yellow
    continue
  }

  Push-Location $pkgPath
  try {
    $cmd = if ($OmitDev) { 'npm audit --omit=dev --json' } else { 'npm audit --json' }
    Write-Host "-- $($pkg.Label): $cmd" -ForegroundColor White
    $jsonOut = & npm audit @($auditFlag | Where-Object { $_ }) --json 2>&1 | Out-String
    # npm audit returns 1 when advisories exist; that is normal, not a script failure.

    $parsed = $null
    try {
      $parsed = $jsonOut | ConvertFrom-Json -ErrorAction Stop
    } catch {
      # Some npm versions emit warnings before JSON; try to extract first JSON object.
      $jsonStart = $jsonOut.IndexOf('{')
      if ($jsonStart -ge 0) {
        $jsonOnly = $jsonOut.Substring($jsonStart)
        try { $parsed = $jsonOnly | ConvertFrom-Json -ErrorAction Stop } catch { $parsed = $null }
      }
    }

    if ($null -eq $parsed) {
      Write-Host "   [error] could not parse npm audit JSON for $($pkg.Label) - see raw output below" -ForegroundColor Red
      Write-Host $jsonOut.Substring(0, [Math]::Min(800, $jsonOut.Length)) -ForegroundColor DarkRed
      $rows += [pscustomobject]@{
        Package  = $pkg.Label
        Total    = 'parse-error'
        Critical = '-'
        High     = '-'
        Moderate = '-'
        Low      = '-'
        Info     = '-'
        Note     = 'JSON parse failed (see console)'
      }
      continue
    }

    $vuln = $parsed.metadata.vulnerabilities
    $critical = [int]$vuln.critical
    $high = [int]$vuln.high
    $moderate = [int]$vuln.moderate
    $low = [int]$vuln.low
    $info = [int]$vuln.info
    $total = [int]$vuln.total
    if ($critical -gt 0) { $hadCritical = $true }

    $note = ''
    if ($parsed.error) {
      if ($parsed.error.summary) {
        $note = "error: $($parsed.error.summary)"
      } elseif ($parsed.error.code) {
        $note = "error: $($parsed.error.code)"
      } else {
        $note = 'error: (unspecified)'
      }
    }

    $rows += [pscustomobject]@{
      Package  = $pkg.Label
      Total    = $total
      Critical = $critical
      High     = $high
      Moderate = $moderate
      Low      = $low
      Info     = $info
      Note     = $note
    }

    if ($outDirAbs) {
      $modeSuffix = if ($OmitDev) { 'prod' } else { 'all' }
      $outFile = Join-Path $outDirAbs "$($pkg.Name)-$modeSuffix-$timestamp.json"
      Set-Content -Path $outFile -Value $jsonOut -Encoding UTF8
      Write-Host "   snapshot: $outFile" -ForegroundColor DarkGray
    }
  } finally {
    Pop-Location
  }
}

Write-Host ''
Write-Host "== npm audit (monorepo) summary - mode: $mode ==" -ForegroundColor Cyan
$rows | Format-Table -AutoSize Package, Total, Critical, High, Moderate, Low, Info, Note

# Aggregate totals
$totals = @{
  Critical = ($rows | Where-Object { $_.Critical -is [int] } | Measure-Object -Property Critical -Sum).Sum
  High     = ($rows | Where-Object { $_.High -is [int] } | Measure-Object -Property High -Sum).Sum
  Moderate = ($rows | Where-Object { $_.Moderate -is [int] } | Measure-Object -Property Moderate -Sum).Sum
  Low      = ($rows | Where-Object { $_.Low -is [int] } | Measure-Object -Property Low -Sum).Sum
  Total    = ($rows | Where-Object { $_.Total -is [int] } | Measure-Object -Property Total -Sum).Sum
}
Write-Host ("Aggregate ({0}): total={1} critical={2} high={3} moderate={4} low={5}" -f $mode, $totals.Total, $totals.Critical, $totals.High, $totals.Moderate, $totals.Low) -ForegroundColor White
Write-Host ''
Write-Host 'Vlasnik-action redosled (P0/P1/P2): docs/NPM-AUDIT-MONOREPO.md - sekcija "Predlozeni redosled vlasnik-akcija".' -ForegroundColor DarkGray
Write-Host 'Nest detalji: atina-system/docs/NPM-AUDIT-NIVO1.md.' -ForegroundColor DarkGray
Write-Host 'Pun verify (CI mirror): scripts/verify-monorepo.ps1 (job python / required check Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md).' -ForegroundColor DarkGray
Write-Host 'Smoke (HTTP) i Atina bundled npm run smoke:all: scripts/smoke-stack.ps1 + atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes - Smoke tests).' -ForegroundColor DarkGray
Write-Host 'LATEST verify: docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md (Val 355); smoke: docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md (Val 351).' -ForegroundColor DarkGray
Write-Host 'Monorepo evidencija (indeks + dry-run): docs/EVIDENCE-INDEX.md + docs/NIVO-1-DRYRUN-LOG.md. F.4 / GitHub Actions paritet: docs/NIVO-1-F4-TIM-CHECKLIST.md.' -ForegroundColor DarkGray

if ($FailOnCritical -and $hadCritical) {
  Write-Host '== EXIT 1: -FailOnCritical i postoji bar jedan critical advisory ==' -ForegroundColor Red
  exit 1
}
exit 0
