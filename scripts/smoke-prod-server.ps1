# Full HTTP smoke suite against production (omnigrouptech.com).
#Requires -Version 5.1
param(
  [string]$WebBase = 'https://omnigrouptech.com',
  [string]$AtinaBase = 'https://omnigrouptech.com',
  [switch]$SkipDns,
  [switch]$SkipHuntingPipeline
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path $scriptsDir -Parent
Set-Location $repoRoot

$passed = 0
$failed = 0
$warn = 0
$results = New-Object System.Collections.Generic.List[object]

function Record-Result {
  param([string]$Name, [string]$Status, [string]$Detail = '')
  $script:results.Add([pscustomobject]@{ Test = $Name; Status = $Status; Detail = $Detail }) | Out-Null
  switch ($Status) {
    'PASS' { $script:passed++; Write-Host "  PASS $Name" -ForegroundColor Green }
    'WARN' { $script:warn++; Write-Host "  WARN $Name - $Detail" -ForegroundColor Yellow }
    default { $script:failed++; Write-Host "  FAIL $Name - $Detail" -ForegroundColor Red }
  }
}

function Invoke-Step {
  param([string]$Name, [scriptblock]$Action, [switch]$AllowWarn)
  Write-Host ''
  Write-Host "== $Name ==" -ForegroundColor Cyan
  try {
    & $Action
    if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) {
      if ($AllowWarn) {
        Record-Result $Name 'WARN' "exit $LASTEXITCODE"
      } else {
        Record-Result $Name 'FAIL' "exit $LASTEXITCODE"
      }
      return
    }
    Record-Result $Name 'PASS'
  } catch {
    if ($AllowWarn) {
      Record-Result $Name 'WARN' $_.Exception.Message
    } else {
      Record-Result $Name 'FAIL' $_.Exception.Message
    }
  }
}

Write-Host '=== smoke-prod-server ===' -ForegroundColor Cyan
Write-Host "  Web:   $WebBase"
Write-Host "  Atina: $AtinaBase"

function Wait-BetweenSuites {
  param([int]$Seconds = 8)
  Write-Host "  (pauza ${Seconds}s izmedju suite-ova...)" -ForegroundColor DarkGray
  Start-Sleep -Seconds $Seconds
}

if (-not $SkipDns) {
  Invoke-Step 'verify-production-dns' {
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $scriptsDir 'verify-production-dns.ps1')
    if ($LASTEXITCODE -ne 0) { throw "DNS verification failed" }
  }
}

Invoke-Step 'smoke-platform-full' {
  & (Join-Path $scriptsDir 'smoke-platform-full.ps1') -WebBase $WebBase
}

Wait-BetweenSuites

Invoke-Step 'staging-smoke-remote (Atina smoke:all)' {
  & (Join-Path $scriptsDir 'staging-smoke-remote.ps1') -AtinaNodeBase $AtinaBase
}

Wait-BetweenSuites

Invoke-Step 'smoke-web-integration' {
  & (Join-Path $scriptsDir 'smoke-web-integration.ps1') `
    -WebBase $WebBase `
    -AtinaBase $AtinaBase `
    -SkipEnsureWeb `
    -SkipEnsureAtina
}

Wait-BetweenSuites

$huntingArgs = @{
  WebBase = $WebBase
  AtinaBase = $AtinaBase
  SkipEnsureWeb = $true
  SkipEnsureAtina = $true
}
if ($SkipHuntingPipeline) { $huntingArgs.SkipPipeline = $true }

Invoke-Step 'smoke-hunting-integration' {
  & (Join-Path $scriptsDir 'smoke-hunting-integration.ps1') @huntingArgs
}

Wait-BetweenSuites

Invoke-Step 'test-upload-spike' {
  & (Join-Path $scriptsDir 'test-upload-spike.ps1') -WebBase $WebBase -SkipEnsureWeb
}

Wait-BetweenSuites

Invoke-Step 'test-contact-resend' {
  & (Join-Path $scriptsDir 'test-contact-resend.ps1') -WebBase $WebBase -Prod
}

Wait-BetweenSuites

Invoke-Step 'smoke-hunting (Atina direct)' {
  Push-Location (Join-Path $repoRoot 'atina-platform\atina')
  if ($SkipHuntingPipeline) {
    npm.cmd run smoke:hunting -- -BaseUrl $AtinaBase -SkipPipeline
  } else {
    npm.cmd run smoke:hunting -- -BaseUrl $AtinaBase
  }
  if ($LASTEXITCODE -ne 0) { throw "smoke:hunting exit $LASTEXITCODE" }
  Pop-Location
}

Write-Host ''
Write-Host '=== Summary ===' -ForegroundColor Cyan
$results | Format-Table -AutoSize
Write-Host "Totals: $script:passed passed, $script:warn warn, $script:failed failed" -ForegroundColor $(if ($script:failed -eq 0) { 'Green' } else { 'Red' })
if ($script:failed -gt 0) { exit 1 }
