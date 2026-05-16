# Free TCP listen port (default 3000) — Windows; see RUN-ATINA-PLATFORM.txt, NIVO-1-GATE.md; monorepo ../../../NIVO-1-START.md
param(
  [int]$Port = 3000,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

if (-not $listeners) {
  [pscustomobject]@{
    ok = $true
    port = $Port
    action = 'none'
    message = 'No listener found.'
  } | ConvertTo-Json -Compress
  exit 0
}

$pids = $listeners | Select-Object -ExpandProperty OwningProcess -Unique

if ($DryRun) {
  [pscustomobject]@{
    ok = $true
    port = $Port
    action = 'dry-run'
    pids = $pids
  } | ConvertTo-Json -Compress
  exit 0
}

foreach ($processId in $pids) {
  if (Get-Process -Id $processId -ErrorAction SilentlyContinue) {
    Stop-Process -Id $processId -Force
  }
}

[pscustomobject]@{
  ok = $true
  port = $Port
  action = 'stopped'
  pids = $pids
} | ConvertTo-Json -Compress
