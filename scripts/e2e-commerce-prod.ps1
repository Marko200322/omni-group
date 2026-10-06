#Requires -Version 5.1
<#
.SYNOPSIS
  Prod commerce QA: login → Stripe test session → paid order → fulfillment → deliveries.

  Stripe LIVE is not used. Session creation proves the hosted Checkout path.
  Delivery is completed via the existing confirm → fulfillment job (same post-pay hook as the Stripe webhook).

.EXAMPLE
  .\scripts\e2e-commerce-prod.ps1
  .\scripts\e2e-commerce-prod.ps1 -DeliverableId setup-quick
#>
param(
  [string]$WebBase = 'https://omnigrouptech.com',
  [string]$DeliverableId = 'setup-quick',
  [string]$IndustryCategory = 'marketing',
  [string]$PlanSlug = 'starter',
  [int]$FulfillmentWaitSec = 180
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
. (Join-Path $scriptsDir 'resolve-admin-credentials.ps1')

$cfg = Get-Content (Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json') -Raw | ConvertFrom-Json
$web = $WebBase.TrimEnd('/')
$creds = Get-AdminCredentials -RepoRoot $repoRoot
$adminEmail = if ($cfg.adminEmail) { "$($cfg.adminEmail)".Trim() } else { $creds.Email }
$adminPassword = if ($cfg.adminPassword) { "$($cfg.adminPassword)" } else { $creds.Password }

function Invoke-BffJson {
  param(
    [string]$Method,
    [string]$Path,
    [Microsoft.PowerShell.Commands.WebRequestSession]$Session,
    [string]$Body = ''
  )
  $params = @{
    Uri             = "$web$Path"
    Method          = $Method
    WebSession      = $Session
    UseBasicParsing = $true
    TimeoutSec      = 120
    Headers         = @{
      Origin  = $web
      Referer = "$web/"
    }
  }
  if ($Session -and $Method -ne 'GET') {
    $csrf = $null
    foreach ($c in $Session.Cookies.GetCookies([Uri]$web)) {
      if ($c.Name -eq 'og_csrf') { $csrf = $c.Value; break }
    }
    if ($csrf) { $params.Headers['x-csrf-token'] = $csrf }
  }
  if ($Body) {
    $params.ContentType = 'application/json'
    $params.Body = $Body
  }
  try {
    $r = Invoke-WebRequest @params
    return ($r.Content | ConvertFrom-Json)
  } catch {
    $resp = $_.Exception.Response
    if ($resp) {
      $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
      $text = $reader.ReadToEnd()
      throw "HTTP $($resp.StatusCode) $Path : $text"
    }
    throw
  }
}

Write-Host '== E2E commerce PROD ==' -ForegroundColor Cyan
Write-Host "  web=$web deliverable=$DeliverableId plan=$PlanSlug"

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$userEmail = "e2e-commerce-$stamp@test.local"
$userPassword = 'E2eProd1!Aa'
$userName = "E2E Commerce $stamp"

$adminSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$aj = Invoke-BffJson -Method POST -Path '/api/auth/login' -Session $adminSession -Body (@{
  email = $adminEmail; password = $adminPassword
} | ConvertTo-Json -Compress)
if (-not $aj.ok) { throw 'Admin login failed' }
Write-Host '  admin login OK' -ForegroundColor Green

$inv = Invoke-BffJson -Method POST -Path '/api/atina/admin/users/invite' -Session $adminSession -Body (@{
  name = $userName; email = $userEmail; password = $userPassword; company = 'E2E Commerce Co'
} | ConvertTo-Json -Compress)
if (-not $inv.ok) { throw "Invite failed: $($inv | ConvertTo-Json -Compress)" }
Write-Host "  invite OK ($userEmail)" -ForegroundColor Green

$userSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$lj = Invoke-BffJson -Method POST -Path '/api/auth/login' -Session $userSession -Body (@{
  email = $userEmail; password = $userPassword
} | ConvertTo-Json -Compress)
if (-not $lj.ok) { throw "User login failed: $($lj | ConvertTo-Json -Compress)" }
Write-Host '  user login OK' -ForegroundColor Green

$methods = Invoke-BffJson -Method GET -Path '/api/atina/payments/methods' -Session $userSession
if (-not $methods.ok) { throw "Methods failed: $($methods | ConvertTo-Json -Compress)" }
$ids = @($methods.data.methods | ForEach-Object { $_.id })
$stripeOn = $methods.data.methods | Where-Object { $_.id -eq 'stripe' -and $_.available }
if (-not $stripeOn) { throw "Stripe not available. methods=$($ids -join ',')" }
Write-Host "  methods OK stripe=yes mode=$($methods.data.mode) ids=$($ids -join ',')" -ForegroundColor Green

$planCo = Invoke-BffJson -Method POST -Path '/api/atina/payments/stripe/checkout' -Session $userSession -Body (@{
  planSlug = $PlanSlug; billingCycle = 'monthly'; currency = 'EUR'
} | ConvertTo-Json -Compress)
if (-not $planCo.ok -or [string]$planCo.data.url -notmatch 'checkout\.stripe\.com') {
  throw "Plan Stripe checkout failed: $($planCo | ConvertTo-Json -Compress -Depth 5)"
}
Write-Host "  stripe plan session OK ($PlanSlug)" -ForegroundColor Green

$delCo = Invoke-BffJson -Method POST -Path '/api/atina/payments/stripe/deliverable-checkout' -Session $userSession -Body (@{
  deliverableId = $DeliverableId; industryCategory = $IndustryCategory
} | ConvertTo-Json -Compress)
if (-not $delCo.ok -or [string]$delCo.data.url -notmatch 'checkout\.stripe\.com') {
  throw "Deliverable Stripe checkout failed: $($delCo | ConvertTo-Json -Compress -Depth 5)"
}
$stripeAmount = $delCo.data.amount
if ($DeliverableId -eq 'setup-quick' -and $stripeAmount -ne 549) {
  throw "Stripe session amount drifted from catalog: expected 549 got $stripeAmount"
}
Write-Host "  stripe deliverable session OK paymentId=$($delCo.data.paymentId) amount=$stripeAmount" -ForegroundColor Green

$stripeSessionId = [string]$delCo.data.sessionId
if (-not $stripeSessionId -and [string]$delCo.data.url -match 'cs_(test|live)_[A-Za-z0-9]+') {
  $stripeSessionId = $Matches[0]
}
if ($stripeSessionId) {
  $sessStatus = Invoke-BffJson -Method GET -Path "/api/atina/payments/stripe/checkout-session/$stripeSessionId" -Session $userSession
  if (-not $sessStatus.ok -or -not $sessStatus.data.state) {
    throw "Checkout session status verify failed: $($sessStatus | ConvertTo-Json -Compress -Depth 4)"
  }
  if ($sessStatus.data.state -notin @('PROCESSING', 'PAID', 'UNKNOWN')) {
    throw "Unexpected checkout session state before pay: $($sessStatus.data.state)"
  }
  Write-Host "  stripe session status OK state=$($sessStatus.data.state) livemode=$($sessStatus.data.livemode)" -ForegroundColor Green
} else {
  Write-Host '  stripe session status SKIP (no sessionId in response)' -ForegroundColor Yellow
}

$dco = Invoke-BffJson -Method POST -Path '/api/atina/payments/manual/deliverable-checkout' -Session $userSession -Body (@{
  deliverableId = $DeliverableId
  industryCategory = $IndustryCategory
  paymentProvider = 'manual'
} | ConvertTo-Json -Compress)
if (-not $dco.ok -or -not $dco.data.paymentId) {
  throw "Manual checkout failed: $($dco | ConvertTo-Json -Compress -Depth 4)"
}
$paymentId = $dco.data.paymentId
Write-Host "  order checkout OK paymentId=$paymentId amount=$($dco.data.amount)" -ForegroundColor Green

$ms = Invoke-BffJson -Method POST -Path "/api/atina/payments/manual/mark-sent/$paymentId" -Session $userSession -Body '{}'
if (-not $ms.ok) { throw 'Mark sent failed' }
Write-Host '  payment marked sent' -ForegroundColor Green

$cf = Invoke-BffJson -Method POST -Path "/api/atina/payments/manual/confirm/$paymentId" -Session $adminSession -Body '{}'
if (-not $cf.ok) { throw "Confirm failed: $($cf | ConvertTo-Json -Compress)" }
Write-Host '  payment confirmed' -ForegroundColor Green

Write-Host "  waiting fulfillment (max ${FulfillmentWaitSec}s)..." -ForegroundColor DarkGray
$deadline = (Get-Date).AddSeconds($FulfillmentWaitSec)
$finalStatus = 'unknown'
$artifactCount = 0
do {
  Start-Sleep -Seconds 5
  $job = Invoke-BffJson -Method GET -Path "/api/atina/billing/fulfillment/jobs/$paymentId" -Session $adminSession
  if ($job.ok -and $job.data) {
    $finalStatus = if ($job.data.status) { "$($job.data.status)" } else { "$($job.data.jobStatus)" }
    $artifactCount = @($job.data.artifacts).Count
    Write-Host "    status=$finalStatus artifacts=$artifactCount" -ForegroundColor DarkGray
    if ($finalStatus -in @('completed', 'failed', 'cancelled')) { break }
  }
} while ((Get-Date) -lt $deadline)

if ($finalStatus -ne 'completed') {
  throw "Fulfillment not completed: status=$finalStatus artifacts=$artifactCount"
}
Write-Host "  delivery OK status=$finalStatus artifacts=$artifactCount" -ForegroundColor Green

$jobs = Invoke-BffJson -Method GET -Path '/api/atina/billing/fulfillment/jobs?limit=10' -Session $userSession
$jobCount = @($jobs.data.jobs).Count
if (-not $jobs.ok) { throw 'Client deliveries list failed' }
Write-Host "  client deliveries list OK jobs=$jobCount" -ForegroundColor Green

# --- Document chain: invoice/receipt in Billing + PDF in Deliveries ---
$jobDetail = Invoke-BffJson -Method GET -Path "/api/atina/billing/fulfillment/jobs/$paymentId" -Session $userSession
if (-not $jobDetail.ok -or -not $jobDetail.data) {
  throw "Client fulfillment job detail failed for $paymentId"
}
$artifactNames = @($jobDetail.data.artifacts | ForEach-Object { [string]$_.filename })
$pdfArtifacts = @($artifactNames | Where-Object { $_ -match '\.pdf$' })
if ($pdfArtifacts.Count -lt 1) {
  throw "No PDF artifact in client deliveries for $paymentId; artifacts=$($artifactNames -join ',')"
}
$pdfName = $pdfArtifacts[0]
$pdfUrl = "$web/api/atina/billing/fulfillment/jobs/$paymentId/artifacts/$([uri]::EscapeDataString($pdfName))"
$pdfResp = Invoke-WebRequest -Uri $pdfUrl -WebSession $userSession -UseBasicParsing -TimeoutSec 120
$pdfCt = [string]$pdfResp.Headers['Content-Type']
if ($pdfResp.StatusCode -ne 200 -or $pdfResp.RawContentLength -lt 200) {
  throw "PDF download failed status=$($pdfResp.StatusCode) bytes=$($pdfResp.RawContentLength) ct=$pdfCt"
}
if ($pdfCt -and $pdfCt -notmatch 'pdf|octet-stream') {
  throw "PDF content-type unexpected: $pdfCt"
}
Write-Host "  client PDF OK file=$pdfName bytes=$($pdfResp.RawContentLength) ct=$pdfCt" -ForegroundColor Green

$invList = Invoke-BffJson -Method GET -Path '/api/atina/billing/invoices?limit=20&page=1' -Session $userSession
if (-not $invList.ok) { throw "Client invoice list failed: $($invList | ConvertTo-Json -Compress)" }
$invoices = @($invList.data.invoices)
if ($invoices.Count -lt 1) {
  throw 'Client invoice list empty after paid package (payment_id filter / createInvoice gap)'
}
$matched = @($invoices | Where-Object {
  ([string]$_.payment_id -eq $paymentId) -or ([string]$_.paymentId -eq $paymentId)
})
if ($matched.Count -lt 1) {
  # Some serializers omit payment_id on list; fall back to billing_details.deliverableId + newest
  $matched = @($invoices | Where-Object {
    $bd = $_.billing_details
    if (-not $bd) { $bd = $_.billingDetails }
    $del = if ($bd) { [string]$bd.deliverableId } else { '' }
    $del -eq $DeliverableId
  })
}
if ($matched.Count -lt 1) {
  $sample = ($invoices | Select-Object -First 3 | ForEach-Object {
    "id=$($_.id);payment_id=$($_.payment_id);num=$($_.invoice_number)"
  }) -join ' | '
  throw "No invoice linked to paymentId=$paymentId (payment_id filter). sample=$sample"
}
$invoice = $matched[0]
$invoiceId = [string]$invoice.id
$bd = $invoice.billing_details
if (-not $bd) { $bd = $invoice.billingDetails }
$docKind = if ($bd) { [string]$bd.documentKind } else { '' }
Write-Host "  client invoices OK total=$($invList.data.total) matched=$invoiceId docKind=$docKind" -ForegroundColor Green

# BFF returns HTML by default; request JSON via Accept
$invDetailParams = @{
  Uri             = "$web/api/atina/billing/invoices/$invoiceId"
  Method          = 'GET'
  WebSession      = $userSession
  UseBasicParsing = $true
  TimeoutSec      = 60
  Headers         = @{
    Origin  = $web
    Referer = "$web/"
    Accept  = 'application/json'
  }
}
$invDetailRaw = Invoke-WebRequest @invDetailParams
$invDetail = $invDetailRaw.Content | ConvertFrom-Json
if (-not $invDetail.ok -or -not $invDetail.data) {
  throw "Invoice detail JSON failed: $($invDetailRaw.Content.Substring(0, [Math]::Min(200, $invDetailRaw.Content.Length)))"
}
$detailBd = $invDetail.data.billing_details
if (-not $detailBd) { $detailBd = $invDetail.data.billingDetails }
$detailKind = if ($detailBd) { [string]$detailBd.documentKind } else { '' }
if ($detailKind -notin @('payment_receipt', 'tax_invoice')) {
  throw "Invoice documentKind missing/unexpected: '$detailKind' (expected payment_receipt without firma VAT, or tax_invoice with VAT)"
}
$invHtml = Invoke-WebRequest -Uri "$web/api/atina/billing/invoices/$invoiceId" -WebSession $userSession -UseBasicParsing -TimeoutSec 60 -Headers @{
  Origin  = $web
  Referer = "$web/"
  Accept  = 'text/html'
}
# PS 5.1 may surface HTML as byte[]; normalize before substring checks.
if ($invHtml.Content -is [byte[]]) {
  $html = [Text.Encoding]::UTF8.GetString($invHtml.Content)
} else {
  $html = [string]$invHtml.Content
}
if ($html.TrimStart().StartsWith('{')) {
  throw "Printable invoice returned JSON instead of HTML (Accept/text negotiation bug)"
}
$expectedLabel = if ($detailKind -eq 'payment_receipt') { 'Payment receipt' } else { 'Invoice' }
$labelHit = $html.IndexOf($expectedLabel, [StringComparison]::OrdinalIgnoreCase) -ge 0
if (-not $labelHit -and $detailKind -eq 'payment_receipt') {
  $labelHit = ($html -match '(?i)payment') -and ($html -match '(?i)receipt')
}
if (-not $labelHit -and $detailKind -eq 'tax_invoice') {
  $labelHit = $html -match '(?i)\binvoice\b'
}
if (-not $labelHit) {
  $preview = $html.Substring(0, [Math]::Min(180, $html.Length)) -replace '[\r\n]+', ' '
  throw "Printable document missing label '$expectedLabel' (documentKind=$detailKind) preview=$preview"
}
if ($detailKind -eq 'payment_receipt' -and ($html -notmatch '(?i)not a vat tax invoice')) {
  throw 'Payment receipt HTML missing VAT disclaimer'
}
Write-Host "  invoice/receipt HTML OK kind=$detailKind label=$expectedLabel" -ForegroundColor Green

$projects = Invoke-BffJson -Method GET -Path '/api/atina/product-factory/projects?lane=client_order&limit=20' -Session $userSession
$projectCount = @($projects.data.projects).Count
Write-Host "  client orders/projects list OK projects=$projectCount" -ForegroundColor Green

[pscustomobject]@{
  ok                 = $true
  webBase            = $web
  userEmail          = $userEmail
  deliverableId      = $DeliverableId
  industryCategory   = $IndustryCategory
  stripePlanUrl      = [string]$planCo.data.url
  stripeDeliverable  = $delCo.data.paymentId
  stripeAmount       = $stripeAmount
  paidPaymentId      = $paymentId
  fulfillment        = $finalStatus
  artifacts          = $artifactCount
  pdfArtifact        = $pdfName
  pdfBytes           = $pdfResp.RawContentLength
  invoiceId          = $invoiceId
  invoiceNumber      = [string]$invoice.invoice_number
  documentKind       = $detailKind
  documentLabel      = $expectedLabel
  deliveryJobs       = $jobCount
  clientProjects     = $projectCount
  paymentsMode       = $methods.data.mode
} | ConvertTo-Json -Compress

Write-Host 'e2e-commerce-prod: PASS' -ForegroundColor Green
