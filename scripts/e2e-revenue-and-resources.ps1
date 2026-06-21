<#
.SYNOPSIS
  E2E: revenue allocation + deliverable payment + resource shop cart (admin dashboard BFF).

.DESCRIPTION
  1) Resource shop: catalog → checkout → mark-paid → wallet credit
  2) Deliverable: checkout → mark-sent → admin confirm → revenue allocation ledger
  3) Plan billing smoke (optional quick path)

.EXAMPLE
  .\scripts\e2e-revenue-and-resources.ps1
#>
#Requires -Version 5.1
param(
  [string]$WebBase = 'http://127.0.0.1:3010',
  [string]$Email = 'admin@atina.io',
  [string]$Password = '',
  [string]$DeliverableId = 'setup-quick',
  [string]$ResourceSku = 'openrouter_10'
)

$ErrorActionPreference = 'Stop'
$web = $WebBase.TrimEnd('/')
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path $scriptsDir -Parent
. (Join-Path $scriptsDir 'rate-limit-retry.ps1')
. (Join-Path $scriptsDir 'resolve-admin-credentials.ps1')

if (-not $Password) {
  $creds = Get-AdminCredentials -RepoRoot $repoRoot
  $Email = $creds.Email
  $Password = $creds.Password
}

& (Join-Path $scriptsDir 'ensure-atina-api.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& (Join-Path $scriptsDir 'ensure-web-dev.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

function Invoke-BffJson {
  param(
    [string]$Method,
    [string]$Path,
    [Microsoft.PowerShell.Commands.WebRequestSession]$Session,
    [string]$Body = ''
  )
  $uri = "$web$Path"
  $params = @{
    Uri         = $uri
    Method      = $Method
    WebSession  = $Session
    UseBasicParsing = $true
  }
  if ($Body) {
    $params.ContentType = 'application/json'
    $params.Body = $Body
  }
  $r = Invoke-WebRequest @params
  return ($r.Content | ConvertFrom-Json)
}

Write-Host '== E2E revenue + resources + payment ==' -ForegroundColor Cyan

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json -Compress
$lj = Invoke-WithRateLimitRetry -Label 'login' -Action {
  $r = Invoke-WebRequest -Uri "$web/api/auth/login" -Method POST -ContentType 'application/json' -Body $loginBody -WebSession $session -UseBasicParsing
  return ($r.Content | ConvertFrom-Json)
}
if (-not $lj.ok) { throw 'Login failed' }
Write-Host "  login OK ($($lj.user.email), role=$($lj.user.role))" -ForegroundColor Green

# --- Resource shop (admin dashboard) ---
Write-Host '' 
Write-Host '-- Resource shop cart --' -ForegroundColor Cyan

$cat = Invoke-BffJson -Method GET -Path '/api/atina/resource-procurement/catalog' -Session $session
if (-not $cat.ok) { throw "Resource catalog failed: $($cat | ConvertTo-Json -Compress)" }
$catalogItems = @($cat.data.items)
if ($catalogItems.Count -lt 1) { throw 'Resource catalog empty' }
$skuItem = $catalogItems | Where-Object { $_.sku -eq $ResourceSku } | Select-Object -First 1
if (-not $skuItem) { throw "SKU $ResourceSku not in catalog" }
Write-Host "  catalog OK ($($catalogItems.Count) items, target=$ResourceSku)" -ForegroundColor Green

$setBefore = Invoke-BffJson -Method GET -Path '/api/atina/resource-procurement/settings' -Session $session
if (-not $setBefore.ok) { throw "Resource settings failed" }
$walletBefore = @($setBefore.data.wallets)
$orBefore = ($walletBefore | Where-Object { $_.providerId -eq 'openrouter' } | Select-Object -First 1).balanceEur
if ($null -eq $orBefore) { $orBefore = 0 }
Write-Host "  wallets before: openrouter=$orBefore EUR" -ForegroundColor DarkGray

$coBody = (@{ items = @(@{ sku = $ResourceSku; qty = 1 }) } | ConvertTo-Json -Compress)
$rco = Invoke-BffJson -Method POST -Path '/api/atina/resource-procurement/checkout' -Session $session -Body $coBody
if (-not $rco.ok) { throw "Resource checkout failed: $($rco | ConvertTo-Json -Compress)" }
$orderId = $rco.data.order.id
$ref = $rco.data.order.paymentReference
Write-Host "  resource checkout OK orderId=$orderId ref=$ref total=$($rco.data.order.totalAmount)" -ForegroundColor Green

$mp = Invoke-BffJson -Method POST -Path "/api/atina/resource-procurement/orders/$orderId/mark-paid" -Session $session
if (-not $mp.ok) { throw "Resource mark-paid failed: $($mp | ConvertTo-Json -Compress)" }
$pending = $mp.data.order.status
if ($pending -ne 'paid_pending_confirm') { throw "Expected paid_pending_confirm after mark-paid, got $pending" }
Write-Host '  resource mark-paid OK (pending confirm)' -ForegroundColor Green

$cf = Invoke-BffJson -Method POST -Path "/api/atina/resource-procurement/orders/$orderId/confirm" -Session $session
if (-not $cf.ok) { throw "Resource confirm failed: $($cf | ConvertTo-Json -Compress)" }
$fulfilled = $cf.data.order.status
if ($fulfilled -ne 'fulfilled') { throw "Expected fulfilled after confirm, got $fulfilled" }
Write-Host '  resource confirm OK (fulfilled)' -ForegroundColor Green

Start-Sleep -Seconds 1
$setAfter = Invoke-BffJson -Method GET -Path '/api/atina/resource-procurement/settings' -Session $session
$orAfter = ($setAfter.data.wallets | Where-Object { $_.providerId -eq 'openrouter' } | Select-Object -First 1).balanceEur
if ([double]$orAfter -le [double]$orBefore) {
  throw "OpenRouter wallet did not increase (before=$orBefore after=$orAfter)"
}
Write-Host "  wallet credited: openrouter $orBefore -> $orAfter EUR" -ForegroundColor Green

$ordList = Invoke-BffJson -Method GET -Path '/api/atina/resource-procurement/orders' -Session $session
$foundOrder = @($ordList.data.orders | Where-Object { $_.id -eq $orderId })
if ($foundOrder.Count -lt 1) { throw 'Order not in list after fulfill' }
Write-Host '  orders list OK' -ForegroundColor Green

# --- Deliverable payment + revenue allocation ---
Write-Host ''
Write-Host '-- Deliverable payment + revenue split --' -ForegroundColor Cyan

$dqBody = (@{
  deliverableId = $DeliverableId
  industryCategory = 'marketing'
  paymentProvider = 'manual'
} | ConvertTo-Json -Compress)
$dco = Invoke-BffJson -Method POST -Path '/api/atina/payments/manual/deliverable-checkout' -Session $session -Body $dqBody
if (-not $dco.ok -or -not $dco.data.paymentId) {
  throw "Deliverable checkout failed: $($dco | ConvertTo-Json -Compress)"
}
$paymentId = $dco.data.paymentId
Write-Host "  deliverable checkout OK paymentId=$paymentId amount=$($dco.data.amount)" -ForegroundColor Green

$ms = Invoke-BffJson -Method POST -Path "/api/atina/payments/manual/mark-sent/$paymentId" -Session $session -Body '{}'
if (-not $ms.ok) { throw "Mark sent failed" }
Write-Host '  mark-sent OK' -ForegroundColor Green

$cf = Invoke-BffJson -Method POST -Path "/api/atina/payments/manual/confirm/$paymentId" -Session $session -Body '{}'
if (-not $cf.ok) { throw "Admin confirm failed: $($cf | ConvertTo-Json -Compress)" }
Write-Host '  admin confirm OK' -ForegroundColor Green

Start-Sleep -Seconds 3

$alloc = Invoke-BffJson -Method GET -Path "/api/atina/billing/revenue-allocation/$paymentId" -Session $session
if (-not $alloc.ok) { throw "Revenue allocation lookup failed: $($alloc | ConvertTo-Json -Compress)" }
$row = $alloc.data
if (-not $row.payment_id -and -not $row.paymentId) { throw 'Allocation row missing payment id' }
function Get-RowNum($row, [string]$snake, [string]$camel) {
  if ($null -ne $row.$snake -and "$($row.$snake)" -ne '') { return [double]$row.$snake }
  if ($null -ne $row.$camel -and "$($row.$camel)" -ne '') { return [double]$row.$camel }
  return 0.0
}

$ownerNet = Get-RowNum $row 'owner_net_eur' 'ownerNetEur'
$gross = Get-RowNum $row 'gross_eur' 'grossEur'
$reinvest = Get-RowNum $row 'system_reinvest_eur' 'systemReinvestEur'
$resources = Get-RowNum $row 'resource_reserve_eur' 'resourceReserveEur'
if ($ownerNet -le 0) { throw "Owner net should be > 0, got $ownerNet" }
if ($gross -le 0) { throw "Gross should be > 0" }
$lines = @($row.lines)
if ($lines.Count -lt 2) { throw "Expected allocation lines, got $($lines.Count)" }
Write-Host "  revenue allocation OK gross=$gross ownerNet=$ownerNet reinvest=$reinvest resources=$resources lines=$($lines.Count)" -ForegroundColor Green

$sum = Invoke-BffJson -Method GET -Path '/api/atina/billing/revenue-allocation/summary' -Session $session
if (-not $sum.ok) { throw 'Revenue summary failed' }
if ([int]$sum.data.totals.paymentCount -lt 1) { throw 'Summary paymentCount should be >= 1' }
Write-Host "  revenue summary OK (payments=$($sum.data.totals.paymentCount) totalOwner=$($sum.data.totals.ownerNetEur))" -ForegroundColor Green

# --- Plan billing quick smoke ---
Write-Host ''
Write-Host '-- Plan billing (starter) --' -ForegroundColor Cyan
$pcoBody = (@{ planSlug = 'starter'; billingCycle = 'monthly' } | ConvertTo-Json -Compress)
$pco = Invoke-BffJson -Method POST -Path '/api/atina/payments/manual/checkout' -Session $session -Body $pcoBody
if (-not $pco.ok) { throw "Plan checkout failed" }
$planPayId = $pco.data.paymentId
Invoke-BffJson -Method POST -Path "/api/atina/payments/manual/mark-sent/$planPayId" -Session $session -Body '{}' | Out-Null
Invoke-BffJson -Method POST -Path "/api/atina/payments/manual/confirm/$planPayId" -Session $session -Body '{}' | Out-Null
Start-Sleep -Seconds 2
$planAlloc = Invoke-BffJson -Method GET -Path "/api/atina/billing/revenue-allocation/$planPayId" -Session $session
if (-not $planAlloc.ok) { throw 'Plan revenue allocation missing' }
Write-Host "  plan payment + allocation OK (owner=$($planAlloc.data.owner_net_eur))" -ForegroundColor Green

Write-Host ''
Write-Host 'e2e-revenue-and-resources: PASS' -ForegroundColor Green
