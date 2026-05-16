<#
.SYNOPSIS
  Smoke checks for multi-stack local/staging (Python Astra, Nest atina-system, optional Atina Node SaaS).

.DESCRIPTION
  Assumes services are already running. Defaults:
  - Astra: http://127.0.0.1:8080 (root docker-compose.yml)
  - Nest: http://127.0.0.1:3001 when using docker-compose.nest-port-3001.yml override
  - Atina Node (atina-platform/atina): not probed unless -SkipNode:$false (GET {base}/health, default base http://127.0.0.1:3000) or -AtinaNodeBase is set (legacy).

.NOTES
  Runbook: repo root NIVO-1-START.md, SYSTEM-MAP.md; sibling doc scripts/README.md.
  This script probes Atina Node with GET /health only (when not skipped). Deeper Atina SaaS gate (login, /me, Forge, admin): cd atina-platform/atina; npm run smoke:all — formalni Atina release gate: atina-platform/atina/docs/operations/release-gate-checklist.md (Local notes — Smoke tests).
  Monorepo gate (CI mirror): .\scripts\verify-monorepo.ps1 from repo root — Doslednost dok doc gate (md/txt + yaml/ps1/ini), uklj. par EVIDENCE-INDEX / NIVO-1-DRYRUN-LOG, u scripts/README.md (audit-doc-gate-references.ps1), pytest, Atina test:ci, apps/omnigroup-web build (unless -SkipOmnigroupWeb), Nest verify:ci or verify:n1, x3 compose config; first step matches GitHub job python (display: Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md); scripts/README.md (Port mismatch Nest/pg), Get-Help; team F.4: docs/NIVO-1-F4-TIM-CHECKLIST.md. LATEST verify evidence: docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md (Val 355). LATEST smoke: docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md (Val 351).
  When bumping Val numbers across repo comments/docs: scripts/README.md — section Kad podigneš novi broj.

.PARAMETER AtinaNodeBase
  Optional base URL for Atina Node (no trailing slash required). If non-empty, GET {AtinaNodeBase}/health runs regardless of -SkipNode (backward compatible). If empty and -SkipNode:$false, default base http://127.0.0.1:3000 is used.

.PARAMETER SkipNode
  When $true (default), skip Atina Node unless -AtinaNodeBase is set. When $false, probe GET /health at -AtinaNodeBase or at http://127.0.0.1:3000.

.PARAMETER AllowNestRedisDown
  If Nest returns redis.configured=true but reachable=false, do not fail (default: fail — catches miswired docker-compose / dead Redis).

.PARAMETER NestQueueSmoke
  After Nest health: if health says bull.enabled=true, POST .../internal/queue/smoke and require bull=true + jobId (dev/staging Nest only; 404 when NODE_ENV=production).

.PARAMETER NestQueueSmokeKey
  Value for header **x-internal-queue-smoke-key** when Nest has **INTERNAL_QUEUE_SMOKE_KEY** set; if empty, **$env:INTERNAL_QUEUE_SMOKE_KEY** is used when present.

.EXAMPLE
  .\scripts\smoke-stack.ps1  # bundled Atina gate: npm run smoke:all (atina-platform/atina; formalni Atina release gate: release-gate-checklist.md)
.EXAMPLE
  .\scripts\smoke-stack.ps1 -AtinaNodeBase "http://127.0.0.1:3000"  # npm run smoke:all for deeper checks
.EXAMPLE
  .\scripts\smoke-stack.ps1 -SkipNode:$false  # npm run smoke:all for deeper checks
.EXAMPLE
  .\scripts\smoke-stack.ps1 -SkipNode:$false -AtinaNodeBase "https://staging-api.example.com"  # npm run smoke:all for deeper checks
.EXAMPLE
  .\scripts\smoke-stack.ps1 -AllowNestRedisDown  # npm run smoke:all for deeper checks
.EXAMPLE
  .\scripts\smoke-stack.ps1 -NestQueueSmoke  # npm run smoke:all for deeper checks
.EXAMPLE
  .\scripts\smoke-stack.ps1 -NestQueueSmoke -NestQueueSmokeKey "your-secret"  # npm run smoke:all for deeper checks
#>
#Requires -Version 5.1
param(
  [string]$AstraBase = "http://127.0.0.1:8080",
  [string]$NestBase = "http://127.0.0.1:3001",
  [string]$AtinaNodeBase = "",
  [bool]$SkipNode = $true,
  [switch]$AllowNestRedisDown,
  [switch]$NestQueueSmoke,
  [string]$NestQueueSmokeKey = ""
)

$ErrorActionPreference = "Stop"

function Test-UrlJson {
  param([string]$Url, [string]$Name)
  Write-Host "Checking $Name : $Url"
  $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 30
  if ($r.StatusCode -lt 200 -or $r.StatusCode -ge 300) {
    throw "$Name returned HTTP $($r.StatusCode)"
  }
  return $r
}

$AstraBase = $AstraBase.TrimEnd('/')
$statusUrl = "$AstraBase/api/status"
$r = Test-UrlJson -Url $statusUrl -Name "Astra /api/status"
$j = $r.Content | ConvertFrom-Json
if ($null -eq $j.remaining_rsd) {
  throw "Astra JSON missing remaining_rsd"
}
Write-Host "  OK remaining_rsd=$($j.remaining_rsd)"

$NestBase = $NestBase.TrimEnd('/')
$r2 = Test-UrlJson -Url $NestBase -Name "Nest GET /"
$h = $r2.Content | ConvertFrom-Json
if ($h.ok -ne $true -or $h.name -ne "atina-system") {
  throw "Nest health JSON unexpected: $($r2.Content)"
}
$redis = $h.redis
if ($null -ne $redis -and $redis.configured -eq $true) {
  if (-not $AllowNestRedisDown -and $redis.reachable -ne $true) {
    throw "Nest reports Redis configured but unreachable (use -AllowNestRedisDown to override): $($r2.Content)"
  }
  Write-Host "  OK Nest Redis configured reachable=$($redis.reachable)"
} else {
  Write-Host "  OK Nest Redis not configured in env (skip)"
}
Write-Host "  OK atina-system health"

if ($NestQueueSmoke) {
  $bull = $h.bull
  if ($null -ne $bull -and $bull.enabled -eq $true) {
    $qUrl = "$NestBase/internal/queue/smoke"
    Write-Host "Checking Nest POST internal/queue/smoke : $qUrl"
    $hdr = @{ "Content-Type" = "application/json" }
    $k = $NestQueueSmokeKey.Trim()
    if ([string]::IsNullOrWhiteSpace($k)) {
      $k = [string]$env:INTERNAL_QUEUE_SMOKE_KEY
    }
    if (-not [string]::IsNullOrWhiteSpace($k)) {
      $hdr["x-internal-queue-smoke-key"] = $k.Trim()
    }
    try {
      $rq = Invoke-WebRequest -Uri $qUrl -Method POST -UseBasicParsing -TimeoutSec 30 -Headers $hdr -Body "{}"
    } catch {
      throw "Nest queue smoke POST failed (404 if NODE_ENV=production; 429 rate limit; 403 bad x-internal-queue-smoke-key; see atina-system/README.md): $_"
    }
    if ($rq.StatusCode -lt 200 -or $rq.StatusCode -ge 300) {
      throw "Nest queue smoke returned HTTP $($rq.StatusCode)"
    }
    $qs = $rq.Content | ConvertFrom-Json
    if ($qs.bull -ne $true) {
      throw "Nest queue smoke unexpected JSON: $($rq.Content)"
    }
    $jid = [string]$qs.jobId
    if ([string]::IsNullOrWhiteSpace($jid)) {
      throw "Nest queue smoke missing jobId: $($rq.Content)"
    }
    Write-Host "  OK Nest queue smoke jobId=$jid"
  } else {
    Write-Host "  Skip Nest queue smoke (bull.enabled is not true on GET /)"
  }
}

$atinaNodeTrim = $AtinaNodeBase.Trim()
$nodeBaseResolved = ""
if ($atinaNodeTrim -ne "") {
  $nodeBaseResolved = $atinaNodeTrim.TrimEnd('/')
} elseif (-not $SkipNode) {
  $nodeBaseResolved = "http://127.0.0.1:3000"
}
if ($nodeBaseResolved -ne "") {
  $health = "$nodeBaseResolved/health"
  $r3 = Test-UrlJson -Url $health -Name "Atina Node /health"
  Write-Host "  OK Atina Node health length=$($r3.Content.Length)"
} else {
  Write-Host "  Skip Atina Node (use -SkipNode:`$false or -AtinaNodeBase <url>)"
}

Write-Host "smoke-stack: all checks passed."
Write-Host 'Full monorepo gate (CI mirror): .\scripts\verify-monorepo.ps1 — Doslednost dok doc gate (md/txt + yaml/ps1/ini), uklj. par EVIDENCE-INDEX / NIVO-1-DRYRUN-LOG, u scripts/README.md + pytest + apps/omnigroup-web unless -SkipOmnigroupWeb — GitHub job python display: Python (Doslednost dok + pytest); docs/GIT-BRANCH-PROTECTION.md — scripts/README.md (Port mismatch Nest/pg), Get-Help .\scripts\verify-monorepo.ps1 -Full — F.4 docs/NIVO-1-F4-TIM-CHECKLIST.md | LATEST verify docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md (Val 355); smoke docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md (Val 351)' -ForegroundColor DarkGray
