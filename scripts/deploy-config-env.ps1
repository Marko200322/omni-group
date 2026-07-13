#Requires -Version 5.1
<#
  Shared deploy.config.json -> prod env mapping (M0-M6 factory phases).
  Dot-source from deploy-from-local-secrets.ps1, sync-kljucevi, verify-factory-phase, bump-factory-phase.
#>

function Get-DeployConfigTrim([object]$Config, [string]$Property) {
  if ($null -eq $Config) { return '' }
  $val = $Config.$Property
  if ($null -eq $val) { return '' }
  return "$val".Trim()
}

function Build-DeployConfigKeyLookup([object]$Config) {
  if ($null -eq $Config) { return @{} }
  $lookup = @{}
  $set = {
    param([string]$EnvKey, [string]$Value)
    if (-not [string]::IsNullOrWhiteSpace($Value)) { $lookup[$EnvKey] = $Value.Trim() }
  }

  & $set 'OPENROUTER_API_KEY' (Get-DeployConfigTrim $Config 'openRouterApiKey')
  & $set 'AI_KEY' (Get-DeployConfigTrim $Config 'openRouterApiKey')
  & $set 'ELEVENLABS_API_KEY' (Get-DeployConfigTrim $Config 'elevenLabsApiKey')
  & $set 'HEYGEN_API_KEY' (Get-DeployConfigTrim $Config 'heygenApiKey')
  & $set 'DID_API_KEY' (Get-DeployConfigTrim $Config 'didApiKey')
  & $set 'SCRAPER_KEY' (Get-DeployConfigTrim $Config 'scraperKey')
  & $set 'SCRAPER_URL' (Get-DeployConfigTrim $Config 'scraperUrl')
  & $set 'HUNTER_API_KEY' (Get-DeployConfigTrim $Config 'hunterApiKey')
  & $set 'NEVERBOUNCE_API_KEY' (Get-DeployConfigTrim $Config 'neverbounceApiKey')
  & $set 'ZEROBOUNCE_API_KEY' (Get-DeployConfigTrim $Config 'zerobounceApiKey')
  & $set 'STRIPE_SECRET_KEY' (Get-DeployConfigTrim $Config 'stripeSecretKey')
  & $set 'STRIPE_PUBLISHABLE_KEY' (Get-DeployConfigTrim $Config 'stripePublishableKey')
  & $set 'STRIPE_WEBHOOK_SECRET' (Get-DeployConfigTrim $Config 'stripeWebhookSecret')
  & $set 'STARTER_PRICE_ID' (Get-DeployConfigTrim $Config 'starterPriceId')
  & $set 'PRO_PRICE_ID' (Get-DeployConfigTrim $Config 'proPriceId')
  & $set 'ENTERPRISE_PRICE_ID' (Get-DeployConfigTrim $Config 'enterprisePriceId')
  & $set 'SLACK_WEBHOOK_URL' (Get-DeployConfigTrim $Config 'slackWebhookUrl')
  & $set 'TELEGRAM_BOT_TOKEN' (Get-DeployConfigTrim $Config 'telegramBotToken')
  & $set 'TELEGRAM_CHAT_ID' (Get-DeployConfigTrim $Config 'telegramChatId')

  if ($Config.resend -and $Config.resend.contactFrom) {
    & $set 'CONTACT_EMAIL_FROM' "$($Config.resend.contactFrom)".Trim()
  }
  if ($Config.resend -and $Config.resend.contactTo) {
    & $set 'CONTACT_EMAIL_TO' "$($Config.resend.contactTo)".Trim()
  }

  if ($Config.resend -and $Config.resend.apiKey) {
    & $set 'RESEND_API_KEY' "$($Config.resend.apiKey)".Trim()
  }
  if ($Config.resend -and $Config.resend.contactFrom) {
    & $set 'CONTACT_EMAIL_FROM' "$($Config.resend.contactFrom)".Trim()
  }
  if ($Config.resend -and $Config.resend.contactTo) {
    & $set 'CONTACT_EMAIL_TO' "$($Config.resend.contactTo)".Trim()
  }

  $stripeSecret = Get-DeployConfigTrim $Config 'stripeSecretKey'
  if ($stripeSecret) {
    & $set 'FINANCE_KEY' $stripeSecret
  }

  return $lookup
}

function Get-DeployConfigAtinaEnvPatches([object]$Config) {
  $lookup = Build-DeployConfigKeyLookup $Config
  $patches = [ordered]@{}
  foreach ($entry in $lookup.GetEnumerator()) {
    if ($entry.Key -in @('CONTACT_EMAIL_FROM', 'CONTACT_EMAIL_TO')) { continue }
    $patches[$entry.Key] = $entry.Value
  }
  if ($lookup.ContainsKey('RESEND_API_KEY')) {
    $patches['RESEND_API_KEY'] = $lookup['RESEND_API_KEY']
  }
  return $patches
}

function Get-DeployConfigWebEnvPatches([object]$Config, [string]$SiteDomain) {
  $lookup = Build-DeployConfigKeyLookup $Config
  $patches = [ordered]@{}
  foreach ($k in @('RESEND_API_KEY', 'CONTACT_EMAIL_FROM', 'CONTACT_EMAIL_TO')) {
    if ($lookup.ContainsKey($k)) { $patches[$k] = $lookup[$k] }
  }

  $crmEmail = Get-DeployConfigTrim $Config 'contactCrmIngressEmail'
  if (-not $crmEmail) { $crmEmail = Get-DeployConfigTrim $Config 'adminEmail' }
  $crmPassword = Get-DeployConfigTrim $Config 'contactCrmIngressPassword'
  if (-not $crmPassword) { $crmPassword = Get-DeployConfigTrim $Config 'adminPassword' }
  if ($crmEmail) { $patches['CONTACT_CRM_INGRESS_EMAIL'] = $crmEmail }
  if ($crmPassword) { $patches['CONTACT_CRM_INGRESS_PASSWORD'] = $crmPassword }

  $slackContact = Get-DeployConfigTrim $Config 'contactSlackWebhookUrl'
  if (-not $slackContact) { $slackContact = Get-DeployConfigTrim $Config 'slackWebhookUrl' }
  if ($slackContact) { $patches['CONTACT_SLACK_WEBHOOK_URL'] = $slackContact }

  $tgToken = Get-DeployConfigTrim $Config 'telegramBotToken'
  $tgChat = Get-DeployConfigTrim $Config 'telegramChatId'
  if ($tgToken) { $patches['TELEGRAM_BOT_TOKEN'] = $tgToken }
  if ($tgChat) { $patches['TELEGRAM_CHAT_ID'] = $tgChat }
  $patches['ADMIN_TELEGRAM_NOTIFY'] = if ($Config.adminTelegramNotify -eq $false) { 'false' } else { 'true' }
  if ($SiteDomain) {
    $patches['NEXT_PUBLIC_SITE_URL'] = "https://$SiteDomain"
  }
  return $patches
}

function Build-DeployConfigHashtable([object]$Config) {
  return @{
    stripeSecretKey     = Get-DeployConfigTrim $Config 'stripeSecretKey'
    stripeWebhookSecret = Get-DeployConfigTrim $Config 'stripeWebhookSecret'
    stripePublishableKey = Get-DeployConfigTrim $Config 'stripePublishableKey'
    heygenApiKey        = Get-DeployConfigTrim $Config 'heygenApiKey'
    didApiKey           = Get-DeployConfigTrim $Config 'didApiKey'
    openRouterApiKey    = Get-DeployConfigTrim $Config 'openRouterApiKey'
    resendApiKey        = if ($Config.resend -and $Config.resend.apiKey) { "$($Config.resend.apiKey)".Trim() } else { '' }
    hunterApiKey        = Get-DeployConfigTrim $Config 'hunterApiKey'
    scraperKey          = Get-DeployConfigTrim $Config 'scraperKey'
  }
}

function Merge-KljuceviIntoDeployConfig([object]$Cfg, [hashtable]$Keys) {
  $map = @{
    HEYGEN_API_KEY           = 'heygenApiKey'
    DID_API_KEY              = 'didApiKey'
    STRIPE_SECRET_KEY        = 'stripeSecretKey'
    STRIPE_PUBLISHABLE_KEY   = 'stripePublishableKey'
    STRIPE_WEBHOOK_SECRET    = 'stripeWebhookSecret'
    SLACK_WEBHOOK_URL        = 'slackWebhookUrl'
    SCRAPER_KEY              = 'scraperKey'
    SCRAPER_URL              = 'scraperUrl'
    HUNTER_API_KEY           = 'hunterApiKey'
    NEVERBOUNCE_API_KEY      = 'neverbounceApiKey'
    ZEROBOUNCE_API_KEY       = 'zerobounceApiKey'
    STARTER_PRICE_ID         = 'starterPriceId'
    PRO_PRICE_ID             = 'proPriceId'
    ENTERPRISE_PRICE_ID      = 'enterprisePriceId'
    OPENROUTER_API_KEY       = 'openRouterApiKey'
    ELEVENLABS_API_KEY       = 'elevenLabsApiKey'
    TELEGRAM_BOT_TOKEN           = 'telegramBotToken'
    TELEGRAM_CHAT_ID             = 'telegramChatId'
    CONTACT_SLACK_WEBHOOK_URL = 'contactSlackWebhookUrl'
  }
  foreach ($entry in $map.GetEnumerator()) {
    if ($Keys.ContainsKey($entry.Key) -and $Keys[$entry.Key]) {
      $Cfg | Add-Member -NotePropertyName $entry.Value -NotePropertyValue $Keys[$entry.Key] -Force
    }
  }
  if ($Keys.RESEND_API_KEY) {
    if (-not $Cfg.resend) { $Cfg | Add-Member -NotePropertyName resend -NotePropertyValue ([pscustomobject]@{}) -Force }
    $Cfg.resend | Add-Member -NotePropertyName apiKey -NotePropertyValue $Keys.RESEND_API_KEY -Force
  }
  if ($Keys.CONTACT_CRM_INGRESS_EMAIL) {
    $Cfg | Add-Member -NotePropertyName contactCrmIngressEmail -NotePropertyValue $Keys.CONTACT_CRM_INGRESS_EMAIL -Force
  }
  if ($Keys.CONTACT_CRM_INGRESS_PASSWORD) {
    $Cfg | Add-Member -NotePropertyName contactCrmIngressPassword -NotePropertyValue $Keys.CONTACT_CRM_INGRESS_PASSWORD -Force
  }
  return $Cfg
}

function Get-KljuceviSyncFromDeployConfig([object]$Config) {
  $map = @{
    RESEND_API_KEY               = if ($Config.resend -and $Config.resend.apiKey) { "$($Config.resend.apiKey)".Trim() } else { '' }
    AI_KEY                       = Get-DeployConfigTrim $Config 'openRouterApiKey'
    OPENROUTER_API_KEY           = Get-DeployConfigTrim $Config 'openRouterApiKey'
    ELEVENLABS_API_KEY           = Get-DeployConfigTrim $Config 'elevenLabsApiKey'
    HEYGEN_API_KEY               = Get-DeployConfigTrim $Config 'heygenApiKey'
    DID_API_KEY                  = Get-DeployConfigTrim $Config 'didApiKey'
    SCRAPER_KEY                  = Get-DeployConfigTrim $Config 'scraperKey'
    SCRAPER_URL                  = Get-DeployConfigTrim $Config 'scraperUrl'
    HUNTER_API_KEY               = Get-DeployConfigTrim $Config 'hunterApiKey'
    NEVERBOUNCE_API_KEY          = Get-DeployConfigTrim $Config 'neverbounceApiKey'
    ZEROBOUNCE_API_KEY           = Get-DeployConfigTrim $Config 'zerobounceApiKey'
    STRIPE_SECRET_KEY            = Get-DeployConfigTrim $Config 'stripeSecretKey'
    STRIPE_PUBLISHABLE_KEY       = Get-DeployConfigTrim $Config 'stripePublishableKey'
    STRIPE_WEBHOOK_SECRET        = Get-DeployConfigTrim $Config 'stripeWebhookSecret'
    STARTER_PRICE_ID             = Get-DeployConfigTrim $Config 'starterPriceId'
    PRO_PRICE_ID                 = Get-DeployConfigTrim $Config 'proPriceId'
    ENTERPRISE_PRICE_ID          = Get-DeployConfigTrim $Config 'enterprisePriceId'
    SLACK_WEBHOOK_URL            = Get-DeployConfigTrim $Config 'slackWebhookUrl'
    CONTACT_SLACK_WEBHOOK_URL    = Get-DeployConfigTrim $Config 'contactSlackWebhookUrl'
    TELEGRAM_BOT_TOKEN           = Get-DeployConfigTrim $Config 'telegramBotToken'
    TELEGRAM_CHAT_ID             = Get-DeployConfigTrim $Config 'telegramChatId'
    CONTACT_CRM_INGRESS_PASSWORD = Get-DeployConfigTrim $Config 'contactCrmIngressPassword'
  }
  if (-not $map.CONTACT_CRM_INGRESS_PASSWORD) {
    $map.CONTACT_CRM_INGRESS_PASSWORD = Get-DeployConfigTrim $Config 'adminPassword'
  }
  if ($Config.resend -and $Config.resend.contactFrom) {
    $map['CONTACT_EMAIL_FROM'] = "$($Config.resend.contactFrom)".Trim()
  }
  if ($Config.resend -and $Config.resend.contactTo) {
    $map['CONTACT_EMAIL_TO'] = "$($Config.resend.contactTo)".Trim()
  }
  return $map
}
