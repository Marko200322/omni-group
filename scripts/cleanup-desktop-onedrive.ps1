# Desktop + OneDrive cleanup — uklanja duplikate i smanjuje crvene sync ikone
# Pokretanje: .\scripts\cleanup-desktop-onedrive.ps1

$ErrorActionPreference = 'Continue'
$desktop = Join-Path $env:OneDrive 'Desktop'
$archive = Join-Path $env:OneDrive 'Documents\Desktop-Arhiva'
$misc = Join-Path $archive 'misc'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

New-Item -ItemType Directory -Force -Path $archive, $misc | Out-Null

Write-Host "Desktop cleanup — arhiva: $archive" -ForegroundColor Cyan

# Stari folderi koji ne trebaju na Desktopu (bez aktivnog omni group)
$staleFolders = @('apps', 'Craftor', 'Forge master v1111', 'Omnigroup master', 'pdf', 'pun env fajl')
foreach ($name in $staleFolders) {
  $src = Join-Path $desktop $name
  if (-not (Test-Path $src)) { continue }
  $dst = Join-Path $archive $name
  try {
    if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
    Move-Item -LiteralPath $src -Destination $dst -Force
    Write-Host "  Arhiviran folder: $name" -ForegroundColor Green
  } catch {
    Write-Host "  Preskocen $name — $($_.Exception.Message)" -ForegroundColor Yellow
  }
}

# Rasuti fajlovi sa Desktopa
$staleFiles = @(
  'index.html', 'index2.html', 'cursor_bot.py.txt', 'env beleska.txt', 'env lista tht.txt',
  'atina-platform.zip', 'cv.docx', 'Marko_Kosic_CV.docx', 'SAD.xlsx'
)
foreach ($f in $staleFiles) {
  $src = Join-Path $desktop $f
  if (-not (Test-Path $src)) { continue }
  try {
    Move-Item -LiteralPath $src -Destination (Join-Path $misc $f) -Force
    Write-Host "  Arhiviran fajl: $f" -ForegroundColor Green
  } catch {
    Write-Host "  Preskocen $f" -ForegroundColor Yellow
  }
}

# OneDrive " - Copy" duplikati u repou
$copyRemoved = 0
Get-ChildItem $repoRoot -Recurse -Directory -Force -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match ' - Copy$' } |
  ForEach-Object {
    try {
      Remove-Item $_.FullName -Recurse -Force -ErrorAction Stop
      $copyRemoved++
    } catch {}
  }
Write-Host "Uklonjeno OneDrive Copy foldera: $copyRemoved" -ForegroundColor Cyan

# Duplikat arhive u sve/ (npr. file (1).zip)
$sve = Join-Path $repoRoot 'sve'
if (Test-Path $sve) {
  $dupRemoved = 0
  Get-ChildItem $sve -File -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match ' \(\d+\)\.' } |
    ForEach-Object {
      try {
        Remove-Item $_.FullName -Force -ErrorAction Stop
        $dupRemoved++
      } catch {}
    }
  Write-Host "Uklonjeno duplikat arhiva u sve/: $dupRemoved" -ForegroundColor Cyan
}

$freeGb = [math]::Round((Get-PSDrive C).Free / 1GB, 1)
Write-Host "C: slobodno: $freeGb GB" -ForegroundColor $(if ($freeGb -lt 15) { 'Yellow' } else { 'Green' })
Write-Host ''
Write-Host 'Savet: desni klik na OneDrive ikonu -> Help & Settings -> Pause syncing 2 min pa Resume.' -ForegroundColor DarkGray
Write-Host 'Dev repo: C:\dev\omni group (van OneDrive sync-a).' -ForegroundColor DarkGray
