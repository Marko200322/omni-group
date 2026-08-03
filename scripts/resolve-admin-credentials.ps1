# Resolves admin email/password from ADMIN-CREDENTIALS.local.txt (falls back to dev default).
function Get-AdminCredentials {
  param([string]$RepoRoot = (Split-Path $PSScriptRoot -Parent))
  $email = 'admin@atina.io'
  $password = 'Admin@123456'
  $localPath = Join-Path $RepoRoot 'atina-platform\atina\ADMIN-CREDENTIALS.local.txt'
  $vpsPath = Join-Path $RepoRoot 'atina-platform\atina\.env.vps.prod'
  # Local credentials win for dev smoke; VPS template only when local file is absent.
  $paths = if (Test-Path $localPath) { @($localPath) } elseif (Test-Path $vpsPath) { @($vpsPath) } else { @() }
  foreach ($path in $paths) {
    if (-not (Test-Path $path)) { continue }
    foreach ($line in Get-Content $path) {
      if ($line -match '^ADMIN_EMAIL=(.+)$') { $email = $Matches[1].Trim() }
      if ($line -match '^ADMIN_PASSWORD=(.+)$') { $password = $Matches[1].Trim() }
    }
  }
  return @{ Email = $email; Password = $password }
}
