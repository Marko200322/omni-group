function Invoke-QuickWebGet {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Uri,
    [int]$TimeoutSec = 4
  )

  if ($PSVersionTable.PSVersion.Major -ge 6) {
    return Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec $TimeoutSec -Method GET
  }

  $request = [System.Net.HttpWebRequest]::Create($Uri)
  $request.Method = 'GET'
  $request.Timeout = $TimeoutSec * 1000
  $request.ReadWriteTimeout = $TimeoutSec * 1000
  $request.UserAgent = 'omnigroup-scripts'
  try {
    $response = $request.GetResponse()
    $statusCode = [int]$response.StatusCode
    $response.Close()
    return [PSCustomObject]@{ StatusCode = $statusCode }
  } catch [System.Net.WebException] {
    if ($_.Exception.Response) {
      $statusCode = [int]$_.Exception.Response.StatusCode
      $_.Exception.Response.Close()
      throw [System.Net.WebException]::new("HTTP $statusCode", $null, [System.Net.WebExceptionStatus]::ProtocolError, $_.Exception.Response)
    }
    throw
  }
}

function Invoke-WithRateLimitRetry {
  param(
    [Parameter(Mandatory = $true)]
    [scriptblock]$Action,
    [int]$MaxAttempts = 4,
    [string]$Label = 'request'
  )

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    try {
      return & $Action
    } catch {
      $status = $null
      $detail = [string]$_.ErrorDetails.Message
      if ($_.Exception.Response) {
        $status = [int]$_.Exception.Response.StatusCode
        if (-not $detail) {
          try {
            $stream = $_.Exception.Response.GetResponseStream()
            if ($stream) {
              $reader = New-Object System.IO.StreamReader($stream)
              $detail = $reader.ReadToEnd()
              $reader.Close()
            }
          } catch {
            $detail = ''
          }
        }
      }
      $rateLimited = ($status -eq 429) -or ($detail -and $detail -match 'RATE_LIMIT')
      if ($rateLimited -and $attempt -lt $MaxAttempts) {
        $waitSec = 90
        if ($detail -match 'retryAfterSeconds[^0-9]*(\d+)') {
          $waitSec = [int]$Matches[1] + 3
        }
        Write-Host "  $Label rate limit - cekam ${waitSec}s (pokusaj $attempt/$MaxAttempts)..." -ForegroundColor Yellow
        Start-Sleep -Seconds $waitSec
        continue
      }
      throw
    }
  }
  throw "$Label failed after rate-limit retries."
}
