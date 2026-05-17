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
