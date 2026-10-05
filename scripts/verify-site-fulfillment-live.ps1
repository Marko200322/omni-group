#Requires -Version 5.1
<#
.SYNOPSIS
  Extract publicUrl for site packages from prod DB and HTTP-verify 200 + content.

.EXAMPLE
  .\scripts\verify-site-fulfillment-live.ps1
#>
param(
  [string]$ConfigPath = '',
  [string]$MatrixCsv = '',
  [string]$WebBase = 'https://omnigrouptech.com',
  [string[]]$DeliverableIds = @('landing', 'website-business', 'website-ecommerce'),
  [int]$MinContentBytes = 800,
  [int]$HttpTimeoutSec = 25
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
. (Join-Path $scriptsDir 'vps-remote.ps1')

if (-not $ConfigPath) {
  $ConfigPath = Join-Path $repoRoot 'deploy-secrets.local\deploy.config.json'
}
if (-not (Test-Path $ConfigPath)) { throw "Missing config: $ConfigPath" }
$cfg = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$remote = if ($cfg.remotePath) { "$($cfg.remotePath)".Trim() } else { '/opt/omni-group' }

if (-not $MatrixCsv) {
  $MatrixCsv = Join-Path $repoRoot 'docs\evidence\fulfillment-matrix-prod-MERGED-20261004_200516-after-retry.csv'
}

$evidenceDir = Join-Path $repoRoot 'docs\evidence'
New-Item -ItemType Directory -Force -Path $evidenceDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$outCsv = Join-Path $evidenceDir ("site-live-gate-{0}.csv" -f $stamp)
$outSummary = Join-Path $evidenceDir ("site-live-gate-{0}.summary.txt" -f $stamp)
$dbPath = Join-Path $evidenceDir ("site-live-gate-{0}.db.csv" -f $stamp)

$idsSql = ($DeliverableIds | ForEach-Object { "'" + ($_ -replace "'", "''") + "'" }) -join ','

$sql = @"
COPY (
  SELECT
    j.payment_id::text AS payment_id,
    j.deliverable_id,
    COALESCE(p.metadata->>'industryCategory', '') AS industry,
    COALESCE(j.result->>'publicUrl', '') AS public_url,
    j.status AS job_status,
    COALESCE(j.review_status, '') AS review_status,
    COALESCE(j.result->>'projectId', '') AS project_id,
    COALESCE(j.result->'metadata'->>'pageCount', '') AS page_count,
    CASE
      WHEN jsonb_typeof(j.result->'metadata'->'ecommerceCatalog') = 'array'
        THEN jsonb_array_length(j.result->'metadata'->'ecommerceCatalog')::text
      ELSE '0'
    END AS catalog_count,
    COALESCE(s.slug, '') AS site_slug,
    COALESCE(s.status, '') AS site_status
  FROM deliverable_fulfillment_jobs j
  JOIN payments p ON p.id = j.payment_id
  LEFT JOIN client_public_sites s
    ON (
      CASE
        WHEN (j.result->>'projectId') ~* '^[0-9a-f-]{36}$'
          THEN (j.result->>'projectId')::uuid
        ELSE NULL
      END
    ) = s.project_id
  WHERE j.deliverable_id IN ($idsSql)
  ORDER BY j.deliverable_id, industry, j.payment_id
) TO STDOUT WITH CSV HEADER
"@

$sqlB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($sql))
$remoteCmd = @"
set -euo pipefail
cd '$remote'
echo $sqlB64 | base64 -d > /tmp/site-live-gate.sql
cat /tmp/site-live-gate.sql | docker compose -f docker-compose.prod.yml --env-file .env.docker.prod exec -T postgres \
  psql -U atina_user -d atina_saas_db -v ON_ERROR_STOP=1
"@

Write-Host '=== site-live-gate: extract publicUrl from prod DB ===' -ForegroundColor Cyan
$session = Connect-VpsSession -VpsHost $cfg.vpsHost -VpsUser $cfg.vpsUser -SshPassword $cfg.sshPassword
$result = Invoke-SSHCommand -SessionId $session.SessionId -Command $remoteCmd -TimeOut 300
Close-VpsSession -Session $session

if ($result.ExitStatus -ne 0) {
  if ($result.Error) { $result.Error | ForEach-Object { Write-Host $_ -ForegroundColor Red } }
  if ($result.Output) { $result.Output | ForEach-Object { Write-Host $_ } }
  throw ("Prod SQL extract failed exit={0}" -f $result.ExitStatus)
}

$raw = @($result.Output) -join "`n"
if ($result.Error) {
  $errText = @($result.Error) -join "`n"
  if ($errText -match 'ERROR') { Write-Host $errText -ForegroundColor Red }
}
$raw = $raw.Trim()
if (-not $raw -or $raw -notmatch 'payment_id') {
  throw ("No CSV header from prod extract. Output:`n{0}" -f $raw)
}

$lines = $raw -split "`r?`n" | ForEach-Object { $_.TrimEnd() } | Where-Object { $_ -ne '' }
$csvStart = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match '^payment_id,') { $csvStart = $i; break }
}
$dbCsvText = ($lines[$csvStart..($lines.Count - 1)] -join "`n")
Set-Content -Path $dbPath -Value $dbCsvText -Encoding UTF8
$dbRows = @(Import-Csv $dbPath)
Write-Host ("DB site jobs: {0} -> {1}" -f $dbRows.Count, $dbPath) -ForegroundColor Green

$scopeRows = $dbRows
$expectedCount = 0
if (Test-Path $MatrixCsv) {
  $matrix = @(Import-Csv $MatrixCsv | Where-Object { $DeliverableIds -contains $_.deliverableId })
  $expectedCount = $matrix.Count
  $want = @{}
  foreach ($m in $matrix) { $want[[string]$m.paymentId] = $m }
  $scopeRows = @($dbRows | Where-Object { $want.ContainsKey([string]$_.payment_id) })
  foreach ($r in $scopeRows) {
    if (-not $r.industry -and $want.ContainsKey([string]$r.payment_id)) {
      $r.industry = $want[[string]$r.payment_id].industryCategory
    }
  }
  $dbPid = @{}
  foreach ($d in $dbRows) { $dbPid[[string]$d.payment_id] = $true }
  $missingJobs = @($matrix | Where-Object { -not $dbPid.ContainsKey([string]$_.paymentId) })
  Write-Host ("Matrix site cells: {0} | matched DB: {1} | missing jobs: {2}" -f $expectedCount, $scopeRows.Count, $missingJobs.Count) -ForegroundColor Cyan
  if ($missingJobs.Count -gt 0) {
    foreach ($m in ($missingJobs | Select-Object -First 5)) {
      Write-Host ("  missing job: {0} {1} {2}" -f $m.deliverableId, $m.industryCategory, $m.paymentId) -ForegroundColor DarkYellow
    }
  }
} else {
  Write-Host 'No matrix CSV - checking all DB site jobs' -ForegroundColor Yellow
}

function Resolve-AbsoluteUrl([string]$pathOrUrl, [string]$base) {
  if (-not $pathOrUrl) { return '' }
  if ($pathOrUrl -match '^https?://') { return $pathOrUrl }
  if ($pathOrUrl.StartsWith('/')) { return ($base.TrimEnd('/') + $pathOrUrl) }
  return ($base.TrimEnd('/') + '/' + $pathOrUrl)
}

$results = New-Object System.Collections.Generic.List[object]
$idx = 0
foreach ($row in $scopeRows) {
  $idx++
  $path = [string]$row.public_url
  if (-not $path -and $row.site_slug) { $path = "/sites/$($row.site_slug)" }
  $url = Resolve-AbsoluteUrl $path $WebBase
  $httpStatus = 0
  $bytes = 0
  $title = ''
  $ok = $false
  $notes = New-Object System.Collections.Generic.List[string]

  if (-not $url) {
    [void]$notes.Add('missing_publicUrl')
  } else {
    try {
      $resp = Invoke-WebRequest -Uri $url -Method Get -TimeoutSec $HttpTimeoutSec -UseBasicParsing -ErrorAction Stop
      $httpStatus = [int]$resp.StatusCode
      $bytes = if ($resp.Content) { [Text.Encoding]::UTF8.GetByteCount([string]$resp.Content) } else { 0 }
      if ([string]$resp.Content -match '<title[^>]*>([^<]+)</title>') { $title = $Matches[1].Trim() }
      if ($httpStatus -eq 200 -and $bytes -ge $MinContentBytes) {
        $ok = $true
        [void]$notes.Add('live_ok')
      } else {
        if ($httpStatus -ne 200) { [void]$notes.Add("http_$httpStatus") }
        if ($bytes -lt $MinContentBytes) { [void]$notes.Add("thin_${bytes}b") }
      }
      if ([string]$resp.Content -match '(?i)contact|services|pricing|shop|cart|omnigroup') {
        [void]$notes.Add('has_signals')
      } else {
        [void]$notes.Add('weak_signals')
      }
      if ($row.site_status -and $row.site_status -ne 'published') {
        [void]$notes.Add("site_$($row.site_status)")
      }
    } catch {
      $ex = $_.Exception
      if ($ex.Response -and $ex.Response.StatusCode) {
        $httpStatus = [int]$ex.Response.StatusCode
        [void]$notes.Add("http_$httpStatus")
      } else {
        $msg = ($ex.Message -replace '[,\r\n]', ' ')
        if ($msg.Length -gt 80) { $msg = $msg.Substring(0, 80) }
        [void]$notes.Add("err_$msg")
      }
    }
  }

  [void]$results.Add([pscustomobject]@{
    deliverableId = $row.deliverable_id
    industry      = $row.industry
    paymentId     = $row.payment_id
    publicUrl     = $path
    absoluteUrl   = $url
    jobStatus     = $row.job_status
    reviewStatus  = $row.review_status
    siteStatus    = $row.site_status
    pageCount     = $row.page_count
    catalogCount  = $row.catalog_count
    httpStatus    = $httpStatus
    contentBytes  = $bytes
    title         = $title
    liveOk        = $ok
    notes         = ($notes -join '|')
  })

  if (($idx % 25) -eq 0) {
    Write-Host ("  checked {0}/{1} ..." -f $idx, $scopeRows.Count)
  }
}

if (Test-Path $MatrixCsv) {
  $have = @{}
  foreach ($r in $results) { $have[[string]$r.paymentId] = $true }
  $matrix = @(Import-Csv $MatrixCsv | Where-Object { $DeliverableIds -contains $_.deliverableId })
  foreach ($m in $matrix) {
    if (-not $have.ContainsKey([string]$m.paymentId)) {
      [void]$results.Add([pscustomobject]@{
        deliverableId = $m.deliverableId
        industry      = $m.industryCategory
        paymentId     = $m.paymentId
        publicUrl     = ''
        absoluteUrl   = ''
        jobStatus     = 'missing_job'
        reviewStatus  = ''
        siteStatus    = ''
        pageCount     = ''
        catalogCount  = ''
        httpStatus    = 0
        contentBytes  = 0
        title         = ''
        liveOk        = $false
        notes         = 'missing_fulfillment_job'
      })
    }
  }
}

$results | Export-Csv -Path $outCsv -NoTypeInformation -Encoding UTF8

$byPkg = $results | Group-Object deliverableId | Sort-Object Name | ForEach-Object {
  $okN = @($_.Group | Where-Object { $_.liveOk }).Count
  $miss = @($_.Group | Where-Object { -not $_.publicUrl }).Count
  [pscustomobject]@{
    deliverableId = $_.Name
    total         = $_.Count
    liveOk        = $okN
    liveFail      = $_.Count - $okN
    missingUrl    = $miss
    pct           = if ($_.Count) { [math]::Round(100.0 * $okN / $_.Count, 1) } else { 0 }
  }
}

$total = $results.Count
$liveOk = @($results | Where-Object { $_.liveOk }).Count
$missingUrl = @($results | Where-Object { -not $_.publicUrl }).Count
$http200 = @($results | Where-Object { $_.httpStatus -eq 200 }).Count

$summary = New-Object System.Collections.Generic.List[string]
[void]$summary.Add("SITE_LIVE_GATE $stamp")
[void]$summary.Add("webBase=$WebBase minContentBytes=$MinContentBytes")
[void]$summary.Add("matrixCsv=$MatrixCsv")
[void]$summary.Add("dbExtract=$dbPath")
[void]$summary.Add("outCsv=$outCsv")
[void]$summary.Add(("TOTAL={0} LIVE_OK={1} LIVE_FAIL={2} HTTP_200={3} MISSING_URL={4} EXPECTED_MATRIX={5}" -f $total, $liveOk, ($total - $liveOk), $http200, $missingUrl, $expectedCount))
[void]$summary.Add('---BY_PACKAGE---')
foreach ($p in $byPkg) {
  [void]$summary.Add(("{0} total={1} liveOk={2} fail={3} missingUrl={4} pct={5}" -f $p.deliverableId, $p.total, $p.liveOk, $p.liveFail, $p.missingUrl, $p.pct))
}
[void]$summary.Add('---SAMPLE_FAILS---')
foreach ($f in @($results | Where-Object { -not $_.liveOk } | Select-Object -First 25)) {
  $line = @(
    [string]$f.deliverableId
    [string]$f.industry
    [string]$f.publicUrl
    ("http={0}" -f $f.httpStatus)
    ("bytes={0}" -f $f.contentBytes)
    ("site={0}" -f $f.siteStatus)
    [string]$f.notes
  ) -join ';'
  [void]$summary.Add($line)
}

Set-Content -Path $outSummary -Value ($summary -join [Environment]::NewLine) -Encoding UTF8
$summary | ForEach-Object { Write-Host $_ }

$target = if ($expectedCount -gt 0) { $expectedCount } else { $total }
if ($total -lt $target -or $liveOk -lt $total -or $total -lt 1) {
  Write-Host ("GATE FAIL - see {0}" -f $outSummary) -ForegroundColor Red
  exit 2
}
Write-Host ("GATE PASS - {0}/{1} live" -f $liveOk, $total) -ForegroundColor Green
exit 0
