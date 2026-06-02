# Deploy Omni Group stack to Kubernetes (Faza 6)
param(
    [ValidateSet('staging', 'prod')]
    [string]$Overlay = 'staging',
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$kustomizePath = Join-Path $root "infra\k8s\overlays\$Overlay"

if (-not (Test-Path $kustomizePath)) {
    throw "Overlay not found: $kustomizePath"
}

Write-Host "Kustomize overlay: $Overlay"
Write-Host "Path: $kustomizePath"

if ($DryRun) {
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $out = kubectl kustomize $kustomizePath 2>&1
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prevEap
    if ($code -ne 0) {
        throw ($out | Out-String)
    }
    ($out | Where-Object { $_ -is [string] }) | Select-Object -First 40
    Write-Host "... (truncated preview; full: kubectl kustomize $kustomizePath)"
    exit 0
}

kubectl apply -k $kustomizePath
Write-Host "Done. Check: kubectl get pods -n omni-group-$Overlay"
Write-Host "Smoke: curl https://<your-ingress-host>/health"
