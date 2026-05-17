# Lokalni test monorepo-a (npm.cmd — radi i kad PowerShell blokira npm.ps1)
$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

Write-Host '== pytest ==' -ForegroundColor Cyan
python -m pytest -q
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '== atina-system verify:n1 ==' -ForegroundColor Cyan
Push-Location (Join-Path $repoRoot 'atina-system')
npm.cmd run verify:n1
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

Write-Host '== omnigroup-web ==' -ForegroundColor Cyan
Push-Location (Join-Path $repoRoot 'apps\omnigroup-web')
npm.cmd run lint
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
npm.cmd run test:atina
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
npm.cmd run build
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

Write-Host '=== test-local: all passed ===' -ForegroundColor Green
Write-Host 'Web:  cd apps\omnigroup-web; npm.cmd run dev:clean  ->  http://localhost:3010' -ForegroundColor DarkGray
Write-Host 'API:  .\scripts\start-local-stack.ps1  ili  atina-platform\atina npm.cmd run dev' -ForegroundColor DarkGray
Write-Host 'Smoke: .\scripts\owner-smoke-all.ps1  |  Pre-push: .\scripts\pre-push-check.ps1' -ForegroundColor DarkGray
