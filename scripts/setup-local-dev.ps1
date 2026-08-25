# Lokalni dev setup — repo na C:\dev (van OneDrive sync-a)
# Pokretanje: .\scripts\setup-local-dev.ps1

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$atinaRoot = Join-Path $repoRoot 'atina-platform\atina'
$webRoot = Join-Path $repoRoot 'apps\omnigroup-web'
$cacheDir = Join-Path $repoRoot '.npm-cache'
$tmpDir = Join-Path $repoRoot '.tmp'

New-Item -ItemType Directory -Force -Path $cacheDir, $tmpDir | Out-Null

$env:npm_config_cache = $cacheDir
$env:TMP = $tmpDir
$env:TEMP = $tmpDir

$freeGb = [math]::Round((Get-PSDrive C).Free / 1GB, 2)
Write-Host "Repo (lokalno): $repoRoot" -ForegroundColor Cyan
Write-Host "npm cache:      $cacheDir"
Write-Host "C: slobodno:    $freeGb GB" -ForegroundColor $(if ($freeGb -lt 5) { 'Red' } else { 'Green' })

Write-Host ''
Write-Host '=== npm install Atina ===' -ForegroundColor Cyan
Push-Location $atinaRoot
try { npm install } finally { Pop-Location }

Write-Host ''
Write-Host '=== npm install Web ===' -ForegroundColor Cyan
Push-Location $webRoot
try { npm install } finally { Pop-Location }

Write-Host ''
Write-Host '=== DB migrate ===' -ForegroundColor Cyan
Push-Location $atinaRoot
try { npm run migrate } finally { Pop-Location }

Write-Host ''
Write-Host 'Gotovo. Otvori folder u Cursor-u: C:\dev\omni group' -ForegroundColor Green
