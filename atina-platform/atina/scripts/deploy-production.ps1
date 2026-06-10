# Faza F — produkcijski deploy na VPS (checklist + opcioni koraci)
param(
  [string]$VpsHost = '',
  [string]$VpsUser = 'root',
  [string]$Domain = '',
  [switch]$DryRun,
  [switch]$SkipDockerBuild
)

$ErrorActionPreference = 'Stop'
$atinaRoot = Split-Path -Parent $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $atinaRoot '..\..')).Path
$webRoot = Join-Path $repoRoot 'apps\omnigroup-web'

Write-Host '=== F — Deploy na VPS (Omni Group) ===' -ForegroundColor Cyan
Write-Host "Repo:   $repoRoot"
Write-Host "Atina:  $atinaRoot"
Write-Host "Web:    $webRoot"
Write-Host ''

function Step($n, $msg) {
  Write-Host "[$n] $msg" -ForegroundColor Yellow
}

Step '1' 'Env produkcija — kopiraj .env.example → .env na VPS i popuni:'
Write-Host '  - APP_URL=https://<domen>'
Write-Host '  - JWT_SECRET, JWT_REFRESH_SECRET (jaki random)'
Write-Host '  - DB_* (Postgres na istom VPS ili managed)'
Write-Host '  - Agregatori iz checkliste A (OpenRouter, Apify, COMMS, …)'
Write-Host '  - AUTONOMY_ROLLOUT_SEGMENT=freelance'
Write-Host '  - OUTREACH_DEV_SEND_TO_FALLBACK=true dok nema warmup domena'
Write-Host '  - AUTONOMY_EVOLUTION_CODE_EDIT=false na produkciji'
Write-Host ''

Step '2' 'Docker stack (API + Web + Postgres + Redis):'
Write-Host "  cd $repoRoot"
Write-Host '  docker compose -f docker-compose.prod.yml --profile setup run --rm migrate'
Write-Host '  docker compose -f docker-compose.prod.yml up -d'
Write-Host '  # TLS: docker compose -f docker-compose.prod.yml --profile tls up -d caddy'
Write-Host "  # ili samo Atina: cd $atinaRoot && docker compose up -d"
Write-Host ''

if (-not $SkipDockerBuild) {
  Step '2b' 'Lokalni prep build (pre rsync na VPS):'
  Push-Location $atinaRoot
  try {
    if ($DryRun) {
      Write-Host '  [dry-run] docker compose build app'
    } else {
      docker compose build app
      Write-Host '  Docker build OK' -ForegroundColor Green
    }
  } finally {
    Pop-Location
  }
  Write-Host ''
}

Step '3' 'Migracije + seed (samo prvi put):'
Write-Host '  docker compose run --rm migrate'
Write-Host '  docker compose --profile seed run --rm seed   # opciono'
Write-Host ''

Step '4' 'Web (omnigroup-web):'
Write-Host '  Opcija A — Vercel: poveži repo, env ATINA_API_URL=https://api.<domen>'
Write-Host '  Opcija B — VPS Docker/PM2:'
Write-Host "    cd $webRoot"
Write-Host '    cp .env.example .env.local  # ATINA_API_URL, NEXTAUTH…'
Write-Host '    npm ci && npm run build && npm run start'
Write-Host ''

Step '5' 'Smoke posle deploya:'
Write-Host "  powershell -File `"$atinaRoot\scripts\smoke-category-rollout.ps1`" -BaseUrl https://api.<domen>"
Write-Host "  powershell -File `"$atinaRoot\scripts\smoke-evolution.ps1`" -BaseUrl https://api.<domen>"
Write-Host ''

Step '6' 'Backup + monitoring:'
Write-Host '  npm run vault:backup   # lokalni primer'
Write-Host '  docs/operations/CHECKLIST-100-PROCENTA.md — sekcija F'
Write-Host ''

if ($VpsHost) {
  Step '7' "Rsync na VPS ($VpsUser@$VpsHost) — primer:"
  Write-Host "  rsync -avz --exclude node_modules --exclude .git `"$repoRoot/`" ${VpsUser}@${VpsHost}:/opt/omni-group/"
  if ($Domain) {
    Write-Host "  Postavi APP_URL=https://$Domain u /opt/omni-group/atina-platform/atina/.env"
  }
} else {
  Step '7' 'Rsync — prosledi -VpsHost i -Domain kad VPS bude spreman'
}

Write-Host ''
Write-Host 'Gotovo — skripta ne deployuje automatski; koristi korake iznad na VPS.' -ForegroundColor Green
