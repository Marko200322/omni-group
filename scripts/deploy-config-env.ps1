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
  & $set 'APOLLO_API_KEY' (Get-DeployConfigTrim $Config 'apolloApiKey')
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
  & $set 'COMPANY_LEGAL_NAME' (Get-DeployConfigTrim $Config 'companyLegalName')
  & $set 'COMPANY_TAX_ID' (Get-DeployConfigTrim $Config 'companyTaxId')
  & $set 'COMPANY_ADDRESS' (Get-DeployConfigTrim $Config 'companyAddress')
  & $set 'SUPPORT_GOOGLE_MEET_URL' (Get-DeployConfigTrim $Config 'supportGoogleMeetUrl')
  & $set 'SALES_GOOGLE_MEET_URL' (Get-DeployConfigTrim $Config 'salesGoogleMeetUrl')
  & $set 'MARKETING_GOOGLE_MEET_URL' (Get-DeployConfigTrim $Config 'marketingGoogleMeetUrl')
  & $set 'SUPPORT_ZOOM_URL' (Get-DeployConfigTrim $Config 'supportZoomUrl')
  & $set 'SALES_ZOOM_URL' (Get-DeployConfigTrim $Config 'salesZoomUrl')
  & $set 'MARKETING_ZOOM_URL' (Get-DeployConfigTrim $Config 'marketingZoomUrl')
  & $set 'ZOOM_ACCOUNT_ID' (Get-DeployConfigTrim $Config 'zoomAccountId')
  & $set 'ZOOM_CLIENT_ID' (Get-DeployConfigTrim $Config 'zoomClientId')
  & $set 'ZOOM_CLIENT_SECRET' (Get-DeployConfigTrim $Config 'zoomClientSecret')
  & $set 'BUSINESS_AND_DEV_URL' (Get-DeployConfigTrim $Config 'businessAndDevUrl')
  & $set 'BUSINESS_AND_DEV_KEY' (Get-DeployConfigTrim $Config 'businessAndDevKey')
  & $set 'COMMS_URL' (Get-DeployConfigTrim $Config 'commsUrl')
  & $set 'COMMS_KEY' (Get-DeployConfigTrim $Config 'commsKey')
  & $set 'VAPID_PUBLIC_KEY' (Get-DeployConfigTrim $Config 'vapidPublicKey')
  & $set 'VAPID_PRIVATE_KEY' (Get-DeployConfigTrim $Config 'vapidPrivateKey')
  & $set 'VAPID_SUBJECT' (Get-DeployConfigTrim $Config 'vapidSubject')

  # External AI stack (M4/M5 — keys + connection URLs)
  & $set 'CLAY_API_KEY' (Get-DeployConfigTrim $Config 'clayApiKey')
  & $set 'SALESFORGE_API_KEY' (Get-DeployConfigTrim $Config 'salesforgeApiKey')
  & $set 'INTERCOM_API_KEY' (Get-DeployConfigTrim $Config 'intercomApiKey')
  & $set 'INTERCOM_APP_ID' (Get-DeployConfigTrim $Config 'intercomAppId')
  & $set 'SIERRA_API_KEY' (Get-DeployConfigTrim $Config 'sierraApiKey')
  & $set 'MAKE_API_KEY' (Get-DeployConfigTrim $Config 'makeApiKey')
  & $set 'MAKE_WEBHOOK_URL' (Get-DeployConfigTrim $Config 'makeWebhookUrl')
  & $set 'N8N_API_KEY' (Get-DeployConfigTrim $Config 'n8nApiKey')
  & $set 'N8N_BASE_URL' (Get-DeployConfigTrim $Config 'n8nBaseUrl')
  & $set 'RAMP_API_KEY' (Get-DeployConfigTrim $Config 'rampApiKey')
  & $set 'VIC_AI_API_KEY' (Get-DeployConfigTrim $Config 'vicAiApiKey')
  & $set 'JASPER_API_KEY' (Get-DeployConfigTrim $Config 'jasperApiKey')
  & $set 'PREDIS_API_KEY' (Get-DeployConfigTrim $Config 'predisApiKey')
  & $set 'DEVIN_API_KEY' (Get-DeployConfigTrim $Config 'devinApiKey')
  & $set 'REPLIT_AGENT_API_KEY' (Get-DeployConfigTrim $Config 'replitAgentApiKey')
  & $set 'CREWAI_API_KEY' (Get-DeployConfigTrim $Config 'crewaiApiKey')
  & $set 'CREWAI_BASE_URL' (Get-DeployConfigTrim $Config 'crewaiBaseUrl')
  & $set 'LANGCHAIN_API_KEY' (Get-DeployConfigTrim $Config 'langchainApiKey')
  & $set 'LANGCHAIN_PROJECT' (Get-DeployConfigTrim $Config 'langchainProject')

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
    # CONTACT_EMAIL_* must reach Atina API (factory M1+ required + outbound From)
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
    apolloApiKey        = Get-DeployConfigTrim $Config 'apolloApiKey'
    heygenApiKey        = Get-DeployConfigTrim $Config 'heygenApiKey'
    didApiKey           = Get-DeployConfigTrim $Config 'didApiKey'
    openRouterApiKey    = Get-DeployConfigTrim $Config 'openRouterApiKey'
    resendApiKey        = if ($Config.resend -and $Config.resend.apiKey) { "$($Config.resend.apiKey)".Trim() } else { '' }
    hunterApiKey        = Get-DeployConfigTrim $Config 'hunterApiKey'
    scraperKey          = Get-DeployConfigTrim $Config 'scraperKey'
    factoryPhaseAuto    = if ($Config.factoryPhaseAuto -eq $true -or "$($Config.factoryPhase)".Trim().ToUpper() -eq 'AUTO') { $true } else { $false }
    companyLegalName    = Get-DeployConfigTrim $Config 'companyLegalName'
    companyTaxId        = Get-DeployConfigTrim $Config 'companyTaxId'
    companyAddress      = Get-DeployConfigTrim $Config 'companyAddress'
  }
}

function Merge-KljuceviIntoDeployConfig([object]$Cfg, [hashtable]$Keys) {
  $map = @{
    APOLLO_API_KEY           = 'apolloApiKey'
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
    SUPPORT_GOOGLE_MEET_URL   = 'supportGoogleMeetUrl'
    SALES_GOOGLE_MEET_URL     = 'salesGoogleMeetUrl'
    MARKETING_GOOGLE_MEET_URL = 'marketingGoogleMeetUrl'
    SUPPORT_ZOOM_URL          = 'supportZoomUrl'
    SALES_ZOOM_URL            = 'salesZoomUrl'
    MARKETING_ZOOM_URL        = 'marketingZoomUrl'
    ZOOM_ACCOUNT_ID           = 'zoomAccountId'
    ZOOM_CLIENT_ID            = 'zoomClientId'
    ZOOM_CLIENT_SECRET        = 'zoomClientSecret'
    BUSINESS_AND_DEV_URL      = 'businessAndDevUrl'
    BUSINESS_AND_DEV_KEY      = 'businessAndDevKey'
    COMMS_URL                 = 'commsUrl'
    COMMS_KEY                 = 'commsKey'
    VAPID_PUBLIC_KEY          = 'vapidPublicKey'
    VAPID_PRIVATE_KEY         = 'vapidPrivateKey'
    VAPID_SUBJECT             = 'vapidSubject'
    CLAY_API_KEY              = 'clayApiKey'
    SALESFORGE_API_KEY        = 'salesforgeApiKey'
    INTERCOM_API_KEY          = 'intercomApiKey'
    INTERCOM_APP_ID           = 'intercomAppId'
    SIERRA_API_KEY            = 'sierraApiKey'
    MAKE_API_KEY              = 'makeApiKey'
    MAKE_WEBHOOK_URL          = 'makeWebhookUrl'
    N8N_API_KEY               = 'n8nApiKey'
    N8N_BASE_URL              = 'n8nBaseUrl'
    RAMP_API_KEY              = 'rampApiKey'
    VIC_AI_API_KEY            = 'vicAiApiKey'
    JASPER_API_KEY            = 'jasperApiKey'
    PREDIS_API_KEY            = 'predisApiKey'
    DEVIN_API_KEY             = 'devinApiKey'
    REPLIT_AGENT_API_KEY      = 'replitAgentApiKey'
    CREWAI_API_KEY            = 'crewaiApiKey'
    CREWAI_BASE_URL           = 'crewaiBaseUrl'
    LANGCHAIN_API_KEY         = 'langchainApiKey'
    LANGCHAIN_PROJECT         = 'langchainProject'
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
    APOLLO_API_KEY               = Get-DeployConfigTrim $Config 'apolloApiKey'
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
    SUPPORT_GOOGLE_MEET_URL      = Get-DeployConfigTrim $Config 'supportGoogleMeetUrl'
    SALES_GOOGLE_MEET_URL        = Get-DeployConfigTrim $Config 'salesGoogleMeetUrl'
    MARKETING_GOOGLE_MEET_URL    = Get-DeployConfigTrim $Config 'marketingGoogleMeetUrl'
    SUPPORT_ZOOM_URL             = Get-DeployConfigTrim $Config 'supportZoomUrl'
    SALES_ZOOM_URL               = Get-DeployConfigTrim $Config 'salesZoomUrl'
    MARKETING_ZOOM_URL           = Get-DeployConfigTrim $Config 'marketingZoomUrl'
    BUSINESS_AND_DEV_URL         = Get-DeployConfigTrim $Config 'businessAndDevUrl'
    BUSINESS_AND_DEV_KEY         = Get-DeployConfigTrim $Config 'businessAndDevKey'
    COMMS_URL                    = Get-DeployConfigTrim $Config 'commsUrl'
    COMMS_KEY                    = Get-DeployConfigTrim $Config 'commsKey'
    VAPID_PUBLIC_KEY             = Get-DeployConfigTrim $Config 'vapidPublicKey'
    VAPID_PRIVATE_KEY            = Get-DeployConfigTrim $Config 'vapidPrivateKey'
    VAPID_SUBJECT                = Get-DeployConfigTrim $Config 'vapidSubject'
    CLAY_API_KEY                 = Get-DeployConfigTrim $Config 'clayApiKey'
    SALESFORGE_API_KEY           = Get-DeployConfigTrim $Config 'salesforgeApiKey'
    INTERCOM_API_KEY             = Get-DeployConfigTrim $Config 'intercomApiKey'
    INTERCOM_APP_ID              = Get-DeployConfigTrim $Config 'intercomAppId'
    SIERRA_API_KEY               = Get-DeployConfigTrim $Config 'sierraApiKey'
    MAKE_API_KEY                 = Get-DeployConfigTrim $Config 'makeApiKey'
    MAKE_WEBHOOK_URL             = Get-DeployConfigTrim $Config 'makeWebhookUrl'
    N8N_API_KEY                  = Get-DeployConfigTrim $Config 'n8nApiKey'
    N8N_BASE_URL                 = Get-DeployConfigTrim $Config 'n8nBaseUrl'
    RAMP_API_KEY                 = Get-DeployConfigTrim $Config 'rampApiKey'
    VIC_AI_API_KEY               = Get-DeployConfigTrim $Config 'vicAiApiKey'
    JASPER_API_KEY               = Get-DeployConfigTrim $Config 'jasperApiKey'
    PREDIS_API_KEY               = Get-DeployConfigTrim $Config 'predisApiKey'
    DEVIN_API_KEY                = Get-DeployConfigTrim $Config 'devinApiKey'
    REPLIT_AGENT_API_KEY         = Get-DeployConfigTrim $Config 'replitAgentApiKey'
    CREWAI_API_KEY               = Get-DeployConfigTrim $Config 'crewaiApiKey'
    CREWAI_BASE_URL              = Get-DeployConfigTrim $Config 'crewaiBaseUrl'
    LANGCHAIN_API_KEY            = Get-DeployConfigTrim $Config 'langchainApiKey'
    LANGCHAIN_PROJECT            = Get-DeployConfigTrim $Config 'langchainProject'
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
