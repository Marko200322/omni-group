# CSRF / same-origin headers for authenticated BFF POST smoke tests (production middleware).
function Get-BffSmokePostHeaders {
  param(
    [Microsoft.PowerShell.Commands.WebRequestSession]$Session,
    [string]$WebBase
  )
  $base = $WebBase.TrimEnd('/')
  $headers = @{ Referer = "$base/dashboard" }
  $csrf = $Session.Cookies.GetCookies($base) | Where-Object { $_.Name -eq 'og_csrf' } | Select-Object -First 1
  if ($csrf -and $csrf.Value) {
    $headers['x-csrf-token'] = $csrf.Value
  }
  return $headers
}
