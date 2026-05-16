<#
.SYNOPSIS
  Repo hygiene: doc references to verify-monorepo and smoke-stack stay paired with omnigroup context and smoke:all (bundled Atina gate); files citing EVIDENCE-INDEX must also cite NIVO-1-DRYRUN-LOG. Canonical wording: Doslednost dok doc gate (md/txt + yaml/ps1/ini), uklj. par EVIDENCE-INDEX / NIVO-1-DRYRUN-LOG, u scripts/README.md. Required-check naming: docs/GIT-BRANCH-PROTECTION.md.

.DESCRIPTION
  Walks the workspace from repo root, skips directories named node_modules or .next (not entered). Scans *.md, *.txt, *.yml, *.yaml, *.ps1, *.ini (Doslednost dok doc gate (md/txt + yaml/ps1/ini), uklj. par EVIDENCE-INDEX / NIVO-1-DRYRUN-LOG, u scripts/README.md). Exit code 0 if no violations; 1 otherwise.
  Rules: (1) files that mention verify-monorepo must also mention omnigroup or SkipOmnigroup (Next.js gate / -SkipOmnigroupWeb); (2) files that mention verify-monorepo must mention smoke:all (do not document the monorepo gate without the bundled Atina smoke npm script); (3) files that mention smoke-stack must mention smoke:all (multi-stack GET /health vs deeper gate in atina-platform/atina); (4) files that mention verify-monorepo must mention the required-check display name Python (Doslednost dok + pytest) (align with docs/GIT-BRANCH-PROTECTION.md); (5) files that mention EVIDENCE-INDEX must mention NIVO-1-DRYRUN-LOG (monorepo evidencija indeks + dry-run par — docs/STAGING-RELEASE-CHECKLIST.md / entry dokovi).
  Optional pre-PR check; does not replace verify-monorepo.ps1 (CI mirror story: docs/GIT-BRANCH-PROTECTION.md).
  Full monorepo gate: scripts/verify-monorepo.ps1 (scripts/README.md; F.4 docs/NIVO-1-F4-TIM-CHECKLIST.md). Same first-step doc gate as GitHub job python (audit-doc-gate-references.ps1 — Doslednost dok doc gate (md/txt + yaml/ps1/ini), uklj. par EVIDENCE-INDEX / NIVO-1-DRYRUN-LOG, u scripts/README.md; check display: Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md). LATEST exemplars: docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md (Val 355), docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md (Val 351).
  When bumping Val numbers across repo: scripts/README.md — section Kad podigneš novi broj (pytest.ini, docker-compose YAML comments, workflows, dependabot, entry *.md, etc.).
  HTTP smoke: scripts/smoke-stack.ps1 probes Atina Node with GET /health only when enabled; deeper Atina gate is atina-platform/atina npm run smoke:all — formalni Atina release gate: atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes — Smoke tests).
  Editorial (not enforced here): in *.md prose, cite docs/GIT-BRANCH-PROTECTION.md on the same line as verify-monorepo.ps1 when practical; cite npm run smoke:all on the same line as smoke-stack when practical — see scripts/README.md and repo history.

.EXAMPLE
  .\scripts\audit-doc-gate-references.ps1

.NOTES
  Konsolidovani audit suite: vidi `run-all-audits.ps1` (doc gate baseline, korak 1; ukupno 39 koraka Talas 65-192).
  Human runbook: scripts/README.md.
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
  [string]$RepoRoot = (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
)

$ErrorActionPreference = 'Stop'
$gateRegex = [regex]'verify-monorepo' # Pairing rules + branch-protection naming: docs/GIT-BRANCH-PROTECTION.md
$ctxRegex = [regex]'omnigroup|SkipOmnigroup'
$smokeAllRegex = [regex]'smoke:all'
$smokeStackRegex = [regex]'smoke-stack'
$pythonCheckRegex = [regex]([regex]::Escape('Python (Doslednost dok + pytest)'))
$evidenceIndexRegex = [regex]::new('EVIDENCE-INDEX', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
$dryRunLogRegex = [regex]::new('NIVO-1-DRYRUN-LOG', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
$skipDirNames = [System.Collections.Generic.HashSet[string]]::new([string[]]@('node_modules', '.next'))

function Test-DocGateReferences {
  param([string]$Dir)
  $violations = New-Object System.Collections.Generic.List[string]

  $files = Get-ChildItem -LiteralPath $Dir -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -in @('.md', '.txt', '.yml', '.yaml', '.ps1', '.ini') }

  foreach ($f in $files) {
    $text = Get-Content -LiteralPath $f.FullName -Raw -ErrorAction Stop
    if ($null -eq $text) { $text = '' }
    $rel = $f.FullName.Substring($RepoRoot.Length).TrimStart('\', '/')
    if ($gateRegex.IsMatch($text) -and -not $ctxRegex.IsMatch($text)) {
      [void]$violations.Add("$rel : verify-monorepo without omnigroup / SkipOmnigroup context (docs/GIT-BRANCH-PROTECTION.md)")
    }
    if ($gateRegex.IsMatch($text) -and -not $smokeAllRegex.IsMatch($text)) {
      [void]$violations.Add("$rel : verify-monorepo without smoke:all (docs/GIT-BRANCH-PROTECTION.md)")
    }
    if ($gateRegex.IsMatch($text) -and -not $pythonCheckRegex.IsMatch($text)) {
      [void]$violations.Add("$rel : verify-monorepo without Python (Doslednost dok + pytest) (branch protection display name; see docs/GIT-BRANCH-PROTECTION.md)")
    }
    if ($smokeStackRegex.IsMatch($text) -and -not $smokeAllRegex.IsMatch($text)) {
      [void]$violations.Add("$rel : smoke-stack without smoke:all")
    }
    if ($evidenceIndexRegex.IsMatch($text) -and -not $dryRunLogRegex.IsMatch($text)) {
      [void]$violations.Add("$rel : EVIDENCE-INDEX without NIVO-1-DRYRUN-LOG (monorepo evidencija indeks + dry-run par)")
    }
  }

  Get-ChildItem -LiteralPath $Dir -Directory -ErrorAction SilentlyContinue |
    Where-Object { -not $skipDirNames.Contains($_.Name) } |
    ForEach-Object {
      $child = Test-DocGateReferences -Dir $_.FullName
      foreach ($v in $child) { [void]$violations.Add($v) }
    }

  return $violations
}

$all = Test-DocGateReferences -Dir $RepoRoot

if ($all.Count -gt 0) {
  Write-Host 'audit-doc-gate-references: FAIL:' -ForegroundColor Red
  foreach ($v in $all) { Write-Host "  $v" -ForegroundColor Yellow }
  exit 1
}

Write-Host 'audit-doc-gate-references: OK (omnigroup / SkipOmnigroup + smoke:all + Python check name for verify-monorepo; smoke:all for smoke-stack; EVIDENCE-INDEX paired with NIVO-1-DRYRUN-LOG in *.md, *.txt, *.yml, *.yaml, *.ps1, *.ini). docs/GIT-BRANCH-PROTECTION.md' -ForegroundColor Green
exit 0
