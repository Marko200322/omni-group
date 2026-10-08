#Requires -Version 5.1
# SSH/SCP helper: ključ, lozinka (Posh-SSH), ili interaktivni ssh.

function Ensure-PoshSshModule {
  if (Get-Module -Name Posh-SSH) { return }

  $userMod = Join-Path $env:USERPROFILE 'Documents\WindowsPowerShell\Modules\Posh-SSH\Posh-SSH.psd1'
  if (Test-Path $userMod) {
    Import-Module $userMod -ErrorAction Stop
    return
  }

  if (Get-Module -ListAvailable -Name Posh-SSH) {
    Import-Module Posh-SSH -ErrorAction Stop
    return
  }

  Write-Host 'Instaliram Posh-SSH (Gallery zip, bez interaktivnog prompta)...' -ForegroundColor Yellow
  $installRoot = Join-Path $env:USERPROFILE 'Documents\WindowsPowerShell\Modules'
  $modDir = Join-Path $installRoot 'Posh-SSH'
  New-Item -ItemType Directory -Force -Path $modDir | Out-Null
  $zip = Join-Path $env:TEMP 'Posh-SSH-nupkg.zip'
  $extract = Join-Path $env:TEMP 'Posh-SSH-nupkg'
  Invoke-WebRequest -Uri 'https://www.powershellgallery.com/api/v2/package/Posh-SSH' -OutFile $zip -UseBasicParsing
  if (Test-Path $extract) { Remove-Item $extract -Recurse -Force }
  Expand-Archive -Path $zip -DestinationPath $extract -Force
  Get-ChildItem $extract -File | ForEach-Object { Copy-Item $_.FullName $modDir -Force }
  Get-ChildItem $extract -Directory | Where-Object { $_.Name -notin @('package', '_rels') } | ForEach-Object {
    Copy-Item $_.FullName (Join-Path $modDir $_.Name) -Recurse -Force
  }
  Import-Module (Join-Path $modDir 'Posh-SSH.psd1') -ErrorAction Stop
}

function Get-VpsCredential {
  param([string]$User, [string]$Password)
  $sec = ConvertTo-SecureString $Password -AsPlainText -Force
  return New-Object PSCredential($User, $sec)
}

function Connect-VpsSession {
  param(
    [string]$VpsHost,
    [string]$VpsUser,
    [string]$SshPassword
  )
  Ensure-PoshSshModule
  $cred = Get-VpsCredential -User $VpsUser -Password $SshPassword
  $session = New-SSHSession -ComputerName $VpsHost -Credential $cred -AcceptKey -ErrorAction Stop
  return $session
}

function Invoke-VpsRemoteCommand {
  param(
    [string]$VpsHost,
    [string]$VpsUser = 'root',
    [string]$SshKey = '',
    [string]$SshPassword = '',
    [string]$Command,
    [int]$TimeOutSeconds = 60,
    [switch]$DryRun,
    [object]$Session = $null
  )

  if ($DryRun) {
    Write-Host "[dry-run] ssh $VpsUser@$VpsHost $Command" -ForegroundColor Yellow
    return $Session
  }

  if ($SshKey) {
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & ssh -o StrictHostKeyChecking=accept-new -i $SshKey "${VpsUser}@${VpsHost}" $Command 2>&1 | ForEach-Object { Write-Host $_ }
    $exit = $LASTEXITCODE
    $ErrorActionPreference = $prevEap
    if ($exit -ne 0) { throw "SSH failed: $Command" }
    return $Session
  }

  if ($SshPassword) {
    if (-not $Session) {
      $Session = Connect-VpsSession -VpsHost $VpsHost -VpsUser $VpsUser -SshPassword $SshPassword
    }
    $result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $Command -TimeOut $TimeOutSeconds
    if ($result.Output) { $result.Output | ForEach-Object { Write-Host $_ } }
    if ($result.ExitStatus -ne 0) {
      $err = if ($result.Error) { ($result.Error -join "`n") } else { '' }
      throw "SSH failed ($($result.ExitStatus)): $Command`n$err"
    }
    return $Session
  }

  & ssh -o StrictHostKeyChecking=accept-new "${VpsUser}@${VpsHost}" $Command
  if ($LASTEXITCODE -ne 0) { throw "SSH failed: $Command" }
  return $Session
}

function Invoke-VpsRemoteBashScript {
  param(
    [string]$VpsHost,
    [string]$VpsUser = 'root',
    [string]$SshKey = '',
    [string]$SshPassword = '',
    [string]$ScriptContent,
    [int]$TimeOutSeconds = 7200,
    [switch]$DryRun,
    [object]$Session = $null
  )

  $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($ScriptContent))
  $cmd = "echo $b64 | base64 -d | bash"
  return Invoke-VpsRemoteCommand -VpsHost $VpsHost -VpsUser $VpsUser -SshKey $SshKey `
    -SshPassword $SshPassword -Command $cmd -TimeOutSeconds $TimeOutSeconds -DryRun:$DryRun -Session $Session
}

function Sync-VpsRemoteDirectory {
  param(
    [string]$VpsHost,
    [string]$VpsUser = 'root',
    [string]$SshKey = '',
    [string]$SshPassword = '',
    [string]$LocalRoot,
    [string]$RemotePath,
    [switch]$DryRun,
    [object]$Session = $null
  )

  $tarPath = Join-Path $env:TEMP ("omni-deploy-{0}.tar.gz" -f (Get-Date -Format 'yyyyMMddHHmmss'))
  $excludes = @(
    '--exclude=node_modules',
    '--exclude=.git',
    '--exclude=.tmp',
    '--exclude=TMP~1',
    '--exclude=.npm-cache',
    '--exclude=dist',
    '--exclude=.next',
    '--exclude=deploy-secrets.local',
    '--exclude=omni-shared-vault',
    # Runtime / generated data on VPS — never clobber live artifacts during extract
    '--exclude=atina-platform/atina/data',
    '--exclude=./atina-platform/atina/data',
    '--exclude=.env.docker.prod',
    '--exclude=.env.vps.prod',
    '--exclude=atina-platform/atina/.env.docker.prod',
    '--exclude=atina-platform/atina/.env.vps.prod',
    '--exclude=apps/omnigroup-web/.env.production',
    '--exclude=apps/omnigroup-web/.env.vps.production'
  )

  if ($DryRun) {
    Write-Host "[dry-run] tar + upload -> ${VpsUser}@${VpsHost}:${RemotePath}" -ForegroundColor Yellow
    return $Session
  }

  Push-Location $LocalRoot
  try {
    & tar -czf $tarPath @excludes .
    if ($LASTEXITCODE -ne 0) { throw 'tar pack failed' }
  } finally {
    Pop-Location
  }

  $remoteTar = "/tmp/$(Split-Path -Leaf $tarPath)"

  if ($SshKey) {
    & scp -o StrictHostKeyChecking=accept-new -i $SshKey $tarPath "${VpsUser}@${VpsHost}:${remoteTar}"
    if ($LASTEXITCODE -ne 0) { throw 'scp upload failed' }
  } elseif ($SshPassword) {
    Ensure-PoshSshModule
    $cred = Get-VpsCredential -User $VpsUser -Password $SshPassword
    Set-SCPItem -ComputerName $VpsHost -Credential $cred -AcceptKey -Path $tarPath -Destination '/tmp' -ErrorAction Stop
  } else {
    & scp -o StrictHostKeyChecking=accept-new $tarPath "${VpsUser}@${VpsHost}:${remoteTar}"
    if ($LASTEXITCODE -ne 0) { throw 'scp upload failed' }
  }

  # Incremental extract: --overwrite replaces files. Never use --unlink-first (fails on
  # non-empty dirs). If tar still exits non-zero on dir noise, accept when core paths exist.
  # No double-quotes in remote cmd (PowerShell/ssh argv splitting strips them).
  $extract = ('mkdir -p {0}; set +e; tar --warning=no-unknown-keyword --overwrite -xzf {1} -C {0}; ec=$?; rm -f {1}; chmod +x {0}/scripts/*.sh 2>/dev/null || true; if [ $ec -ne 0 ]; then test -f {0}/scripts/deploy-to-vps.ps1 && test -d {0}/atina-platform/atina/src && echo tar-exit-$ec-ignored-core-paths-present && ec=0; fi; exit $ec' -f $RemotePath, $remoteTar)
  $Session = Invoke-VpsRemoteCommand -VpsHost $VpsHost -VpsUser $VpsUser -SshKey $SshKey `
    -SshPassword $SshPassword -Command $extract -Session $Session

  Remove-Item $tarPath -Force -ErrorAction SilentlyContinue
  return $Session
}

function Close-VpsSession {
  param([object]$Session)
  if ($Session -and $Session.PSObject.Properties['SessionId']) {
    Remove-SSHSession -SessionId $Session.SessionId -ErrorAction SilentlyContinue | Out-Null
  }
}
