#Requires -Version 5.1
<#
.SYNOPSIS
  Validate the Omni n8n outreach workflow and import it when N8N_* keys exist.

.EXAMPLE
  .\scripts\import-n8n-workflow.ps1
  .\scripts\import-n8n-workflow.ps1 -Live
#>
param(
  [switch]$Live
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$workflowPath = Join-Path $repoRoot 'tools\outreach-engine\n8n-production-workflow.json'

Write-Host '=== import-n8n-workflow ===' -ForegroundColor Cyan
if (-not (Test-Path $workflowPath)) { throw "Missing $workflowPath" }

$raw = Get-Content $workflowPath -Raw
$wf = $raw | ConvertFrom-Json
if (-not $wf.name) { throw 'Workflow JSON missing name' }
if (-not $wf.nodes -or $wf.nodes.Count -lt 3) { throw 'Workflow JSON missing nodes' }
if ($wf.active -eq $true) {
  throw 'Workflow JSON is active=true. Keep it inactive until outreach send is approved.'
}

Write-Host ("OK JSON: {0} ({1} nodes, active={2})" -f $wf.name, $wf.nodes.Count, $wf.active) -ForegroundColor Green

$configPath = Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json'
$base = $env:N8N_BASE_URL
$key = $env:N8N_API_KEY
if ((Test-Path $configPath)) {
  $cfg = Get-Content $configPath -Raw | ConvertFrom-Json
  if (-not $base) { $base = "$($cfg.n8nBaseUrl)".Trim() }
  if (-not $key) { $key = "$($cfg.n8nApiKey)".Trim() }
}

if (-not $Live -or -not $base -or -not $key) {
  Write-Host 'READY: live import skipped (need -Live and N8N_BASE_URL + N8N_API_KEY).' -ForegroundColor Yellow
  Write-Host '  Dispatch stays OFF unless OUTREACH_ENABLED=true on the n8n host.' -ForegroundColor DarkGray
  exit 0
}

$uri = ($base.TrimEnd('/')) + '/api/v1/workflows'
$headers = @{ 'X-N8N-API-KEY' = $key; 'Content-Type' = 'application/json' }
Write-Host "POST $uri" -ForegroundColor DarkGray
$res = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $raw -TimeoutSec 40
Write-Host ("IMPORTED id={0} active={1}" -f $res.id, $res.active) -ForegroundColor Green
if ($res.active -eq $true) {
  Write-Host 'WARN: n8n activated the workflow. Confirm OUTREACH_ENABLED is false.' -ForegroundColor Yellow
}
exit 0
