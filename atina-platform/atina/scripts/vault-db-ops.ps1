# npm: npm run vault:backup | vault:prune | vault:restore:latest
# restore-file: pass -Action restore-file -SourceFile '<path>' (not wired in package.json).
# Paths are resolved from the current working directory (run from repo root).
param(
  [ValidateSet('backup', 'prune', 'restore-latest', 'restore-file')]
  [string]$Action = 'backup',
  [string]$VaultPath = './data/vault.db',
  [string]$BackupDir = './data/vault-backups',
  [int]$RetentionDays = 14,
  [int]$KeepLast = 20,
  [string]$SourceFile = ''
)

$ErrorActionPreference = 'Stop'

function Resolve-FullPath([string]$PathValue) {
  $trimmed = $PathValue.Trim()
  if ([string]::IsNullOrWhiteSpace($trimmed)) {
    throw "Path value cannot be empty."
  }
  return [System.IO.Path]::GetFullPath($trimmed)
}

function Ensure-Directory([string]$DirectoryPath) {
  if (-not (Test-Path -LiteralPath $DirectoryPath)) {
    New-Item -ItemType Directory -Path $DirectoryPath | Out-Null
  }
}

function Get-BackupFiles([string]$DirectoryPath) {
  if (-not (Test-Path -LiteralPath $DirectoryPath)) {
    return @()
  }
  return Get-ChildItem -LiteralPath $DirectoryPath -File -Filter 'vault-*.db' | Sort-Object LastWriteTime -Descending
}

$resolvedVaultPath = Resolve-FullPath $VaultPath
$resolvedBackupDir = Resolve-FullPath $BackupDir
Ensure-Directory $resolvedBackupDir

switch ($Action) {
  'backup' {
    if (-not (Test-Path -LiteralPath $resolvedVaultPath)) {
      throw "Vault DB not found at '$resolvedVaultPath'."
    }
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $backupPath = Join-Path $resolvedBackupDir "vault-$stamp.db"
    Copy-Item -LiteralPath $resolvedVaultPath -Destination $backupPath -Force
    [pscustomobject]@{
      ok = $true
      action = 'backup'
      vaultPath = $resolvedVaultPath
      backupPath = $backupPath
    } | ConvertTo-Json -Compress
  }
  'prune' {
    $files = Get-BackupFiles $resolvedBackupDir
    $cutoff = (Get-Date).AddDays(-1 * [Math]::Abs($RetentionDays))
    $byAge = $files | Where-Object { $_.LastWriteTime -lt $cutoff }
    $byCount = @()
    if ($files.Count -gt $KeepLast) {
      $byCount = $files | Select-Object -Skip $KeepLast
    }

    $toRemove = @($byAge + $byCount | Select-Object -Unique)
    foreach ($file in $toRemove) {
      Remove-Item -LiteralPath $file.FullName -Force
    }

    [pscustomobject]@{
      ok = $true
      action = 'prune'
      backupDir = $resolvedBackupDir
      removedCount = $toRemove.Count
      remainingCount = (Get-BackupFiles $resolvedBackupDir).Count
      retentionDays = $RetentionDays
      keepLast = $KeepLast
    } | ConvertTo-Json -Compress
  }
  'restore-latest' {
    $files = Get-BackupFiles $resolvedBackupDir
    if ($files.Count -lt 1) {
      throw "No backup files found in '$resolvedBackupDir'."
    }
    Copy-Item -LiteralPath $files[0].FullName -Destination $resolvedVaultPath -Force
    [pscustomobject]@{
      ok = $true
      action = 'restore-latest'
      source = $files[0].FullName
      destination = $resolvedVaultPath
    } | ConvertTo-Json -Compress
  }
  'restore-file' {
    if ([string]::IsNullOrWhiteSpace($SourceFile)) {
      throw "SourceFile is required for action 'restore-file'."
    }
    $resolvedSource = Resolve-FullPath $SourceFile
    if (-not (Test-Path -LiteralPath $resolvedSource)) {
      throw "Source backup file not found at '$resolvedSource'."
    }
    Copy-Item -LiteralPath $resolvedSource -Destination $resolvedVaultPath -Force
    [pscustomobject]@{
      ok = $true
      action = 'restore-file'
      source = $resolvedSource
      destination = $resolvedVaultPath
    } | ConvertTo-Json -Compress
  }
}
