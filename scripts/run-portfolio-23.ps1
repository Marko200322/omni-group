<#
.SYNOPSIS
  Soft-live portfolio: IBAN checkout -> mark-sent -> confirm for all 23 base packages.
  Writes queue JSON; use -PollOnly to wait + download artifacts.
#>
#Requires -Version 5.1
param(
  [string]$ApiBase = 'https://api.omnigrouptech.com',
  [string]$WebBase = 'https://omnigrouptech.com',
  [string]$OutDir = '',
  [switch]$QueueOnly,
  [switch]$PollOnly,
  [int]$PollSec = 900,
  [int]$SleepBetweenSec = 4
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not $OutDir) {
  $stamp = Get-Date -Format 'yyyyMMdd'
  $OutDir = Join-Path $repoRoot "docs\evidence\_portfolio-full-$stamp"
}
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
$queuePath = Join-Path $OutDir 'queue.json'
$summaryPath = Join-Path $OutDir 'SUMMARY.json'

$cfg = Get-Content (Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json') -Raw | ConvertFrom-Json
$email = [string]$cfg.adminEmail
$pass = [string]$cfg.adminPassword
if ([string]::IsNullOrWhiteSpace($email) -or [string]::IsNullOrWhiteSpace($pass)) {
  throw 'adminEmail/adminPassword missing in deploy.config.json'
}

$api = $ApiBase.TrimEnd('/')
$portfolio = @(
  @{ id = 'setup-quick';           ind = 'healthcare' },
  @{ id = 'setup-full';            ind = 'finance' },
  @{ id = 'setup-custom';          ind = 'technology' },
  @{ id = 'audit';                 ind = 'legal' },
  @{ id = 'integration';           ind = 'construction' },
  @{ id = 'workflow-design';       ind = 'manufacturing' },
  @{ id = 'support-priority';      ind = 'retail' },
  @{ id = 'support-dedicated';     ind = 'hospitality' },
  @{ id = 'landing';               ind = 'real-estate' },
  @{ id = 'website-business';      ind = 'education' },
  @{ id = 'website-ecommerce';     ind = 'ecommerce' },
  @{ id = 'white-label-setup';     ind = 'marketing' },
  @{ id = 'sales-enablement';      ind = 'professional' },
  @{ id = 'vertical-package';      ind = 'automotive' },
  @{ id = 'lead-gen-retainer';     ind = 'sales' },
  @{ id = 'ai-support-retainer';   ind = 'customer_service' },
  @{ id = 'custom-software';       ind = 'logistics' },
  @{ id = 'bundle-portal-presence'; ind = 'fitness' },
  @{ id = 'bundle-sales-launch';   ind = 'beauty' },
  @{ id = 'bundle-ops-clarity';    ind = 'agriculture' },
  @{ id = 'seo-audit';             ind = 'media' },
  @{ id = 'email-marketing';       ind = 'nonprofit' },
  @{ id = 'reputation-management'; ind = 'home_services' }
)

function Get-AuthHeaders {
  $loginBody = @{ email = $email; password = $pass } | ConvertTo-Json -Compress
  $login = Invoke-RestMethod -Uri "$api/api/v1/auth/login" -Method POST -ContentType 'application/json' -Body $loginBody -TimeoutSec 30
  $token = [string]$login.data.accessToken
  if (-not $token) { throw 'login failed - no accessToken' }
  return @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }
}

if (-not $PollOnly) {
  Write-Host "=== QUEUE 23 packages -> $api ===" -ForegroundColor Cyan
  $h = Get-AuthHeaders
  $queued = @()
  foreach ($p in $portfolio) {
    $label = "$($p.id)__$($p.ind)"
    Write-Host "`n=== $label ==="
    try {
      $body = @{ deliverableId = $p.id; industryCategory = $p.ind; paymentProvider = 'manual' } | ConvertTo-Json -Compress
      $co = Invoke-RestMethod -Uri "$api/api/v1/payments/manual/deliverable-checkout" -Method POST -Headers $h -Body $body -TimeoutSec 45
      $payId = [string]$co.data.paymentId
      if (-not $payId) { throw 'no paymentId' }
      Write-Host "checkout paymentId=$payId amount=$($co.data.amount)"
      Invoke-RestMethod -Uri "$api/api/v1/payments/manual/mark-sent/$payId" -Method POST -Headers $h -Body '{}' -TimeoutSec 30 | Out-Null
      Write-Host 'mark-sent OK'
      Invoke-RestMethod -Uri "$api/api/v1/payments/manual/confirm/$payId" -Method POST -Headers $h -Body '{}' -TimeoutSec 120 | Out-Null
      Write-Host 'confirm OK'
      $queued += [pscustomobject]@{
        label = $label; id = $p.id; ind = $p.ind; paymentId = $payId
        amount = $co.data.amount; status = 'confirmed'
      }
    } catch {
      $err = $_.ErrorDetails.Message
      if (-not $err) { $err = $_.Exception.Message }
      Write-Host "FAIL: $err" -ForegroundColor Red
      $queued += [pscustomobject]@{ label = $label; id = $p.id; ind = $p.ind; status = 'fail'; err = $err }
    }
    Start-Sleep -Seconds $SleepBetweenSec
  }
  $queued | ConvertTo-Json -Depth 6 | Set-Content $queuePath -Encoding UTF8
  Write-Host "`nQueued file: $queuePath"
  Write-Host "confirmed=$((@($queued | Where-Object status -eq 'confirmed')).Count) fail=$((@($queued | Where-Object status -eq 'fail')).Count)"
  if ($QueueOnly) { exit 0 }
}

if (-not (Test-Path $queuePath)) { throw "Missing $queuePath - run without -PollOnly first" }
$queued = Get-Content $queuePath -Raw | ConvertFrom-Json
$h = Get-AuthHeaders
$deadline = (Get-Date).AddSeconds($PollSec)
$results = @()

Write-Host "`n=== POLL fulfillment (max ${PollSec}s) ===" -ForegroundColor Cyan
foreach ($q in @($queued | Where-Object status -eq 'confirmed')) {
  $label = [string]$q.label
  $payId = [string]$q.paymentId
  $packDir = Join-Path $OutDir $label
  New-Item -ItemType Directory -Path $packDir -Force | Out-Null
  Write-Host "`n--- poll $label ---"
  $job = $null
  $status = 'timeout'
  while ((Get-Date) -lt $deadline) {
    try {
      $resp = Invoke-RestMethod -Uri "$api/api/v1/billing/fulfillment/jobs/$payId" -Headers $h -TimeoutSec 30
      $job = $resp.data
      $st = [string]$job.status
      if ($st -eq 'completed' -or $st -eq 'failed' -or $st -eq 'partial') {
        $status = $st
        break
      }
      Write-Host "  status=$st ..."
    } catch {
      Write-Host "  poll err: $($_.Exception.Message)"
    }
    Start-Sleep -Seconds 12
  }

  $arts = @()
  $ord = ''
  $sha = ''
  $chars = 0
  $publicUrl = ''
  if ($job) {
    ($job | ConvertTo-Json -Depth 12) | Set-Content (Join-Path $packDir 'job.json') -Encoding UTF8
    $arts = @($job.artifacts)
    $publicUrl = [string]$job.publicUrl
    foreach ($a in $arts) {
      $name = [string]$a.filename
      if (-not $name) { $name = [string]$a.name }
      if (-not $name) { continue }
      $safe = ($name -replace '[^\w\.\-]+', '_')
      $path = Join-Path $packDir $safe
      if ($name -match '\.(md|txt|json)$' -or [string]$a.type -match 'md|markdown|companion|json|sla') {
        try {
          $url = "$api/api/v1/billing/fulfillment/jobs/$payId/artifacts/$([uri]::EscapeDataString($name))"
          Invoke-WebRequest -Uri $url -Headers $h -OutFile $path -UseBasicParsing -TimeoutSec 90 | Out-Null
          if ((Test-Path $path) -and $path -match '\.md$') {
            $content = Get-Content $path -Raw -ErrorAction SilentlyContinue
            if ($content) {
              if ($content -match 'ORD-[A-Z0-9]+-[A-Z0-9]+') { $ord = $Matches[0] }
              if ($content.Length -gt $chars) {
                $chars = $content.Length
                $sha = ([System.BitConverter]::ToString(
                  [System.Security.Cryptography.SHA256]::Create().ComputeHash(
                    [System.Text.Encoding]::UTF8.GetBytes($content)
                  )
                )).Replace('-', '').Substring(0, 20)
              }
            }
          }
        } catch {
          Write-Host "  download fail $name"
        }
      }
    }
  }

  $httpSite = ''
  if ($publicUrl) {
    try {
      $abs = if ($publicUrl -match '^https?://') { $publicUrl } else { "$($WebBase.TrimEnd('/'))$publicUrl" }
      $r = Invoke-WebRequest -Uri $abs -UseBasicParsing -TimeoutSec 20
      $httpSite = [string]$r.StatusCode
    } catch { $httpSite = 'ERR' }
  }

  $row = [pscustomobject]@{
    label = $label; paymentId = $payId; status = $status
    arts = $arts.Count; ord = $ord; sha20 = $sha; mdChars = $chars
    publicUrl = $publicUrl; siteHttp = $httpSite
  }
  $results += $row
  Write-Host ("  -> {0} arts={1} ORD={2} sha={3}" -f $status, $arts.Count, $ord, $sha)
}

$ok = @($results | Where-Object status -eq 'completed').Count
$fail = @($results | Where-Object status -ne 'completed').Count
$summary = [pscustomobject]@{
  generatedAt = (Get-Date).ToString('o')
  api = $api
  total = $results.Count
  completed = $ok
  notCompleted = $fail
  results = $results
}
$summary | ConvertTo-Json -Depth 8 | Set-Content $summaryPath -Encoding UTF8

$readmeLines = New-Object System.Collections.Generic.List[string]
[void]$readmeLines.Add('# Factory portfolio FULL - 23 packages')
[void]$readmeLines.Add('')
[void]$readmeLines.Add(('Generated: {0}' -f $summary.generatedAt))
[void]$readmeLines.Add(('API: {0}' -f $api))
[void]$readmeLines.Add(('Completed: **{0} / {1}**' -f $ok, $results.Count))
[void]$readmeLines.Add('')
[void]$readmeLines.Add('Package | Status | Arts | ORD | SHA20 | MD chars | Site')
[void]$readmeLines.Add('--------|--------|------|-----|-------|----------|-----')
foreach ($r in $results) {
  [void]$readmeLines.Add(('{0} | {1} | {2} | {3} | {4} | {5} | {6}' -f $r.label, $r.status, $r.arts, $r.ord, $r.sha20, $r.mdChars, $r.siteHttp))
}
[System.IO.File]::WriteAllLines((Join-Path $OutDir 'README.md'), $readmeLines)
Write-Host ('DONE completed={0} fail={1} -> {2}' -f $ok, $fail, $OutDir) -ForegroundColor Green
if ($fail -gt 0) { exit 2 }
exit 0
