<#
.SYNOPSIS
  Smoke test for POST /api/upload (F4-6 spike).

.EXAMPLE
  .\scripts\test-upload-spike.ps1
#>
#Requires -Version 5.1
param(
  [string]$WebBase = 'http://127.0.0.1:3010'
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $scriptsDir 'ensure-web-dev.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$web = $WebBase.TrimEnd('/')
$tmp = Join-Path $env:TEMP "omni-upload-spike-$([Guid]::NewGuid().ToString('N').Substring(0, 8)).txt"
'upload spike test' | Set-Content -Path $tmp -Encoding UTF8

Write-Host '== Upload spike ==' -ForegroundColor Cyan

try {
  $boundary = [Guid]::NewGuid().ToString('N')
  $fileBytes = [System.IO.File]::ReadAllBytes($tmp)
  $fileName = [System.IO.Path]::GetFileName($tmp)
  $enc = [System.Text.Encoding]::UTF8
  $header = $enc.GetBytes("--$boundary`r`nContent-Disposition: form-data; name=`"file`"; filename=`"$fileName`"`r`nContent-Type: text/plain`r`n`r`n")
  $footer = $enc.GetBytes("`r`n--$boundary--`r`n")
  $body = New-Object System.Collections.Generic.List[byte]
  $body.AddRange([byte[]]$header)
  $body.AddRange([byte[]]$fileBytes)
  $body.AddRange([byte[]]$footer)

  $req = [System.Net.HttpWebRequest]::Create("$web/api/upload")
  $req.Method = 'POST'
  $req.ContentType = "multipart/form-data; boundary=$boundary"
  $req.ContentLength = $body.Count
  $stream = $req.GetRequestStream()
  $stream.Write($body.ToArray(), 0, $body.Count)
  $stream.Close()
  $resp = $req.GetResponse()
  $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
  $json = $reader.ReadToEnd() | ConvertFrom-Json
  $reader.Close()
  $resp.Close()

  if (-not $json.ok -or $json.mode -ne 'stub') {
    throw "Unexpected response: $($json | ConvertTo-Json -Compress)"
  }
  Write-Host "  POST /api/upload OK mode=$($json.mode) size=$($json.file.size)" -ForegroundColor Green
} finally {
  Remove-Item -Path $tmp -Force -ErrorAction SilentlyContinue
}

Write-Host ''
Write-Host 'test-upload-spike: PASS' -ForegroundColor Green
