#Requires -Version 5.1
<#
.SYNOPSIS
  Audits integration keys — reports SET vs EMPTY only (never prints secret values).

.OUTPUTS
  docs/generated/EMPTY-KEYS.md
#>
param(
  [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot),
  [string]$OutFile = ''
)

$ErrorActionPreference = 'Stop'
if (-not $OutFile) {
  $OutFile = Join-Path $RepoRoot 'docs\generated\EMPTY-KEYS.md'
}

$kljuceviPath = Join-Path $RepoRoot 'atina-platform\atina\KLJUCEVI-POPUNI.local.txt'
$deployPath = Join-Path $RepoRoot 'deploy-secrets.local\deploy.config.json'

function Test-IsEmpty([string]$Value) {
  if ($null -eq $Value) { return $true }
  $t = $Value.Trim()
  return [string]::IsNullOrWhiteSpace($t)
}

function Add-KeyEntry {
  param([System.Collections.Generic.List[object]]$List, [string]$Name, [string]$Source, [string]$Value)
  $List.Add([pscustomobject]@{
      Name   = $Name
      Source = $Source
      Status = if (Test-IsEmpty $Value) { 'EMPTY' } else { 'SET' }
    })
}

$entries = [System.Collections.Generic.List[object]]::new()

if (Test-Path $kljuceviPath) {
  Get-Content -LiteralPath $kljuceviPath -Encoding UTF8 | ForEach-Object {
    if ($_ -match '^\s*([A-Z][A-Z0-9_]*)=(.*)$') {
      Add-KeyEntry -List $entries -Name $Matches[1] -Source 'KLJUCEVI' -Value $Matches[2]
    }
  }
} else {
  Write-Warning "Missing $kljuceviPath — skipping KLJUCEVI scan."
}

function Walk-JsonObject {
  param($Node, [string]$Prefix, [string]$Source)
  if ($null -eq $Node) { return }
  if ($Node -is [System.Collections.IDictionary] -or ($Node.PSObject.TypeNames -contains 'System.Management.Automation.PSCustomObject')) {
    foreach ($prop in $Node.PSObject.Properties) {
      if ($prop.Name.StartsWith('_')) { continue }
      $path = if ($Prefix) { "$Prefix.$($prop.Name)" } else { $prop.Name }
      $val = $prop.Value
      if ($val -is [string] -or $val -is [bool] -or $val -is [int] -or $val -is [long] -or $val -is [double]) {
        if ($val -is [string]) {
          Add-KeyEntry -List $entries -Name $path -Source $Source -Value ([string]$val)
        }
      } else {
        Walk-JsonObject -Node $val -Prefix $path -Source $Source
      }
    }
  }
}

if (Test-Path $deployPath) {
  $deploy = Get-Content -LiteralPath $deployPath -Raw -Encoding UTF8 | ConvertFrom-Json
  Walk-JsonObject -Node $deploy -Prefix '' -Source 'deploy.config'
} else {
  Write-Warning "Missing $deployPath — skipping deploy.config scan."
}

$unique = @{}
foreach ($e in ($entries | Sort-Object Name)) {
  $key = "$($e.Source)|$($e.Name)"
  if (-not $unique.ContainsKey($key)) { $unique[$key] = $e }
}
$all = $unique.Values | Sort-Object Source, Name
$empty = $all | Where-Object { $_.Status -eq 'EMPTY' }
$set = $all | Where-Object { $_.Status -eq 'SET' }

$outDir = Split-Path -Parent $OutFile
if (-not (Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

$ts = (Get-Date).ToString('yyyy-MM-dd HH:mm')
$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine('# EMPTY / SET keys (auto-generated)')
[void]$sb.AppendLine('')
[void]$sb.AppendLine("**Generated:** $ts")
[void]$sb.AppendLine('**Command:** ``.\scripts\audit-empty-keys.ps1``')
[void]$sb.AppendLine('**Rule:** vrednosti se **nikad** ne ispisuju - samo SET / EMPTY.')
[void]$sb.AppendLine('')
[void]$sb.AppendLine("**Summary:** $($empty.Count) EMPTY · $($set.Count) SET")
[void]$sb.AppendLine('')
[void]$sb.AppendLine('Kanonska lista: [`STATUS-KANON.md`](../STATUS-KANON.md)')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('## EMPTY')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('| Key | Source |')
[void]$sb.AppendLine('|-----|--------|')
foreach ($e in $empty) {
  [void]$sb.AppendLine("| ``$($e.Name)`` | $($e.Source) |")
}
[void]$sb.AppendLine('')
[void]$sb.AppendLine('## SET (reference only)')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('| Key | Source |')
[void]$sb.AppendLine('|-----|--------|')
foreach ($e in $set) {
  [void]$sb.AppendLine("| ``$($e.Name)`` | $($e.Source) |")
}

[System.IO.File]::WriteAllText($OutFile, $sb.ToString(), [System.Text.UTF8Encoding]::new($false))
Write-Host "Wrote $OutFile ($($empty.Count) EMPTY, $($set.Count) SET)"
