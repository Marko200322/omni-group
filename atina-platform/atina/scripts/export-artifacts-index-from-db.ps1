# Export generated_artifacts index from PostgreSQL for web sync (no file content on disk required).
param(
  [string]$OutFile = ''
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $root '..\..')).Path

if (-not $OutFile) {
  $OutFile = Join-Path $repoRoot 'apps\omnigroup-web\src\lib\generated-verticals-index.json'
}

$sql = @"
SELECT vertical_slug AS slug,
       BOOL_OR(artifact_type = 'page_tsx') AS has_page,
       BOOL_OR(artifact_type = 'outreach_md') AS has_outreach,
       MAX(created_at) AS updated_at
FROM generated_artifacts
GROUP BY vertical_slug
ORDER BY vertical_slug;
"@

$raw = docker exec atina_postgres psql -U atina_user -d atina_saas_db -t -A -F '|' -c $sql 2>&1
if ($LASTEXITCODE -ne 0) { throw $raw }

$verticals = @()
foreach ($line in ($raw -split "`n")) {
  $t = $line.Trim()
  if (-not $t) { continue }
  $p = $t -split '\|'
  if ($p.Count -lt 4) { continue }
  $verticals += [ordered]@{
    slug = $p[0]
    hasPage = ($p[1] -eq 't')
    hasOutreach = ($p[2] -eq 't')
    updatedAt = $p[3]
  }
}

$payload = @{
  generatedAt = (Get-Date).ToUniversalTime().ToString('o')
  count = $verticals.Count
  source = 'postgres:generated_artifacts'
  verticals = $verticals
}

$dir = Split-Path -Parent $OutFile
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
$payload | ConvertTo-Json -Depth 5 | Set-Content -Path $OutFile -Encoding UTF8
Write-Host "DB export: $($verticals.Count) vertikala -> $OutFile"
