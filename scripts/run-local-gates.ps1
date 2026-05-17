<#
.SYNOPSIS
  Lokalni gate prolaz (pytest, Nest verify:n1, web lint/test/build) — koristi npm.cmd.

.DESCRIPTION
  Na Windows PowerShell-u `npm` poziva npm.ps1 koji pada ako je ExecutionPolicy Restricted.
  Ova skripta uvek koristi npm.cmd (isto kao u scripts/*).

.EXAMPLE
  .\scripts\run-local-gates.ps1
.EXAMPLE
  .\scripts\run-local-gates.ps1 -SkipWebBuild
.EXAMPLE
  .\scripts\run-local-gates.ps1 -IncludeAtinaCi
#>
#Requires -Version 5.1
param(
  [switch]$SkipWebBuild,
  [switch]$IncludeAtinaCi
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
Set-Location $repoRoot

function Run-Step {
  param([string]$Label, [scriptblock]$Action)
  Write-Host "== $Label ==" -ForegroundColor Cyan
  & $Action
  if ($LASTEXITCODE -ne 0) { throw "$Label failed (exit $LASTEXITCODE)" }
  Write-Host "  OK" -ForegroundColor Green
}

Write-Host '=== run-local-gates ===' -ForegroundColor Cyan
Write-Host 'Napomena: u PowerShell-u koristi npm.cmd umesto npm (ExecutionPolicy).' -ForegroundColor DarkGray
Write-Host ''

Run-Step 'pytest' {
  python -m pytest -q
}

Push-Location (Join-Path $repoRoot 'atina-system')
try {
  Run-Step 'atina-system verify:n1' {
    npm.cmd run verify:n1
  }
} finally {
  Pop-Location
}

if ($IncludeAtinaCi) {
  Push-Location (Join-Path $repoRoot 'atina-platform\atina')
  try {
    Run-Step 'atina test:ci' {
      npm.cmd run test:ci
    }
  } finally {
    Pop-Location
  }
}

Push-Location (Join-Path $repoRoot 'apps\omnigroup-web')
try {
  Run-Step 'omnigroup-web lint' {
    npm.cmd run lint
  }
  Run-Step 'omnigroup-web test:atina' {
    npm.cmd run test:atina
  }
  if (-not $SkipWebBuild) {
    Run-Step 'omnigroup-web build' {
      npm.cmd run build
    }
  } else {
    Write-Host '== omnigroup-web build ==' -ForegroundColor Cyan
    Write-Host '  preskoceno (-SkipWebBuild)' -ForegroundColor DarkGray
  }
} finally {
  Pop-Location
}

Write-Host ''
Write-Host 'run-local-gates: PASS' -ForegroundColor Green
