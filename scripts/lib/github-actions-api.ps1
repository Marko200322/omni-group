<#
  GitHub Actions REST helper sa lokalnim cache-om (rate limit bez gh auth).
#>
#Requires -Version 5.1

function Get-OmniGithubApiHeaders {
  $headers = @{
    'User-Agent' = 'omni-group-scripts'
    'Accept'     = 'application/vnd.github+json'
  }
  $token = $env:GITHUB_TOKEN
  if (-not $token) { $token = $env:GH_TOKEN }
  if ($token) {
    $headers['Authorization'] = "Bearer $token"
  }
  return $headers
}

function Test-OmniGithubRateLimitError {
  param([System.Management.Automation.ErrorRecord]$ErrorRecord)
  $parts = @(
    $ErrorRecord.Exception.Message
    $ErrorRecord.ErrorDetails.Message
  ) | Where-Object { $_ }
  $text = ($parts -join ' ')
  if ($text -match 'rate limit') { return $true }
  if ($text -match '403') { return $true }
  try {
    if ($ErrorRecord.Exception.Response.StatusCode.value__ -eq 403) { return $true }
  } catch { }
  return $false
}

function Get-OmniGithubCachePath {
  param([string]$Name = 'ci-main-latest.json')
  $libDir = $PSScriptRoot
  $cacheDir = Join-Path (Split-Path -Parent $libDir) '.cache'
  if (-not (Test-Path -LiteralPath $cacheDir)) {
    New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
  }
  Join-Path $cacheDir $Name
}

function Save-OmniGithubMainRunCache {
  param(
    [object]$Run,
    [object[]]$Jobs = @()
  )
  $cachePath = Get-OmniGithubCachePath
  $payload = [ordered]@{
    fetched_at = (Get-Date).ToUniversalTime().ToString('o')
    run        = $Run
    jobs       = @($Jobs)
  }
  ($payload | ConvertTo-Json -Depth 12 -Compress:$false) | Set-Content -LiteralPath $cachePath -Encoding UTF8
}

function Read-OmniGithubMainRunCache {
  param([int]$MaxAgeMinutes = 1440)
  $cachePath = Get-OmniGithubCachePath
  if (-not (Test-Path -LiteralPath $cachePath)) { return $null }
  try {
    $raw = Get-Content -LiteralPath $cachePath -Raw -Encoding UTF8 | ConvertFrom-Json
    if (-not $raw.run) { return $null }
    $fetched = [DateTimeOffset]::Parse($raw.fetched_at)
    $ageMin = ((Get-Date).ToUniversalTime() - $fetched.UtcDateTime).TotalMinutes
    if ($ageMin -gt $MaxAgeMinutes) { return $null }
    return $raw
  } catch {
    return $null
  }
}

function Invoke-OmniGithubRest {
  param([Parameter(Mandatory)][string]$Uri)
  Invoke-RestMethod -Uri $Uri -Headers (Get-OmniGithubApiHeaders)
}

function Get-OmniGithubRunJobs {
  param(
    [Parameter(Mandatory)][object]$Run,
    [switch]$AllowCacheFallback
  )
  if (-not $Run.jobs_url) { return @() }
  try {
    return @((Invoke-OmniGithubRest -Uri $Run.jobs_url).jobs)
  } catch {
    if (-not (Test-OmniGithubRateLimitError $_)) { throw }
    if ($AllowCacheFallback) {
      $cached = Read-OmniGithubMainRunCache
      if ($cached -and $cached.jobs) {
        Write-Host '  (jobs iz cache-a - GitHub API rate limit)' -ForegroundColor Yellow
        return @($cached.jobs)
      }
    }
    throw
  }
}

function Get-OmniGithubLatestMainRun {
  param(
    [string]$Repo = 'Marko200322/omni-group',
    [string]$Branch = 'main',
    [int]$CacheMaxAgeMinutes = 1440,
    [switch]$AllowCacheFallback,
    [switch]$IncludeJobs
  )

  $usedCache = $false
  $run = $null
  $jobs = @()

  try {
    $url = "https://api.github.com/repos/$Repo/actions/runs?per_page=1&branch=$Branch"
    $run = (Invoke-OmniGithubRest -Uri $url).workflow_runs[0]
    if (-not $run) {
      throw [System.InvalidOperationException]::new('Nema workflow run-ova na main.')
    }
    if ($IncludeJobs) {
      $jobs = Get-OmniGithubRunJobs -Run $run
    }
    Save-OmniGithubMainRunCache -Run $run -Jobs $jobs
  } catch {
    if (-not ($AllowCacheFallback -and (Test-OmniGithubRateLimitError $_))) { throw }
    $cached = Read-OmniGithubMainRunCache -MaxAgeMinutes $CacheMaxAgeMinutes
    if (-not $cached) {
      Write-Host 'FAIL: GitHub API rate limit i nema svezeog cache-a.' -ForegroundColor Red
      Write-Host '  Sacekaj reset ili postavi GITHUB_TOKEN u env za veci limit.' -ForegroundColor DarkGray
      throw
    }
    $run = $cached.run
    $jobs = @($cached.jobs)
    $usedCache = $true
    Write-Host ('GitHub API rate limit - koristim cache ({0})' -f $cached.fetched_at) -ForegroundColor Yellow
  }

  [PSCustomObject]@{
    Run       = $run
    Jobs      = $jobs
    UsedCache = $usedCache
  }
}

function Get-OmniGithubRecentRuns {
  param(
    [string]$Repo = 'Marko200322/omni-group',
    [int]$Limit = 3,
    [int]$CacheMaxAgeMinutes = 1440,
    [switch]$AllowCacheFallback
  )

  try {
    $url = "https://api.github.com/repos/$Repo/actions/runs?per_page=$Limit"
    $runs = @((Invoke-OmniGithubRest -Uri $url).workflow_runs)
    if ($runs.Count -gt 0) {
      Save-OmniGithubMainRunCache -Run $runs[0] -Jobs @()
    }
    return $runs
  } catch {
    if (-not ($AllowCacheFallback -and (Test-OmniGithubRateLimitError $_))) { throw }
    $cached = Read-OmniGithubMainRunCache -MaxAgeMinutes $CacheMaxAgeMinutes
    if (-not $cached) { throw }
    Write-Host ('GitHub API rate limit - prikazujem samo cache run #{0}' -f $cached.run.run_number) -ForegroundColor Yellow
    return @($cached.run)
  }
}
