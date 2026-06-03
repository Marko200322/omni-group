<#
.SYNOPSIS
  Local mirror of CI (monorepo): Doslednost dok doc gate (md/txt + yaml/ps1/ini), uklj. par EVIDENCE-INDEX / NIVO-1-DRYRUN-LOG, u scripts/README.md (audit-doc-gate-references.ps1 on *.md, *.txt, *.yml, *.yaml, *.ps1, *.ini), pytest, Atina test:ci, apps/omnigroup-web build (unless -SkipOmnigroupWeb), Nest verify, compose config. First audit step matches GitHub job python (required check display: Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md).

.DESCRIPTION
  Runs from repo root: scripts/audit-doc-gate-references.ps1 (same as first step in CI job python — GitHub displays that job as Python (Doslednost dok + pytest); branch protection: docs/GIT-BRANCH-PROTECTION.md; Doslednost dok doc gate (md/txt + yaml/ps1/ini), uklj. par EVIDENCE-INDEX / NIVO-1-DRYRUN-LOG, u scripts/README.md; pair verify-monorepo with omnigroup or SkipOmnigroup, pair verify-monorepo / smoke-stack with smoke:all; Get-Help on that script); then python -m pytest;
  npm run test:ci in atina-platform/atina;
  npm ci + npm run build in apps/omnigroup-web unless -SkipOmnigroupWeb;
  either npm run verify:ci in atina-system (needs Postgres; default POSTGRES_HOST/PORT localhost:5432, overridable) or
  npm run verify:n1 when -SkipNestVerifyCi; then three docker compose config --quiet
  unless -SkipCompose. Use -SkipDocAudit to skip the doc gate audit locally only (CI job python still runs it; GitHub check display: Python (Doslednost dok + pytest) — docs/GIT-BRANCH-PROTECTION.md).
  After stacks are up, optional multi-stack HTTP smoke: smoke-stack.ps1 (same folder; Atina Node = GET /health when probed). Full Atina bundled smoke: atina-platform/atina npm run smoke:all — formalni Atina release gate: atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes — Smoke tests). Human docs: scripts/README.md. Team F.4 runbook (repo root): docs/NIVO-1-F4-TIM-CHECKLIST.md. PowerShell 5.1+.

.PARAMETER SkipCompose
  Skip docker compose config validation. GitHub job compose still runs in CI.

.PARAMETER SkipDocAudit
  Skip audit-doc-gate-references.ps1 (pairing rules for verify-monorepo, smoke-stack, smoke:all; Doslednost dok doc gate md/txt+yaml/ps1/ini, uklj. par EVIDENCE-INDEX / NIVO-1-DRYRUN-LOG, u scripts/README.md). CI job python still runs the audit on GitHub (check display: Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md).

.PARAMETER SkipOmnigroupWeb
  Skip Next.js build under apps/omnigroup-web. CI still runs job omnigroup-web.

.PARAMETER SkipNestVerifyCi
  Skip Nest verify:ci (migrations + e2e); run verify:n1 (build + unit) only.
  Use when Postgres is not available locally. CI still runs full verify:ci.

.EXAMPLE
  .\scripts\verify-monorepo.ps1  # docs/GIT-BRANCH-PROTECTION.md (job python / Python (Doslednost dok + pytest))

.EXAMPLE
  .\scripts\verify-monorepo.ps1 -SkipCompose  # docs/GIT-BRANCH-PROTECTION.md

.EXAMPLE
  .\scripts\verify-monorepo.ps1 -SkipNestVerifyCi  # docs/GIT-BRANCH-PROTECTION.md

.EXAMPLE
  .\scripts\verify-monorepo.ps1 -SkipCompose -SkipNestVerifyCi  # docs/GIT-BRANCH-PROTECTION.md

.EXAMPLE
  .\scripts\verify-monorepo.ps1 -SkipOmnigroupWeb  # docs/GIT-BRANCH-PROTECTION.md

.EXAMPLE
  .\scripts\verify-monorepo.ps1 -SkipDocAudit  # docs/GIT-BRANCH-PROTECTION.md

.NOTES
  Full CI (monorepo) mirror — default, no switches:
    From repo root: powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-monorepo.ps1  # docs/GIT-BRANCH-PROTECTION.md
    Doslednost dok: audit-doc-gate-references.ps1 (Doslednost dok doc gate (md/txt + yaml/ps1/ini), uklj. par EVIDENCE-INDEX / NIVO-1-DRYRUN-LOG, u scripts/README.md; omnigroup/SkipOmnigroup with verify-monorepo; smoke:all with verify-monorepo and smoke-stack) runs first, matching CI job python (GitHub: Python (Doslednost dok + pytest) — docs/GIT-BRANCH-PROTECTION.md).
    Requires: Python + Node; Postgres reachable from the host for atina-system verify:ci (default host/port
    localhost:5432; user/db match `atina-platform/atina/docker-compose.yml`: atina_user / atina_password / atina_saas_db).
    Override with POSTGRES_* env vars if needed; POSTGRES_PORT must match the published Docker port (e.g. 5433 when
    DB_PORT_EXPOSE=5433 — see `atina-platform/atina/docker-compose.yml` comment for Windows + Node `pg` issues).
    Before verify:ci the script prints effective POSTGRES host/port; ECONNREFUSED often means env port ≠ host port
    (see "Port mismatch" in scripts/README.md).
    Docker for the three `docker compose config --quiet` checks (same as CI job `compose`).

  Lighter local runs (CI on GitHub still runs the skipped gates):
    -SkipNestVerifyCi  -> atina-system runs verify:n1 only (no DB / no verify:ci migrations+e2e).
    -SkipCompose       -> skips all compose config validations (CI compose job unchanged).
    -SkipOmnigroupWeb  -> skips apps/omnigroup-web npm ci + build.
    -SkipDocAudit      -> skips audit-doc-gate-references.ps1 locally; CI job python still runs it (GitHub: Python (Doslednost dok + pytest) — docs/GIT-BRANCH-PROTECTION.md).
    Combine both when you have neither Postgres nor Docker for those steps.

  LATEST evidence (update when you log a new run): docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md (Val 360);
  multi-stack smoke exemplar: docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md (Val 351).
  When bumping Val numbers in comments/docs repo-wide: scripts/README.md — section Kad podigneš novi broj.
#>
param(
  [switch]$SkipCompose,
  [switch]$SkipOmnigroupWeb,
  [switch]$SkipNestVerifyCi,
  [switch]$SkipDocAudit
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

if (-not $SkipDocAudit) {
  Write-Host '== Doslednost dok: doc gate (md/txt + yaml/ps1/ini), uklj. par EVIDENCE-INDEX / NIVO-1-DRYRUN-LOG, u scripts/README.md ==' -ForegroundColor Cyan
  powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $scriptsDir 'audit-doc-gate-references.ps1')
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
  Write-Host '== Doslednost dok skipped (-SkipDocAudit). CI job python still runs the audit (GitHub check: Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md). ==' -ForegroundColor Yellow
}

Write-Host '== pytest (root) ==' -ForegroundColor Cyan
python -m pytest -q
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '== atina-platform/atina test:ci ==' -ForegroundColor Cyan
Push-Location (Join-Path $repoRoot 'atina-platform\atina')
npm run test:ci
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

if (-not $SkipOmnigroupWeb) {
  Write-Host '== apps/omnigroup-web (npm ci + build) ==' -ForegroundColor Cyan
  Push-Location (Join-Path $repoRoot 'apps\omnigroup-web')
  npm ci
  if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
  npm run build
  if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
  Pop-Location
} else {
  Write-Host '== apps/omnigroup-web (skipped: -SkipOmnigroupWeb) ==' -ForegroundColor Yellow
}

if (-not $SkipNestVerifyCi) {
  Write-Host '== atina-system verify:ci (Postgres on localhost:5432 + E2E) ==' -ForegroundColor Cyan
  Push-Location (Join-Path $repoRoot 'atina-system')
  if (-not $env:POSTGRES_HOST) { $env:POSTGRES_HOST = 'localhost' }
  if (-not $env:POSTGRES_PORT) { $env:POSTGRES_PORT = '5432' }
  Write-Host ('  (effective POSTGRES: host={0} port={1} - must match published DB port; see scripts/README.md Port mismatch)' -f $env:POSTGRES_HOST, $env:POSTGRES_PORT) -ForegroundColor DarkGray
  # Same defaults as `atina-platform/atina/docker-compose.yml` postgres service (local `docker compose up -d postgres`).
  if (-not $env:POSTGRES_USER) { $env:POSTGRES_USER = 'atina_user' }
  if (-not $env:POSTGRES_PASSWORD) { $env:POSTGRES_PASSWORD = 'atina_password' }
  if (-not $env:POSTGRES_DB) { $env:POSTGRES_DB = 'atina_saas_db' }
  if (-not $env:NODE_ENV) { $env:NODE_ENV = 'test' }
  if (-not $env:JWT_SECRET) { $env:JWT_SECRET = 'local-verify-jwt-secret-at-least-32-chars-long' }
  if (-not $env:E2E_WITH_DB) { $env:E2E_WITH_DB = '1' }
  npm run verify:ci
  if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
  Pop-Location
} else {
  Write-Host '== atina-system verify:n1 (build + unit; no Postgres / no verify:ci) ==' -ForegroundColor Cyan
  Push-Location (Join-Path $repoRoot 'atina-system')
  npm run verify:n1
  if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
  Pop-Location
  Write-Host '== atina-system verify:ci (skipped: -SkipNestVerifyCi; migrations + e2e only in CI or with Postgres) ==' -ForegroundColor Yellow
}

if (-not $SkipCompose) {
  Write-Host '== docker compose config (CI job compose) ==' -ForegroundColor Cyan
  docker compose -f docker-compose.atina.yml -f docker-compose.nest-port-3001.yml config --quiet
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  docker compose -f docker-compose.yml config --quiet
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  docker compose -f atina-platform/atina/docker-compose.yml config --quiet
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
  Write-Host '== docker compose config (skipped: -SkipCompose) ==' -ForegroundColor Yellow
}

Write-Host ''
Write-Host '=== monorepo verify: all gates passed ===' -ForegroundColor Green
if (-not $SkipDocAudit) {
  Write-Host '  [done] audit-doc-gate-references.ps1 (uklj. par EVIDENCE-INDEX / NIVO-1-DRYRUN-LOG, u scripts/README.md)' -ForegroundColor DarkGray
} else {
  Write-Host '  [skip] audit-doc-gate-references.ps1 (-SkipDocAudit). CI python job still runs it (same file types).' -ForegroundColor DarkYellow
}
Write-Host '  [done] pytest (repo root)' -ForegroundColor DarkGray
Write-Host '  [done] npm run test:ci (atina-platform\atina)' -ForegroundColor DarkGray
if (-not $SkipOmnigroupWeb) {
  Write-Host '  [done] npm ci + npm run build (apps\omnigroup-web)' -ForegroundColor DarkGray
} else {
  Write-Host '  [skip] omnigroup-web build - not run (-SkipOmnigroupWeb). CI job still runs on GitHub.' -ForegroundColor DarkYellow
}
if (-not $SkipNestVerifyCi) {
  Write-Host '  [done] npm run verify:ci (atina-system; Postgres + E2E)' -ForegroundColor DarkGray
} else {
  Write-Host '  [done] npm run verify:n1 (atina-system)' -ForegroundColor DarkGray
  Write-Host '  [skip] verify:ci - not run (-SkipNestVerifyCi). Default run + CI still include migrations + e2e.' -ForegroundColor DarkYellow
}
if (-not $SkipCompose) {
  Write-Host '  [done] docker compose config --quiet x3 (CI compose job mirror)' -ForegroundColor DarkGray
} else {
  Write-Host '  [skip] docker compose config - not run (-SkipCompose). CI compose job still validates on push.' -ForegroundColor DarkYellow
}
Write-Host ''
Write-Host 'Optional (stacks up): .\scripts\smoke-stack.ps1 (Atina Node = GET /health when probed)' -ForegroundColor DarkGray
Write-Host 'Atina bundled smoke: atina-platform\atina npm run smoke:all — formalni Atina release gate: atina-platform\atina\docs\operations\release-gate-checklist.md (Local notes — Smoke tests)' -ForegroundColor DarkGray
Write-Host 'LATEST verify: docs\NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md (Val 360); smoke: docs\NIVO-1-SMOKE-EVIDENCE-LATEST.md (Val 351)' -ForegroundColor DarkGray
Write-Host 'Help: Get-Help .\scripts\verify-monorepo.ps1 -Full | scripts\README.md | docs\NIVO-1-F4-TIM-CHECKLIST.md | docs\GIT-BRANCH-PROTECTION.md' -ForegroundColor DarkGray
