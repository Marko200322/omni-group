<#
.SYNOPSIS
  Multi-example live portfolio: every base package x N industries.
  Queue IBAN checkout -> mark-sent -> confirm, then poll + download MD/JSON.
#>
#Requires -Version 5.1
param(
  [string]$ApiBase = 'https://api.omnigrouptech.com',
  [string]$WebBase = 'https://omnigrouptech.com',
  [string]$OutDir = '',
  [int]$ExamplesPerPackage = 3,
  [switch]$QueueOnly,
  [switch]$PollOnly,
  [int]$PollSec = 3600,
  [int]$SleepBetweenSec = 3,
  [int]$PollIntervalSec = 15
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not $OutDir) {
  $stamp = Get-Date -Format 'yyyyMMdd-HHmm'
  $OutDir = Join-Path $repoRoot "docs\evidence\_portfolio-multi-$stamp"
}
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
$queuePath = Join-Path $OutDir 'queue.json'
$summaryPath = Join-Path $OutDir 'SUMMARY.json'
$logPath = Join-Path $OutDir 'run.log'

function Write-Log([string]$Msg) {
  $line = ('[{0}] {1}' -f (Get-Date -Format 'HH:mm:ss'), $Msg)
  Write-Host $line
  Add-Content -Path $logPath -Value $line -Encoding UTF8
}

$cfg = Get-Content (Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json') -Raw | ConvertFrom-Json
$email = [string]$cfg.adminEmail
$pass = [string]$cfg.adminPassword
if ([string]::IsNullOrWhiteSpace($email) -or [string]::IsNullOrWhiteSpace($pass)) {
  throw 'adminEmail/adminPassword missing in deploy.config.json'
}

$api = $ApiBase.TrimEnd('/')
$web = $WebBase.TrimEnd('/')

$packages = @(
  'setup-quick','setup-full','setup-custom','audit','integration','workflow-design',
  'support-priority','support-dedicated','landing','website-business','website-ecommerce',
  'white-label-setup','sales-enablement','vertical-package','lead-gen-retainer',
  'ai-support-retainer','custom-software','bundle-portal-presence','bundle-sales-launch',
  'bundle-ops-clarity','seo-audit','email-marketing','reputation-management'
)

# Rotate distinct industries so each package gets different niches
$industries = @(
  'healthcare','finance','technology','legal','construction','manufacturing','retail',
  'hospitality','education','ecommerce','marketing','professional','automotive','sales',
  'customer_service','logistics','fitness','beauty','agriculture','media','nonprofit',
  'home_services','energy','travel','government','entertainment','pets','industrial',
  'real-estate','development_it','design_creative','hr_recruiting','photography'
)

$portfolio = @()
for ($i = 0; $i -lt $packages.Count; $i++) {
  for ($e = 0; $e -lt $ExamplesPerPackage; $e++) {
    $ind = $industries[($i * $ExamplesPerPackage + $e) % $industries.Count]
    $portfolio += @{ id = $packages[$i]; ind = $ind; example = ($e + 1) }
  }
}

function Get-AuthHeaders {
  $loginBody = @{ email = $email; password = $pass } | ConvertTo-Json -Compress
  $login = Invoke-RestMethod -Uri "$api/api/v1/auth/login" -Method POST -ContentType 'application/json' -Body $loginBody -TimeoutSec 30
  $token = [string]$login.data.accessToken
  if (-not $token) { throw 'login failed - no accessToken' }
  return @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }
}

if (-not $PollOnly) {
  Write-Log ("QUEUE {0} jobs ({1} packages x {2}) -> {3}" -f $portfolio.Count, $packages.Count, $ExamplesPerPackage, $api)
  $h = Get-AuthHeaders
  $queuedList = New-Object System.Collections.Generic.List[object]
  $n = 0
  foreach ($p in $portfolio) {
    $n++
    $label = ('{0}__{1}__ex{2}' -f $p.id, $p.ind, $p.example)
    Write-Log ("=== [{0}/{1}] {2} ===" -f $n, $portfolio.Count, $label)
    try {
      $body = @{ deliverableId = $p.id; industryCategory = $p.ind; paymentProvider = 'manual' } | ConvertTo-Json -Compress
      $co = Invoke-RestMethod -Uri "$api/api/v1/payments/manual/deliverable-checkout" -Method POST -Headers $h -Body $body -TimeoutSec 45
      $payId = [string]$co.data.paymentId
      if (-not $payId) { throw 'no paymentId' }
      Invoke-RestMethod -Uri "$api/api/v1/payments/manual/mark-sent/$payId" -Method POST -Headers $h -Body '{}' -TimeoutSec 30 | Out-Null
      # rate-limit soft backoff
      $confirmOk = $false
      for ($attempt = 1; $attempt -le 6 -and -not $confirmOk; $attempt++) {
        try {
          Invoke-RestMethod -Uri "$api/api/v1/payments/manual/confirm/$payId" -Method POST -Headers $h -Body '{}' -TimeoutSec 120 | Out-Null
          $confirmOk = $true
        } catch {
          $msg = [string]$_.ErrorDetails.Message
          if ($msg -match 'RATE_LIMIT' -or $msg -match 'Too many requests') {
            $wait = 60 * $attempt
            if ($msg -match 'retryAfterSeconds":(\d+)') { $wait = [int]$Matches[1] + 5 }
            Write-Log ("rate-limit confirm; sleep {0}s (attempt {1})" -f $wait, $attempt)
            Start-Sleep -Seconds $wait
            try { $h = Get-AuthHeaders } catch { }
          } else { throw }
        }
      }
      if (-not $confirmOk) { throw 'confirm failed after rate-limit retries' }
      Write-Log ("confirmed pay={0} amount={1}" -f $payId, $co.data.amount)
      [void]$queuedList.Add([pscustomobject]@{
        label = $label; id = $p.id; ind = $p.ind; example = $p.example
        paymentId = $payId; amount = $co.data.amount; status = 'confirmed'
      })
    } catch {
      $err = $_.ErrorDetails.Message
      if (-not $err) { $err = $_.Exception.Message }
      Write-Log ("FAIL: {0}" -f $err)
      [void]$queuedList.Add([pscustomobject]@{
        label = $label; id = $p.id; ind = $p.ind; example = $p.example
        status = 'fail'; err = $err
      })
      if ($err -match 'RATE_LIMIT' -or $err -match 'Too many requests') {
        Write-Log 'rate-limit on checkout; sleeping 120s'
        Start-Sleep -Seconds 120
        try { $h = Get-AuthHeaders } catch { }
      }
    }
    Start-Sleep -Seconds $SleepBetweenSec
  }
  $queued = @($queuedList)
  ($queued | ConvertTo-Json -Depth 6) | Set-Content $queuePath -Encoding UTF8
  $okQ = @($queued | Where-Object { $_.status -eq 'confirmed' }).Count
  $failQ = @($queued | Where-Object { $_.status -eq 'fail' }).Count
  Write-Log ("Queued file={0} confirmed={1} fail={2}" -f $queuePath, $okQ, $failQ)
  if ($QueueOnly) { exit 0 }
}

if (-not (Test-Path $queuePath)) { throw "Missing $queuePath - run without -PollOnly first" }
$queued = @(Get-Content $queuePath -Raw | ConvertFrom-Json)
$h = Get-AuthHeaders
$deadline = (Get-Date).AddSeconds($PollSec)
$results = @()
$toPoll = @($queued | Where-Object { [string]$_.status -eq 'confirmed' -and [string]$_.paymentId })
Write-Log ("POLL {0} of {1} queue rows (max {2}s)" -f $toPoll.Count, @($queued).Count, $PollSec)

# Round-robin poll until all terminal or timeout
$pending = [System.Collections.Generic.List[object]]::new()
foreach ($q in $toPoll) { $pending.Add($q) }
$doneMap = @{}

while ($pending.Count -gt 0 -and (Get-Date) -lt $deadline) {
  $still = [System.Collections.Generic.List[object]]::new()
  foreach ($q in $pending) {
    $label = [string]$q.label
    $payId = [string]$q.paymentId
    try {
      $resp = Invoke-RestMethod -Uri "$api/api/v1/billing/fulfillment/jobs/$payId" -Headers $h -TimeoutSec 30
      $job = $resp.data
      $st = [string]$job.status
      if ($st -eq 'completed' -or $st -eq 'failed' -or $st -eq 'partial') {
        $packDir = Join-Path $OutDir $label
        New-Item -ItemType Directory -Path $packDir -Force | Out-Null
        ($job | ConvertTo-Json -Depth 12) | Set-Content (Join-Path $packDir 'job.json') -Encoding UTF8
        $arts = @($job.artifacts)
        $ord = ''; $sha = ''; $chars = 0; $publicUrl = [string]$job.publicUrl; $err = [string]$job.error
        foreach ($a in $arts) {
          $name = [string]$a.filename
          if (-not $name) { continue }
          if ($name -match '\.(md|txt|json)$' -or [string]$a.type -match 'md|markdown|companion|json|sla') {
            $safe = ($name -replace '[^\w\.\-]+', '_')
            $path = Join-Path $packDir $safe
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
            } catch { }
          }
        }
        $siteHttp = ''
        if ($publicUrl) {
          $abs = if ($publicUrl -match '^https?://') { $publicUrl } else { "$web$publicUrl" }
          try {
            $code = & curl.exe -sS -o NUL -w '%{http_code}' $abs
            $siteHttp = [string]$code
          } catch { $siteHttp = 'ERR' }
        }
        $row = [pscustomobject]@{
          label = $label; id = $q.id; ind = $q.ind; example = $q.example
          paymentId = $payId; status = $st; arts = $arts.Count
          ord = $ord; sha20 = $sha; mdChars = $chars
          publicUrl = $publicUrl; siteHttp = $siteHttp
          error = if ($err.Length -gt 200) { $err.Substring(0, 200) } else { $err }
        }
        $results += $row
        $doneMap[$label] = $true
        Write-Log ("DONE {0} -> {1} arts={2} ORD={3} site={4}" -f $label, $st, $arts.Count, $ord, $siteHttp)
      } else {
        $still.Add($q)
      }
    } catch {
      Write-Log ("poll err {0}: {1}" -f $label, $_.Exception.Message)
      $still.Add($q)
    }
  }
  $pending = $still
  if ($pending.Count -gt 0) {
    Write-Log ("waiting {0} pending..." -f $pending.Count)
    Start-Sleep -Seconds $PollIntervalSec
    # refresh auth periodically
    try { $h = Get-AuthHeaders } catch { }
  }
}

foreach ($q in $pending) {
  $results += [pscustomobject]@{
    label = $q.label; id = $q.id; ind = $q.ind; example = $q.example
    paymentId = $q.paymentId; status = 'timeout'; arts = 0
    ord = ''; sha20 = ''; mdChars = 0; publicUrl = ''; siteHttp = ''; error = 'poll timeout'
  }
  Write-Log ("TIMEOUT {0}" -f $q.label)
}

$ok = @($results | Where-Object status -eq 'completed').Count
$fail = @($results | Where-Object status -ne 'completed').Count
$byPkg = @{}
foreach ($r in $results) {
  if (-not $byPkg.ContainsKey($r.id)) { $byPkg[$r.id] = @{ ok = 0; total = 0; fails = @() } }
  $byPkg[$r.id].total++
  if ($r.status -eq 'completed') { $byPkg[$r.id].ok++ }
  else { $byPkg[$r.id].fails += ("{0}:{1}" -f $r.ind, $r.status) }
}

$summary = [pscustomobject]@{
  generatedAt = (Get-Date).ToString('o')
  api = $api
  examplesPerPackage = $ExamplesPerPackage
  total = $results.Count
  completed = $ok
  notCompleted = $fail
  byPackage = $byPkg.GetEnumerator() | ForEach-Object {
    [pscustomobject]@{ id = $_.Key; ok = $_.Value.ok; total = $_.Value.total; fails = ($_.Value.fails -join '; ') }
  }
  results = $results
}
$summary | ConvertTo-Json -Depth 10 | Set-Content $summaryPath -Encoding UTF8

$readme = New-Object System.Collections.Generic.List[string]
[void]$readme.Add('# Portfolio MULTI - examples per package')
[void]$readme.Add('')
[void]$readme.Add(('Generated: {0}' -f $summary.generatedAt))
[void]$readme.Add(('API: {0}' -f $api))
[void]$readme.Add(('Completed: **{0} / {1}** ({2} examples x {3} packages)' -f $ok, $results.Count, $ExamplesPerPackage, $packages.Count))
[void]$readme.Add('')
[void]$readme.Add('## By package')
[void]$readme.Add('Package | OK | Total | Fails')
[void]$readme.Add('--------|----|-------|------')
foreach ($row in ($summary.byPackage | Sort-Object id)) {
  [void]$readme.Add(('{0} | {1} | {2} | {3}' -f $row.id, $row.ok, $row.total, $row.fails))
}
[void]$readme.Add('')
[void]$readme.Add('## All jobs')
[void]$readme.Add('Label | Status | Arts | ORD | SHA20 | MD | Site')
[void]$readme.Add('------|--------|------|-----|-------|----|-----')
foreach ($r in ($results | Sort-Object label)) {
  [void]$readme.Add(('{0} | {1} | {2} | {3} | {4} | {5} | {6}' -f $r.label, $r.status, $r.arts, $r.ord, $r.sha20, $r.mdChars, $r.siteHttp))
}
[System.IO.File]::WriteAllLines((Join-Path $OutDir 'README.md'), $readme)
Write-Log ("FINAL completed={0} fail={1} -> {2}" -f $ok, $fail, $OutDir)
if ($fail -gt 0) { exit 2 }
exit 0
