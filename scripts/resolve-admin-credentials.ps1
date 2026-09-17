# Resolves admin email/password for smoke/E2E scripts.
# Dev: ADMIN-CREDENTIALS.local.txt (falls back to default).
# Prod: deploy.config.json -> .env.vps.prod (never local dev file).

function Read-AdminEnvFile([string]$Path) {
  $email = ''
  $password = ''
  if (-not (Test-Path $Path)) { return @{ Email = $email; Password = $password } }
  foreach ($line in Get-Content $Path) {
    if ($line -match '^ADMIN_EMAIL=(.+)$') { $email = $Matches[1].Trim() }
    if ($line -match '^ADMIN_PASSWORD=(.+)$') { $password = $Matches[1].Trim() }
  }
  return @{ Email = $email; Password = $password }
}

function Get-AdminCredentials {
  param(
    [string]$RepoRoot = (Split-Path $PSScriptRoot -Parent),
    [switch]$Prod
  )

  $email = 'admin@atina.io'
  $password = 'Admin@123456'

  if ($Prod) {
    $deployCfgPath = Join-Path $RepoRoot 'deploy-secrets.local\deploy.config.json'
    if (Test-Path $deployCfgPath) {
      $cfg = Get-Content $deployCfgPath -Raw | ConvertFrom-Json
      if ($cfg.adminEmail -and "$($cfg.adminEmail)".Trim()) {
        $email = "$($cfg.adminEmail)".Trim()
      }
      if ($cfg.adminPassword -and "$($cfg.adminPassword)".Trim()) {
        $password = "$($cfg.adminPassword)".Trim()
        return @{ Email = $email; Password = $password }
      }
    }

    $vpsPath = Join-Path $RepoRoot 'atina-platform\atina\.env.vps.prod'
    $fromVps = Read-AdminEnvFile $vpsPath
    if ($fromVps.Email) { $email = $fromVps.Email }
    if ($fromVps.Password) {
      return @{ Email = $email; Password = $fromVps.Password }
    }

    throw 'Prod admin credentials missing: set deploy.config.json adminPassword or atina/.env.vps.prod ADMIN_PASSWORD'
  }

  $localPath = Join-Path $RepoRoot 'atina-platform\atina\ADMIN-CREDENTIALS.local.txt'
  $vpsPath = Join-Path $RepoRoot 'atina-platform\atina\.env.vps.prod'
  $paths = if (Test-Path $localPath) { @($localPath) } elseif (Test-Path $vpsPath) { @($vpsPath) } else { @() }
  foreach ($path in $paths) {
    $fromFile = Read-AdminEnvFile $path
    if ($fromFile.Email) { $email = $fromFile.Email }
    if ($fromFile.Password) { $password = $fromFile.Password }
  }

  return @{ Email = $email; Password = $password }
}

function Test-ProdWebBase([string]$WebBase) {
  $base = $WebBase.TrimEnd('/')
  return ($base -match '^https://' -and $base -notmatch 'localhost|127\.0\.0\.1')
}
