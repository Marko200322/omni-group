#Requires -Version 5.1
<#
  Add DMARC TXT for omnigrouptech.com via Spaceship DNS API.
  Needs: $env:SPACESHIP_API_KEY + $env:SPACESHIP_API_SECRET
#>
param(
  [string]$Domain = 'omnigrouptech.com',
  [string]$DmarcValue = 'v=DMARC1; p=none; rua=mailto:markokosic020@gmail.com; fo=1'
)

$key = $env:SPACESHIP_API_KEY
$secret = $env:SPACESHIP_API_SECRET
if ([string]::IsNullOrWhiteSpace($key) -or [string]::IsNullOrWhiteSpace($secret)) {
  Write-Error 'Set SPACESHIP_API_KEY and SPACESHIP_API_SECRET first.'
  exit 2
}

$body = @{
  force = $true
  items = @(
    @{
      type  = 'TXT'
      name  = '_dmarc'
      value = $DmarcValue
      ttl   = 3600
    }
  )
} | ConvertTo-Json -Compress -Depth 5

$headers = @{
  'X-API-Key'    = $key
  'X-API-Secret' = $secret
  'Content-Type' = 'application/json'
}

$uri = "https://spaceship.dev/api/v1/dns/records/$Domain"
Write-Host "PUT $uri"
try {
  Invoke-RestMethod -Method Put -Uri $uri -Headers $headers -Body $body
  Write-Host "OK — DMARC set. Wait TTL then: Resolve-DnsName _dmarc.$Domain -Type TXT"
} catch {
  Write-Error $_.Exception.Message
  if ($_.ErrorDetails) { Write-Host $_.ErrorDetails.Message }
  exit 1
}
