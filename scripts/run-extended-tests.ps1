#Requires -Version 5.1
<#
  Extended test battery: contact/Resend, extra Atina smokes, optional Nest/Astra stack.
  Prod API smokes use Get-AdminCredentials -Prod. Logs: docs/generated/EXTENDED-TESTS-LATEST.md
#>
param(
  [string]$WebBase = 'https://omnigrouptech.com',
  [string]$AtinaBase = 'https://api.omnigrouptech.com',
  [switch]$SkipNestAstra,
  [switch]$SkipHuntPipeline,
  [switch]$SkipContact,
  [switch]$RunCategorySeed
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
$atinaScripts = Join-Path $repoRoot 'atina-platform\atina\scripts'
. (Join-Path $scriptsDir 'resolve-admin-credentials.ps1')
$creds = Get-AdminCredentials -RepoRoot $repoRoot -Prod
$api = $AtinaBase.Trim().TrimEnd('/')
$results = New-Object System.Collections.Generic.List[string]

function Record([string]$name, [bool]$ok, [string]$detail = '') {
  $line = if ($ok) { "PASS $name" } else { "FAIL $name" }
  if ($detail) { $line += " - $detail" }
  $script:results.Add($line) | Out-Null
  Write-Host $line -ForegroundColor $(if ($ok) { 'Green' } else { 'Red' })
}

Write-Host '=== Extended tests ===' -ForegroundColor Cyan

if (-not $SkipContact) {
  try {
    & (Join-Path $scriptsDir 'test-contact-resend.ps1') -Prod -WebBase $WebBase
    Record 'test:contact (Resend prod)' $true
  } catch {
    Record 'test:contact (Resend prod)' $false $_.Exception.Message
  }
}

$smokeJobs = @(
  @{ Name = 'smoke:hunting:quick'; File = 'smoke-hunting.ps1'; Args = @{ SkipPipeline = $true } },
  @{ Name = 'smoke:evolution'; File = 'smoke-evolution.ps1'; Args = @{} },
  @{ Name = 'smoke:product-factory'; File = 'smoke-product-factory.ps1'; Args = @{} }
)
foreach ($job in $smokeJobs) {
  try {
    $p = @{
      BaseUrl  = $api
      Email    = $creds.Email
      Password = $creds.Password
    }
    foreach ($k in $job.Args.Keys) { $p[$k] = $job.Args[$k] }
    & (Join-Path $atinaScripts $job.File) @p
    Record $job.Name $true
  } catch {
    Record $job.Name $false $_.Exception.Message
  }
}

try {
  $catArgs = @{
    BaseUrl  = $api
    Email    = $creds.Email
    Password = $creds.Password
  }
  if ($RunCategorySeed) { $catArgs['DoSeed'] = $true }
  & (Join-Path $atinaScripts 'smoke-category-rollout.ps1') @catArgs
  Record 'smoke:category-rollout' $true $(if ($RunCategorySeed) { 'DoSeed' } else { 'no seed' })
} catch {
  Record 'smoke:category-rollout' $false $_.Exception.Message
}

if (-not $SkipHuntPipeline) {
  Push-Location (Join-Path $repoRoot 'atina-platform\atina')
  try {
    if (-not (Test-Path '.env')) { throw 'missing .env (OPENROUTER/GEMINI keys)' }
    python test_pipeline.py 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "exit $LASTEXITCODE" }
    Record 'test:hunt-pipeline' $true
  } catch {
    Record 'test:hunt-pipeline' $false $_.Exception.Message
  } finally {
    Pop-Location
  }
}

if (-not $SkipNestAstra) {
  try {
    & (Join-Path $scriptsDir 'smoke-stack.ps1') -SkipNode:$false -AtinaNodeBase $api -AstraBase 'http://127.0.0.1:8080' -NestBase 'http://127.0.0.1:3001'
    Record 'smoke-stack (Astra+Nest+Atina health)' $true
  } catch {
    Record 'smoke-stack' $false $_.Exception.Message
  }
}

$fail = @($results | Where-Object { $_ -like 'FAIL*' }).Count
$outPath = Join-Path $repoRoot 'docs\generated\EXTENDED-TESTS-LATEST.md'
@"
# Extended tests $(Get-Date -Format o)

Web: $WebBase | API: $api

$(($results -join "`n"))

Failures: $fail
"@ | Set-Content -Path $outPath -Encoding UTF8

Write-Host "`nWrote $outPath" -ForegroundColor DarkGray
if ($fail -gt 0) { exit 1 }
Write-Host 'Extended tests: all PASS' -ForegroundColor Green
