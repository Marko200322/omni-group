# Eksportuje metadata generisanih vertical pack-ova za web katalog (bez Docker).
param(
  [string]$GeneratedDir = '',
  [string]$OutFile = ''
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$repoRoot = Split-Path -Parent (Split-Path -Parent $root)

if (-not $GeneratedDir) { $GeneratedDir = Join-Path $root 'data\generated-verticals' }
if (-not $OutFile) {
  $OutFile = Join-Path $repoRoot 'apps\omnigroup-web\src\lib\generated-verticals-index.json'
}

if (-not (Test-Path $GeneratedDir)) {
  Write-Host "Nema foldera: $GeneratedDir (pokreni generate kad API radi)"
  @() | ConvertTo-Json | Set-Content -Path $OutFile -Encoding UTF8
  exit 0
}

$entries = @()
Get-ChildItem -Path $GeneratedDir -Directory | ForEach-Object {
  $slug = $_.Name
  $hasPage = Test-Path (Join-Path $_.FullName "$slug-page.tsx")
  $hasOutreach = Test-Path (Join-Path $_.FullName "$slug-outreach.md")
  $entries += [ordered]@{
    slug = $slug
    hasPage = $hasPage
    hasOutreach = $hasOutreach
    updatedAt = $_.LastWriteTimeUtc.ToString('o')
  }
}

$entries = $entries | Sort-Object slug
$payload = @{
  generatedAt = (Get-Date).ToUniversalTime().ToString('o')
  count = $entries.Count
  verticals = $entries
}

$dir = Split-Path -Parent $OutFile
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
$payload | ConvertTo-Json -Depth 5 | Set-Content -Path $OutFile -Encoding UTF8
Write-Host "Sync: $($entries.Count) vertikala -> $OutFile"
