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
  & $set 'BRIGHTDATA_API_KEY' (Get-DeployConfigTrim $Config 'brightdataApiKey')

  # Live call avatar (HeyGen Live / D-ID Agents / Recall.ai)
  & $set 'LIVE_CALL_AVATAR_ENABLED' (Get-DeployConfigLiveCallEnabled $Config)
  & $set 'LIVE_CALL_AVATAR_ALLOW_STUB' (Get-DeployConfigLiveCallAllowStub $Config)
  & $set 'LIVE_AVATAR_PROVIDER_CHAIN' (Get-DeployConfigTrim $Config 'liveAvatarProviderChain')
  & $set 'LIVE_CALL_MAX_MINUTES' (Get-DeployConfigTrim $Config 'liveCallMaxMinutes')
  & $set 'LIVE_CALL_HUMAN_HANDOFF_ENABLED' (Get-DeployConfigLiveCallHandoff $Config)
  & $set 'HEYGEN_LIVE_API_KEY' (Get-DeployConfigTrim $Config 'heygenLiveApiKey')
  & $set 'HEYGEN_DEFAULT_AVATAR_ID' (Get-DeployConfigTrim $Config 'heygenDefaultAvatarId')
  & $set 'DID_AGENTS_API_KEY' (Get-DeployConfigTrim $Config 'didAgentsApiKey')
  & $set 'DID_DEFAULT_AGENT_ID' (Get-DeployConfigTrim $Config 'didDefaultAgentId')
  & $set 'DID_AGENT_ID_MILA' (Get-DeployConfigTrim $Config 'didAgentIdMila')
  & $set 'DID_AGENT_ID_STEFAN' (Get-DeployConfigTrim $Config 'didAgentIdStefan')
  & $set 'DID_AGENT_ID_NIKOLA' (Get-DeployConfigTrim $Config 'didAgentIdNikola')
  & $set 'RECALL_API_KEY' (Get-DeployConfigTrim $Config 'recallApiKey')
  & $set 'RECALL_API_BASE' (Get-DeployConfigTrim $Config 'recallApiBase')
  & $set 'RECALL_WEBHOOK_SECRET' (Get-DeployConfigTrim $Config 'recallWebhookSecret')
  & $set 'DEEPGRAM_API_KEY' (Get-DeployConfigTrim $Config 'deepgramApiKey')
  & $set 'LIVE_STT_PROVIDER' (Get-DeployConfigTrim $Config 'liveSttProvider')
  & $set 'LIVE_TTS_STREAMING' (Get-DeployConfigLiveCallTtsStreaming $Config)

  # Instantly outbound
  if ($Config.instantly -and $Config.instantly.apiKey) {
    & $set 'INSTANTLY_API_KEY' "$($Config.instantly.apiKey)".Trim()
  }
  if ($Config.instantly -and $Config.instantly.campaignId) {
    & $set 'INSTANTLY_CAMPAIGN_ID' "$($Config.instantly.campaignId)".Trim()
  }
  if ($Config.instantly -and $Config.instantly.apiKey) {
    & $set 'OUTREACH_EMAIL_PROVIDER' 'instantly'
  }

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

function Get-DeployConfigLiveCallEnabled([object]$Config) {
  $top = Get-DeployConfigTrim $Config 'liveCallAvatarEnabled'
  if ($top) { return $top.ToLower() }
  if ($null -ne $Config.liveCallAvatar -and $null -ne $Config.liveCallAvatar.enabled) {
    return if ($Config.liveCallAvatar.enabled -eq $true) { 'true' } else { 'false' }
  }
  return ''
}

function Get-DeployConfigLiveCallAllowStub([object]$Config) {
  $top = Get-DeployConfigTrim $Config 'liveCallAvatarAllowStub'
  if ($top) { return $top.ToLower() }
  if ($null -ne $Config.liveCallAvatar -and $null -ne $Config.liveCallAvatar.allowStub) {
    return if ($Config.liveCallAvatar.allowStub -eq $false) { 'false' } else { 'true' }
  }
  return 'true'
}

function Get-DeployConfigLiveCallHandoff([object]$Config) {
  $top = Get-DeployConfigTrim $Config 'liveCallHumanHandoffEnabled'
  if ($top) { return $top.ToLower() }
  if ($null -ne $Config.liveCallAvatar -and $null -ne $Config.liveCallAvatar.humanHandoffEnabled) {
    return if ($Config.liveCallAvatar.humanHandoffEnabled -eq $false) { 'false' } else { 'true' }
  }
  return 'true'
}

function Get-DeployConfigLiveCallTtsStreaming([object]$Config) {
  $top = Get-DeployConfigTrim $Config 'liveTtsStreaming'
  if ($top) { return $top.ToLower() }
  if ($null -ne $Config.liveCallAvatar -and $null -ne $Config.liveCallAvatar.ttsStreaming) {
    return if ($Config.liveCallAvatar.ttsStreaming -eq $false) { 'false' } else { 'true' }
  }
  return 'true'
}

function Resolve-RecallWebhookUrl([object]$Config, [string]$ApiDomain) {
  $explicit = Get-DeployConfigTrim $Config 'recallWebhookUrl'
  if ($explicit) { return $explicit }
  if ($Config.liveCallAvatar -and $Config.liveCallAvatar.recallWebhookUrl) {
    $nested = "$($Config.liveCallAvatar.recallWebhookUrl)".Trim()
    if ($nested) { return $nested }
  }
  $domain = if ($ApiDomain) { $ApiDomain.Trim() } else { Get-DeployConfigTrim $Config 'apiDomain' }
  if (-not $domain) { return '' }
  return "https://$domain/api/v1/live-call-avatar/recall/webhook"
}

function Get-DeployConfigLiveCallEnvPatches([object]$Config, [string]$ApiDomain = '') {
  $patches = [ordered]@{}
  $defaults = @{
    LIVE_CALL_AVATAR_ALLOW_STUB       = 'true'
    LIVE_AVATAR_PROVIDER_CHAIN        = 'heygen,d-id,stub'
    LIVE_CALL_MAX_MINUTES             = '30'
    LIVE_CALL_HUMAN_HANDOFF_ENABLED   = 'true'
    LIVE_STT_PROVIDER                 = 'deepgram'
    LIVE_TTS_STREAMING                = 'true'
    RECALL_API_BASE                   = 'https://api.recall.ai/api/v1'
  }
  foreach ($entry in $defaults.GetEnumerator()) {
    $patches[$entry.Key] = $entry.Value
  }

  $lookup = Build-DeployConfigKeyLookup $Config
  foreach ($key in @(
    'LIVE_CALL_AVATAR_ENABLED', 'LIVE_CALL_AVATAR_ALLOW_STUB', 'LIVE_AVATAR_PROVIDER_CHAIN',
    'LIVE_CALL_MAX_MINUTES', 'LIVE_CALL_HUMAN_HANDOFF_ENABLED', 'HEYGEN_LIVE_API_KEY',
    'HEYGEN_DEFAULT_AVATAR_ID', 'DID_AGENTS_API_KEY', 'DID_DEFAULT_AGENT_ID',
    'DID_AGENT_ID_MILA', 'DID_AGENT_ID_STEFAN', 'DID_AGENT_ID_NIKOLA',
    'RECALL_API_KEY', 'RECALL_API_BASE', 'RECALL_WEBHOOK_SECRET', 'DEEPGRAM_API_KEY',
    'LIVE_STT_PROVIDER', 'LIVE_TTS_STREAMING'
  )) {
    if ($lookup.ContainsKey($key) -and $lookup[$key]) {
      $patches[$key] = $lookup[$key]
    }
  }

  if (-not $lookup.ContainsKey('LIVE_CALL_AVATAR_ENABLED') -or -not $lookup['LIVE_CALL_AVATAR_ENABLED']) {
    $patches['LIVE_CALL_AVATAR_ENABLED'] = 'false'
  }

  $webhookUrl = Resolve-RecallWebhookUrl $Config $ApiDomain
  if ($webhookUrl) { $patches['RECALL_WEBHOOK_URL'] = $webhookUrl }

  return $patches
}

function Get-DeployConfigAtinaEnvPatches([object]$Config, [string]$ApiDomain = '') {
  $lookup = Build-DeployConfigKeyLookup $Config
  $patches = [ordered]@{}
  foreach ($entry in $lookup.GetEnumerator()) {
    # CONTACT_EMAIL_* must reach Atina API (factory M1+ required + outbound From)
    $patches[$entry.Key] = $entry.Value
  }
  if ($lookup.ContainsKey('RESEND_API_KEY')) {
    $patches['RESEND_API_KEY'] = $lookup['RESEND_API_KEY']
  }
  $patches['REGISTRATION_ENABLED'] = if ($Config.registrationEnabled -eq $true) { 'true' } else { 'false' }
  foreach ($entry in (Get-FoundingClientPromoEnvMap $Config).GetEnumerator()) {
    $patches[$entry.Key] = $entry.Value
  }
  foreach ($entry in (Get-DeployConfigLiveCallEnvPatches $Config $ApiDomain).GetEnumerator()) {
    $patches[$entry.Key] = $entry.Value
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
  if ($lookup.ContainsKey('COMPANY_LEGAL_NAME')) {
    $patches['NEXT_PUBLIC_COMPANY_LEGAL_NAME'] = $lookup['COMPANY_LEGAL_NAME']
  }
  if ($lookup.ContainsKey('COMPANY_TAX_ID')) {
    $patches['NEXT_PUBLIC_COMPANY_TAX_ID'] = $lookup['COMPANY_TAX_ID']
  }
  if ($lookup.ContainsKey('COMPANY_ADDRESS')) {
    $patches['NEXT_PUBLIC_COMPANY_ADDRESS'] = $lookup['COMPANY_ADDRESS']
  }
  if ($lookup.ContainsKey('CONTACT_EMAIL_TO')) {
    $patches['NEXT_PUBLIC_SUPPORT_EMAIL'] = $lookup['CONTACT_EMAIL_TO']
  }
  $patches['REGISTRATION_ENABLED'] = if ($Config.registrationEnabled -eq $true) { 'true' } else { 'false' }
  $patches['NEXT_PUBLIC_REGISTRATION_ENABLED'] = if ($Config.registrationEnabled -eq $true) { 'true' } else { 'false' }
  foreach ($entry in (Get-FoundingClientPromoEnvMap $Config).GetEnumerator()) {
    $patches[$entry.Key] = $entry.Value
  }
  return $patches
}

function Get-FoundingClientPromoEnvMap([object]$Config) {
  $enabled = if ($null -eq $Config -or $null -eq $Config.foundingClientPromo) { 'false' }
    elseif ($Config.foundingClientPromo -eq $false) { 'false' }
    else { 'true' }
  $map = [ordered]@{
    NEXT_PUBLIC_FOUNDING_CLIENT_PROMO = $enabled
    FOUNDING_CLIENT_PROMO             = $enabled
  }
  $discount = Get-DeployConfigTrim $Config 'foundingClientDiscountPct'
  if ($discount) {
    $map['NEXT_PUBLIC_FOUNDING_CLIENT_DISCOUNT_PCT'] = $discount
    $map['FOUNDING_CLIENT_DISCOUNT_PCT'] = $discount
  }
  $slots = Get-DeployConfigTrim $Config 'foundingClientMaxSlots'
  if ($slots) { $map['NEXT_PUBLIC_FOUNDING_CLIENT_MAX_SLOTS'] = $slots }
  $lockMo = Get-DeployConfigTrim $Config 'foundingClientLockMonths'
  if ($lockMo) { $map['NEXT_PUBLIC_FOUNDING_CLIENT_LOCK_MONTHS'] = $lockMo }
  return $map
}

function Sync-RootDockerNextPublicFromWeb([string]$RepoRoot) {
  $rootEnv = Join-Path $RepoRoot '.env.vps.prod'
  $webEnv = Join-Path $RepoRoot 'apps\omnigroup-web\.env.vps.production'
  if (-not (Test-Path $webEnv)) { return }
  foreach ($line in Get-Content $webEnv) {
    if ($line -match '^\s*(NEXT_PUBLIC_[A-Z0-9_]+)\s*=\s*(.*)$') {
      Set-EnvLineInDeployFile $rootEnv $Matches[1] $Matches[2]
    }
  }
}

function Set-EnvLineInDeployFile([string]$FilePath, [string]$Key, [string]$Value) {
  if (-not (Test-Path $FilePath)) { return }
  $escaped = [regex]::Escape($Key)
  $lines = Get-Content $FilePath
  $found = $false
  $out = foreach ($line in $lines) {
    if ($line -match "^\s*$escaped\s*=") {
      $found = $true
      "$Key=$Value"
    } else {
      $line
    }
  }
  if (-not $found) { $out += "$Key=$Value" }
  Set-Content -Path $FilePath -Value $out -Encoding UTF8
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
    HEYGEN_LIVE_API_KEY       = 'heygenLiveApiKey'
    HEYGEN_DEFAULT_AVATAR_ID  = 'heygenDefaultAvatarId'
    DID_AGENTS_API_KEY        = 'didAgentsApiKey'
    DID_DEFAULT_AGENT_ID      = 'didDefaultAgentId'
    DID_AGENT_ID_MILA         = 'didAgentIdMila'
    DID_AGENT_ID_STEFAN       = 'didAgentIdStefan'
    DID_AGENT_ID_NIKOLA       = 'didAgentIdNikola'
    RECALL_API_KEY            = 'recallApiKey'
    RECALL_API_BASE           = 'recallApiBase'
    RECALL_WEBHOOK_URL        = 'recallWebhookUrl'
    RECALL_WEBHOOK_SECRET     = 'recallWebhookSecret'
    DEEPGRAM_API_KEY          = 'deepgramApiKey'
    LIVE_CALL_AVATAR_ENABLED  = 'liveCallAvatarEnabled'
    LIVE_CALL_AVATAR_ALLOW_STUB = 'liveCallAvatarAllowStub'
    LIVE_AVATAR_PROVIDER_CHAIN = 'liveAvatarProviderChain'
    LIVE_CALL_MAX_MINUTES     = 'liveCallMaxMinutes'
    LIVE_CALL_HUMAN_HANDOFF_ENABLED = 'liveCallHumanHandoffEnabled'
    LIVE_STT_PROVIDER         = 'liveSttProvider'
    LIVE_TTS_STREAMING        = 'liveTtsStreaming'
    INSTANTLY_API_KEY         = 'instantlyApiKey'
    INSTANTLY_CAMPAIGN_ID     = 'instantlyCampaignId'
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
  if ($Keys.INSTANTLY_API_KEY) {
    if (-not $Cfg.instantly) { $Cfg | Add-Member -NotePropertyName instantly -NotePropertyValue ([pscustomobject]@{}) -Force }
    $Cfg.instantly | Add-Member -NotePropertyName apiKey -NotePropertyValue $Keys.INSTANTLY_API_KEY -Force
  }
  if ($Keys.INSTANTLY_CAMPAIGN_ID) {
    if (-not $Cfg.instantly) { $Cfg | Add-Member -NotePropertyName instantly -NotePropertyValue ([pscustomobject]@{}) -Force }
    $Cfg.instantly | Add-Member -NotePropertyName campaignId -NotePropertyValue $Keys.INSTANTLY_CAMPAIGN_ID -Force
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
    HEYGEN_LIVE_API_KEY          = Get-DeployConfigTrim $Config 'heygenLiveApiKey'
    HEYGEN_DEFAULT_AVATAR_ID     = Get-DeployConfigTrim $Config 'heygenDefaultAvatarId'
    DID_AGENTS_API_KEY           = Get-DeployConfigTrim $Config 'didAgentsApiKey'
    DID_DEFAULT_AGENT_ID         = Get-DeployConfigTrim $Config 'didDefaultAgentId'
    DID_AGENT_ID_MILA            = Get-DeployConfigTrim $Config 'didAgentIdMila'
    DID_AGENT_ID_STEFAN          = Get-DeployConfigTrim $Config 'didAgentIdStefan'
    DID_AGENT_ID_NIKOLA          = Get-DeployConfigTrim $Config 'didAgentIdNikola'
    RECALL_API_KEY               = Get-DeployConfigTrim $Config 'recallApiKey'
    RECALL_API_BASE              = Get-DeployConfigTrim $Config 'recallApiBase'
    RECALL_WEBHOOK_URL           = Get-DeployConfigTrim $Config 'recallWebhookUrl'
    RECALL_WEBHOOK_SECRET        = Get-DeployConfigTrim $Config 'recallWebhookSecret'
    DEEPGRAM_API_KEY             = Get-DeployConfigTrim $Config 'deepgramApiKey'
    LIVE_CALL_AVATAR_ENABLED     = Get-DeployConfigLiveCallEnabled $Config
    LIVE_CALL_AVATAR_ALLOW_STUB  = Get-DeployConfigLiveCallAllowStub $Config
    LIVE_AVATAR_PROVIDER_CHAIN   = Get-DeployConfigTrim $Config 'liveAvatarProviderChain'
    LIVE_CALL_MAX_MINUTES        = Get-DeployConfigTrim $Config 'liveCallMaxMinutes'
    LIVE_CALL_HUMAN_HANDOFF_ENABLED = Get-DeployConfigLiveCallHandoff $Config
    LIVE_STT_PROVIDER            = Get-DeployConfigTrim $Config 'liveSttProvider'
    LIVE_TTS_STREAMING           = Get-DeployConfigLiveCallTtsStreaming $Config
  }
  $map['RECALL_WEBHOOK_URL'] = Resolve-RecallWebhookUrl $Config (Get-DeployConfigTrim $Config 'apiDomain')
  if ($Config.instantly -and $Config.instantly.apiKey) {
    $map['INSTANTLY_API_KEY'] = "$($Config.instantly.apiKey)".Trim()
  }
  if ($Config.instantly -and $Config.instantly.campaignId) {
    $map['INSTANTLY_CAMPAIGN_ID'] = "$($Config.instantly.campaignId)".Trim()
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

function Apply-DeployConfigProdEnvFiles {
  param(
    [object]$Config,
    [string]$RepoRoot,
    [string]$SiteDomain,
    [string]$ApiDomain,
    [string]$Phase
  )

  $rootEnv = Join-Path $RepoRoot '.env.vps.prod'
  $atinaEnv = Join-Path $RepoRoot 'atina-platform\atina\.env.vps.prod'
  $webEnv = Join-Path $RepoRoot 'apps\omnigroup-web\.env.vps.production'

  if ($Config.adminEmail) {
    Set-EnvLineInDeployFile $atinaEnv 'ADMIN_EMAIL' $Config.adminEmail.Trim()
  }
  if ($Config.paymentNotifyEmail) {
    Set-EnvLineInDeployFile $atinaEnv 'PAYMENT_NOTIFY_EMAIL' $Config.paymentNotifyEmail.Trim()
  }

  foreach ($entry in (Get-DeployConfigAtinaEnvPatches $Config $ApiDomain).GetEnumerator()) {
    Set-EnvLineInDeployFile $atinaEnv $entry.Key $entry.Value
  }

  if ($Config.manualPayment) {
    $mp = $Config.manualPayment
    if ($mp.accountName) { Set-EnvLineInDeployFile $atinaEnv 'MANUAL_PAYMENT_ACCOUNT_NAME' $mp.accountName }
    if ($mp.iban) { Set-EnvLineInDeployFile $atinaEnv 'MANUAL_PAYMENT_IBAN' $mp.iban }
    if ($mp.bank) { Set-EnvLineInDeployFile $atinaEnv 'MANUAL_PAYMENT_BANK' $mp.bank }
    if ($mp.swift) { Set-EnvLineInDeployFile $atinaEnv 'MANUAL_PAYMENT_SWIFT' $mp.swift }
    if ($mp.currency) { Set-EnvLineInDeployFile $atinaEnv 'MANUAL_PAYMENT_CURRENCY' $mp.currency }
    if ($mp.note) { Set-EnvLineInDeployFile $atinaEnv 'MANUAL_PAYMENT_NOTE' $mp.note }
  }

  if ($Config.stripeSecretKey) {
    Set-EnvLineInDeployFile $atinaEnv 'STRIPE_SECRET_KEY' $Config.stripeSecretKey.Trim()
    Set-EnvLineInDeployFile $atinaEnv 'PAYMENTS_MODE' 'live'
    Set-EnvLineInDeployFile $atinaEnv 'PAYMENTS_MANUAL_ENABLED' 'false'
    if ($Config.stripePublishableKey) { Set-EnvLineInDeployFile $atinaEnv 'STRIPE_PUBLISHABLE_KEY' $Config.stripePublishableKey.Trim() }
    if ($Config.stripeWebhookSecret) { Set-EnvLineInDeployFile $atinaEnv 'STRIPE_WEBHOOK_SECRET' $Config.stripeWebhookSecret.Trim() }
    if ($Config.starterPriceId) { Set-EnvLineInDeployFile $atinaEnv 'STARTER_PRICE_ID' $Config.starterPriceId.Trim() }
    if ($Config.proPriceId) { Set-EnvLineInDeployFile $atinaEnv 'PRO_PRICE_ID' $Config.proPriceId.Trim() }
    if ($Config.enterprisePriceId) { Set-EnvLineInDeployFile $atinaEnv 'ENTERPRISE_PRICE_ID' $Config.enterprisePriceId.Trim() }
  }

  if ($Config.smtp -and $Config.smtp.enabled -eq $true) {
    Set-EnvLineInDeployFile $atinaEnv 'SMTP_ENABLED' 'true'
    if ($Config.smtp.host) { Set-EnvLineInDeployFile $atinaEnv 'SMTP_HOST' $Config.smtp.host }
    if ($Config.smtp.port) { Set-EnvLineInDeployFile $atinaEnv 'SMTP_PORT' "$($Config.smtp.port)" }
    if ($null -ne $Config.smtp.secure) {
      Set-EnvLineInDeployFile $atinaEnv 'SMTP_SECURE' ($(if ($Config.smtp.secure) { 'true' } else { 'false' }))
    }
    if ($Config.smtp.user) { Set-EnvLineInDeployFile $atinaEnv 'SMTP_USER' $Config.smtp.user }
    if ($Config.smtp.password) { Set-EnvLineInDeployFile $atinaEnv 'SMTP_PASS' $Config.smtp.password }
    if ($Config.smtp.from) { Set-EnvLineInDeployFile $atinaEnv 'EMAIL_FROM' $Config.smtp.from }
  }

  if ($Config.resend) {
    if ($Config.resend.apiKey) { Set-EnvLineInDeployFile $atinaEnv 'RESEND_API_KEY' $Config.resend.apiKey.Trim() }
    if ($Config.resend.contactFrom) { Set-EnvLineInDeployFile $atinaEnv 'CONTACT_EMAIL_FROM' $Config.resend.contactFrom.Trim() }
    if ($Config.resend.contactTo) { Set-EnvLineInDeployFile $atinaEnv 'CONTACT_EMAIL_TO' $Config.resend.contactTo.Trim() }
  }

  if ($Config.instantly) {
    if ($Config.instantly.apiKey) { Set-EnvLineInDeployFile $atinaEnv 'INSTANTLY_API_KEY' $Config.instantly.apiKey.Trim() }
    if ($Config.instantly.campaignId) { Set-EnvLineInDeployFile $atinaEnv 'INSTANTLY_CAMPAIGN_ID' $Config.instantly.campaignId.Trim() }
    if ($Config.instantly.apiKey) { Set-EnvLineInDeployFile $atinaEnv 'OUTREACH_EMAIL_PROVIDER' 'instantly' }
  }

  foreach ($entry in (Get-DeployConfigWebEnvPatches $Config $SiteDomain).GetEnumerator()) {
    Set-EnvLineInDeployFile $webEnv $entry.Key $entry.Value
  }

  Set-EnvLineInDeployFile $atinaEnv 'PHASE' $Phase
  Set-EnvLineInDeployFile $rootEnv 'PHASE' $Phase
}

function Invoke-DeployConfigProdPipeline {
  param(
    [object]$Config,
    [string]$RepoRoot,
    [string]$SiteDomain,
    [string]$ApiDomain,
    [string]$Phase,
    [string]$ProdMode,
    [string]$FactoryPhase,
    [int]$MonthlyBudgetEur
  )

  Apply-DeployConfigProdEnvFiles -Config $Config -RepoRoot $RepoRoot -SiteDomain $SiteDomain -ApiDomain $ApiDomain -Phase $Phase

  if (Get-Command Apply-LeanProdEnvFiles -ErrorAction SilentlyContinue) {
    if (Test-IsLeanProdMode $ProdMode) {
      Apply-LeanProdEnvFiles $RepoRoot
      Write-Host 'Lean prod env applied (base safety flags)' -ForegroundColor DarkGray
    }
  }

  if (Get-Command Apply-BudgetProdEnvFiles -ErrorAction SilentlyContinue) {
    Apply-BudgetProdEnvFiles $RepoRoot $MonthlyBudgetEur
    Write-Host "Budget profile EUR $MonthlyBudgetEur/mo applied (AI caps + retries)" -ForegroundColor DarkGray
  }

  if (Get-Command Apply-FactoryPhaseEnvFiles -ErrorAction SilentlyContinue) {
    $deployCfg = Build-DeployConfigHashtable $Config
    Apply-FactoryPhaseEnvFiles $RepoRoot $FactoryPhase $MonthlyBudgetEur $ProdMode $deployCfg | Out-Null
    Write-Host "Factory phase $FactoryPhase module profile applied" -ForegroundColor Green
  }

  if (Get-Command Apply-WarmLeanInboundEnvFiles -ErrorAction SilentlyContinue) {
    if (Test-IsLeanProdMode $ProdMode) {
      Apply-WarmLeanInboundEnvFiles $RepoRoot $MonthlyBudgetEur
      Write-Host 'Warm lean inbound env applied' -ForegroundColor DarkGray
    }
  }

  Sync-RootDockerNextPublicFromWeb $RepoRoot
  Write-Host 'Prod env patched from deploy.config.json' -ForegroundColor DarkGray
}
