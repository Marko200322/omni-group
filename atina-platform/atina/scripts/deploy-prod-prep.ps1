# Produkcijski deploy prep (Faza F) — bez Docker lokalno.
$ErrorActionPreference = 'Stop'
$atinaRoot = Split-Path -Parent $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $atinaRoot '..\..')).Path

Write-Host '=== F — Deploy na net (checklist) ==='
Write-Host "1. Postavi APP_URL na javni HTTPS domen (ne localhost)"
Write-Host "2. Host: API + PostgreSQL + Redis (VPS/cloud)"
Write-Host "3. omnigroup-web: Vercel ili Docker na istom VPS"
Write-Host "4. npm run migrate na produkcijskoj bazi"
Write-Host "5. Popuni produkcijski .env (agregatori iz A)"
Write-Host "6. Backup + monitoring runbooki u docs/operations/"
Write-Host ''
Write-Host "Repo: $repoRoot"
Write-Host "Atina: $atinaRoot"
