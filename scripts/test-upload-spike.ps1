<#
.SYNOPSIS
  Smoke test for POST /api/upload (F4-6) — requires authenticated session.

.EXAMPLE
  .\scripts\test-upload-spike.ps1
#>
#Requires -Version 5.1
param(
  [string]$WebBase = 'http://127.0.0.1:3010',
  [string]$Email = '',
  [string]$Password = '',
  [switch]$SkipEnsureWeb
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
. (Join-Path $scriptsDir 'resolve-admin-credentials.ps1')
. (Join-Path $scriptsDir 'rate-limit-retry.ps1')
. (Join-Path $scriptsDir 'bff-smoke-headers.ps1')

if (-not $Email -or -not $Password) {
  $creds = Get-AdminCredentials -RepoRoot $repoRoot
  if (-not $Email) { $Email = $creds.Email }
  if (-not $Password) { $Password = $creds.Password }
}

if (-not $SkipEnsureWeb) {
  & (Join-Path $scriptsDir 'ensure-web-dev.ps1')
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$web = $WebBase.TrimEnd('/')
$tmp = Join-Path $env:TEMP "omni-upload-spike-$([Guid]::NewGuid().ToString('N').Substring(0, 8)).txt"
'upload spike test' | Set-Content -Path $tmp -Encoding UTF8

Write-Host '== Upload spike ==' -ForegroundColor Cyan

function Get-SessionCookie {
  $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $body = @{ email = $Email; password = $Password } | ConvertTo-Json -Compress
  Invoke-WithRateLimitRetry -Label 'upload-spike login' -Action {
    Invoke-WebRequest -Uri "$web/api/auth/login" -Method POST -ContentType 'application/json' -Body $body -WebSession $session -UseBasicParsing -TimeoutSec 30 | Out-Null
  } | Out-Null
  $c = $session.Cookies.GetCookies($web) | Where-Object { $_.Name -eq 'og_session' } | Select-Object -First 1
  if (-not $c) { throw 'og_session cookie missing after login' }
  return @{ Cookie = $c.Value; Session = $session }
}

try {
  $meta = Invoke-RestMethod -Uri "$web/api/upload" -Method GET -TimeoutSec 15
  if (-not $meta.ok) { throw 'GET /api/upload config failed' }
  Write-Host "  GET /api/upload OK storage=$($meta.storage)" -ForegroundColor Green

  $auth = Get-SessionCookie
  $postHeaders = Get-BffSmokePostHeaders -Session $auth.Session -WebBase $web

  $boundary = [Guid]::NewGuid().ToString('N')
  $fileBytes = [System.IO.File]::ReadAllBytes($tmp)
  $fileName = [System.IO.Path]::GetFileName($tmp)
  $enc = [System.Text.Encoding]::UTF8
  $header = $enc.GetBytes("--$boundary`r`nContent-Disposition: form-data; name=`"file`"; filename=`"$fileName`"`r`nContent-Type: text/plain`r`n`r`n")
  $footer = $enc.GetBytes("`r`n--$boundary--`r`n")
  $bodyBytes = New-Object System.Collections.Generic.List[byte]
  $bodyBytes.AddRange([byte[]]$header)
  $bodyBytes.AddRange([byte[]]$fileBytes)
  $bodyBytes.AddRange([byte[]]$footer)

  $req = [System.Net.HttpWebRequest]::Create("$web/api/upload")
  $req.Method = 'POST'
  $req.ContentType = "multipart/form-data; boundary=$boundary"
  $req.ContentLength = $bodyBytes.Count
  $req.Headers.Add('Cookie', "og_session=$($auth.Cookie)")
  if ($postHeaders['x-csrf-token']) {
    $req.Headers.Add('x-csrf-token', $postHeaders['x-csrf-token'])
  }
  if ($postHeaders.Referer) {
    $req.Referer = $postHeaders.Referer
  }
  $stream = $req.GetRequestStream()
  $stream.Write($bodyBytes.ToArray(), 0, $bodyBytes.Count)
  $stream.Close()
  $resp = $req.GetResponse()
  $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
  $json = $reader.ReadToEnd() | ConvertFrom-Json
  $reader.Close()
  $resp.Close()

  if (-not $json.ok -or ($json.mode -ne 'local' -and $json.mode -ne 'stub')) {
    throw "Unexpected response: $($json | ConvertTo-Json -Compress)"
  }
  Write-Host "  POST /api/upload OK mode=$($json.mode) size=$($json.file.size)" -ForegroundColor Green
} finally {
  Remove-Item -Path $tmp -Force -ErrorAction SilentlyContinue
}

Write-Host ''
Write-Host 'test-upload-spike: PASS' -ForegroundColor Green
