<#
.SYNOPSIS
  Restart Atina API sa host dev serverom (brzi reload koda nego Docker rebuild).

.EXAMPLE
  .\scripts\restart-atina-dev.ps1
  .\scripts\restart-atina-dev.ps1 -Port 3001
#>
#Requires -Version 5.1
param(
  [int]$Port = 0,
  [switch]$RelaxRateLimit
)

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$atina = Join-Path $root 'atina-platform\atina'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptsDir 'rate-limit-retry.ps1')

function Test-PortHealthy([int]$LocalPort) {
  try {
    $uri = 'http://127.0.0.1:' + $LocalPort + '/health'
    $r = Invoke-QuickWebGet -Uri $uri -TimeoutSec 3
    return ($r.StatusCode -eq 200)
  } catch {
    return $false
  }
}

function Get-ListenerPid([int]$LocalPort) {
  try {
    $conn = Get-NetTCPConnection -LocalPort $LocalPort -State Listen -ErrorAction Stop | Select-Object -First 1
    if ($conn) { return $conn.OwningProcess }
  } catch {
    $line = netstat -ano | Select-String (":$LocalPort\s") | Select-String 'LISTENING' | Select-Object -First 1
    if ($line) {
      $parts = ($line.ToString().Trim() -split '\s+')
      return [int]$parts[-1]
    }
  }
  return $null
}

function Stop-DockerAtinaWithTimeout([int]$Seconds = 12) {
  Write-Host ('Stopping Docker atina_app (max ' + $Seconds + 's)...') -ForegroundColor Cyan
  $job = Start-Job { docker stop atina_app 2>$null | Out-Null }
  $done = Wait-Job $job -Timeout $Seconds
  if (-not $done) {
    Write-Host 'Docker stop timeout - Docker Desktop mozda zaglavljen. Nastavljam sa host dev...' -ForegroundColor Yellow
    Stop-Job $job -ErrorAction SilentlyContinue
    Remove-Job $job -Force -ErrorAction SilentlyContinue
    return $false
  }
  Receive-Job $job | Out-Null
  Remove-Job $job -Force -ErrorAction SilentlyContinue
  return $true
}

if (-not $Port) {
  $Port = if ($env:ATINA_DEV_PORT) { [int]$env:ATINA_DEV_PORT } else { 3000 }
}

Stop-DockerAtinaWithTimeout | Out-Null

if ($RelaxRateLimit) {
  $listener = Get-ListenerPid $Port
  if ($listener) {
    Write-Host ('RelaxRateLimit: stopping PID ' + $listener + ' on port ' + $Port) -ForegroundColor Yellow
    Stop-Process -Id $listener -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
  }
} elseif (-not (Test-PortHealthy $Port)) {
  $listener = Get-ListenerPid $Port
  if ($listener -and -not (Test-PortHealthy $Port)) {
    Write-Host ('Port ' + $Port + ' slusa PID ' + $listener + ' ali health ne radi - Docker freeze?') -ForegroundColor Yellow
    foreach ($alt in @(3001, 3003, 3004)) {
      if (-not (Get-ListenerPid $alt)) {
        Write-Host ('Prebacujem Atina dev na port ' + $alt) -ForegroundColor Yellow
        $Port = $alt
        break
      }
      if (Test-PortHealthy $alt) {
        Write-Host ('Atina vec radi na portu ' + $alt) -ForegroundColor Green
        exit 0
      }
    }
  }
}

Write-Host ('Starting Atina npm run dev on port ' + $Port + ' ...') -ForegroundColor Cyan
Push-Location $atina
$relaxPrefix = if ($RelaxRateLimit) { '$env:RATE_LIMIT_DISABLED=''true''; ' } else { '' }
$devCmd = $relaxPrefix + '$env:PORT=''' + $Port + '''; $env:NODE_OPTIONS=''--max-old-space-size=4096''; npm run dev'
Start-Process powershell -ArgumentList '-NoProfile', '-Command', $devCmd -WindowStyle Minimized
Pop-Location

$deadline = (Get-Date).AddSeconds(50)
while ((Get-Date) -lt $deadline) {
  if (Test-PortHealthy $Port) {
    $base = 'http://127.0.0.1:' + $Port
    Write-Host ('Atina OK ' + $base + '/health') -ForegroundColor Green
    if ($Port -ne 3000) {
      Write-Host ('NAPOMENA: .env.local -> NEXT_PUBLIC_ATINA_API_BASE=' + $base) -ForegroundColor Yellow
    }
    exit 0
  }
  Start-Sleep -Seconds 3
}

Write-Host ('Atina not ready on port ' + $Port + ' - proveri minimizovan PowerShell prozor.') -ForegroundColor Yellow
exit 1
