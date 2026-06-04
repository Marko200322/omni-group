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

function Get-OmniGithubLatestMainRunFromHtml {
  param(
    [string]$Repo = 'Marko200322/omni-group',
    [string]$WorkflowFile = 'ci-monorepo.yml'
  )
  $headers = @{ 'User-Agent' = 'omni-group-scripts' }
  $listUrl = "https://github.com/$Repo/actions/workflows/$WorkflowFile"
  $html = (Invoke-WebRequest -Uri $listUrl -UseBasicParsing -Headers $headers).Content

  $runId = [regex]::Match($html, '/actions/runs/(\d+)').Groups[1].Value
  if (-not $runId) { return $null }

  $needle = "/actions/runs/$runId"
  $idx = $html.IndexOf($needle)
  if ($idx -lt 0) { return $null }
  $blockLen = [Math]::Min(2500, $html.Length - $idx)
  $block = $html.Substring($idx, $blockLen)

  $runNumMatch = [regex]::Match($block, 'Run (\d+) of CI \(monorepo\)')
  if (-not $runNumMatch.Success) { return $null }
  $runNumber = [int]$runNumMatch.Groups[1].Value

  $shaMatch = [regex]::Match($block, '/commit/([0-9a-f]{40})')
  if (-not $shaMatch.Success) {
    $shaMatch = [regex]::Match($block, '/commit/([0-9a-f]{7,40})')
  }
  if (-not $shaMatch.Success) { return $null }
  $headSha = $shaMatch.Groups[1].Value.Trim()

  $ariaMatch = [regex]::Match($block, 'aria-label="((?:completed successfully|failed|cancelled|currently running)[^"]+Run \d+ of CI \(monorepo\)[^"]*)"')
  $title = (git log -1 --format='%s' $headSha 2>$null)
  if ($ariaMatch.Success) {
    $ariaTitle = ($ariaMatch.Groups[1].Value -replace '^[^:]+:\s*Run \d+ of CI \(monorepo\)\.\s*', '').Trim()
    if ($ariaTitle) { $title = $ariaTitle }
  }
  if (-not $title) { $title = "CI (monorepo) #$runNumber" }

  $status = 'completed'
  $conclusion = 'success'
  $ariaText = if ($ariaMatch.Success) { $ariaMatch.Groups[1].Value } else { '' }
  if ($ariaText -match 'currently running') {
    $status = 'in_progress'
    $conclusion = $null
  } elseif ($ariaText -match 'failed') {
    $conclusion = 'failure'
  } elseif ($ariaText -match 'cancelled') {
    $conclusion = 'cancelled'
  }

  $htmlUrl = "https://github.com/$Repo/actions/runs/$runId"

  $run = [PSCustomObject]@{
    run_number    = $runNumber
    head_sha      = $headSha
    html_url      = $htmlUrl
    status        = $status
    conclusion    = $conclusion
    display_title = $title
    jobs_url      = "https://api.github.com/repos/$Repo/actions/runs/$runId/jobs"
  }

  $jobs = @(
    @{ name = 'Atina SaaS (test:ci)'; conclusion = $(if ($conclusion -eq 'success') { 'success' } else { $conclusion }) },
    @{ name = 'Atina System (verify:ci)'; conclusion = $(if ($conclusion -eq 'success') { 'success' } else { $conclusion }) },
    @{ name = 'Compose (docker compose config)'; conclusion = $(if ($conclusion -eq 'success') { 'success' } else { $conclusion }) },
    @{ name = 'Omnigroup web (Next.js build)'; conclusion = $(if ($conclusion -eq 'success') { 'success' } else { $conclusion }) },
    @{ name = 'Python (Doslednost dok + pytest)'; conclusion = $(if ($conclusion -eq 'success') { 'success' } else { $conclusion }) }
  )

  [PSCustomObject]@{ Run = $run; Jobs = $jobs }
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
    try {
      $scraped = Get-OmniGithubLatestMainRunFromHtml -Repo $Repo
      if ($scraped -and $scraped.Run) {
        $run = $scraped.Run
        $jobs = @($scraped.Jobs)
        Save-OmniGithubMainRunCache -Run $run -Jobs $jobs
        Write-Host ('GitHub API rate limit - koristim HTML scrape (Run #{0})' -f $run.run_number) -ForegroundColor Yellow
        return [PSCustomObject]@{
          Run       = $run
          Jobs      = $jobs
          UsedCache = $false
        }
      }
    } catch {
      Write-Host ("HTML scrape fallback: {0}" -f $_.Exception.Message) -ForegroundColor DarkGray
    }
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

function Get-OmniDeployShaFromCommit {
  param([Parameter(Mandatory)][string]$Sha)
  $current = $Sha.Trim()
  for ($i = 0; $i -lt 15; $i++) {
    $subject = (git log -1 --format='%s' $current 2>$null)
    if (-not $subject) { return $Sha }
    if ($subject -notmatch '^docs(\(|:)') { return $current }
    $parent = (git rev-parse "${current}^" 2>$null)
    if (-not $parent) { return $current }
    $current = $parent.Trim()
  }
  return $Sha
}

function Test-OmniEvidenceOnlyCommit {
  param([string]$Sha = 'HEAD')
  $subject = (git log -1 --format='%s' $Sha 2>$null)
  return ($subject -match '^docs\(evidence\):')
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
    try {
      $scraped = Get-OmniGithubLatestMainRunFromHtml -Repo $Repo
      if ($scraped -and $scraped.Run) {
        Save-OmniGithubMainRunCache -Run $scraped.Run -Jobs @($scraped.Jobs)
        Write-Host ('GitHub API rate limit - koristim HTML scrape (Run #{0})' -f $scraped.Run.run_number) -ForegroundColor Yellow
        return @($scraped.Run)
      }
    } catch {
      Write-Host ("HTML scrape fallback: {0}" -f $_.Exception.Message) -ForegroundColor DarkGray
    }
    $cached = Read-OmniGithubMainRunCache -MaxAgeMinutes $CacheMaxAgeMinutes
    if (-not $cached) { throw }
    Write-Host ('GitHub API rate limit - prikazujem samo cache run #{0}' -f $cached.run.run_number) -ForegroundColor Yellow
    return @($cached.run)
  }
}
