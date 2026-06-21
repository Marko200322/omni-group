# Resolves admin email/password from ADMIN-CREDENTIALS.local.txt (falls back to dev default).
function Get-AdminCredentials {
  param([string]$RepoRoot = (Split-Path $PSScriptRoot -Parent))
  $email = 'admin@atina.io'
  $password = 'Admin@123456'
  $path = Join-Path $RepoRoot 'atina-platform\atina\ADMIN-CREDENTIALS.local.txt'
  if (Test-Path $path) {
    foreach ($line in Get-Content $path) {
      if ($line -match '^ADMIN_EMAIL=(.+)$') { $email = $Matches[1].Trim() }
      if ($line -match '^ADMIN_PASSWORD=(.+)$') { $password = $Matches[1].Trim() }
    }
  }
  return @{ Email = $email; Password = $password }
}
