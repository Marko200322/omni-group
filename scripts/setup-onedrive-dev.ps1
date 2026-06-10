# Dev setup — sve na OneDrive putanji (cache/temp u repou, ne na punom C:\Temp)
# Preduslov: bar ~2 GB slobodno na C: (node_modules i dalje pišu lokalno na sistemski disk)

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
Write-Host "Repo (OneDrive): $repoRoot" -ForegroundColor Cyan
Write-Host "npm cache:       $cacheDir"
Write-Host "C: slobodno:     $freeGb GB" -ForegroundColor $(if ($freeGb -lt 2) { 'Red' } else { 'Green' })

if ($freeGb -lt 1) {
  Write-Host ''
  Write-Host 'UPOZORENJE: C: je skoro pun. OneDrive 1 TB je u OBLAKU — npm ipak pise na lokalni C:.' -ForegroundColor Yellow
  Write-Host 'Oslobodi prostor: Docker Desktop -> Settings -> Resources -> Disk image (ili builder prune).' -ForegroundColor Yellow
  Write-Host 'Docker trenutno zauzima ~37 GB na ovom racunaru.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host '=== npm install Atina ===' -ForegroundColor Cyan
Push-Location $atinaRoot
try { npm install } finally { Pop-Location }

Write-Host ''
Write-Host '=== npm install Web ===' -ForegroundColor Cyan
Push-Location $webRoot
try { npm install } finally { Pop-Location }

Write-Host ''
Write-Host '=== DB migrate (021 push + ostalo) ===' -ForegroundColor Cyan
Push-Location $atinaRoot
try { npm run migrate } finally { Pop-Location }

Write-Host ''
Write-Host '=== VAPID kljucevi (opciono, za push) ===' -ForegroundColor Cyan
Write-Host "  cd $atinaRoot"
Write-Host '  npx web-push generate-vapid-keys'
Write-Host ''
Write-Host 'Gotovo.' -ForegroundColor Green
