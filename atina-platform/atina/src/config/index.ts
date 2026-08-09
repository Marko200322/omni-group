import './bootstrap-env';
import path from 'path';
import { envFirst } from './env-first';
import { optional, optionalBool, optionalNumber } from './env';

if (process.env.NODE_ENV === 'production') {
  const jwt = process.env.JWT_SECRET?.trim();
  if (!jwt || jwt.length < 32) {
    throw new Error(
      'JWT_SECRET must be set and at least 32 characters when NODE_ENV=production.'
    );
  }
  if (jwt === 'change-me-in-production') {
    throw new Error('JWT_SECRET must not use the default placeholder in production.');
  }
  const refresh = process.env.JWT_REFRESH_SECRET?.trim();
  if (!refresh || refresh.length < 32) {
    throw new Error(
      'JWT_REFRESH_SECRET must be set and at least 32 characters when NODE_ENV=production.'
    );
  }
  const dbPass = process.env.DB_PASSWORD?.trim();
  if (!dbPass || dbPass === 'atina_password') {
    throw new Error(
      'DB_PASSWORD must be set and must not use the development default when NODE_ENV=production.'
    );
  }
  const adminPass = process.env.ADMIN_PASSWORD?.trim();
  if (!adminPass || adminPass === 'Admin@123456') {
    throw new Error(
      'ADMIN_PASSWORD must be set and must not use the development default when NODE_ENV=production.'
    );
  }
}

const defaultForgeVaultPath = path.resolve(process.cwd(), 'data', 'vault.db');

export type PaymentsMode = 'manual' | 'sandbox' | 'live';

function resolvePaymentsMode(): PaymentsMode {
  const raw = optional('PAYMENTS_MODE', '').trim().toLowerCase();
  if (raw === 'manual' || raw === 'sandbox' || raw === 'live') {
    return raw;
  }
  const stripeKey = envFirst('FINANCE_KEY', 'STRIPE_SECRET_KEY').trim();
  if (stripeKey.startsWith('sk_live_')) return 'live';
  if (stripeKey || optional('PAYPAL_CLIENT_ID', '').trim()) return 'sandbox';
  return optional('NODE_ENV', 'development') === 'production' ? 'sandbox' : 'manual';
}

function parseCsvList(raw: string, fallback: string[]): string[] {
  const items = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return items.length ? items : fallback;
}

export function resolveForgeVaultPath(rawPath?: string): string {
  if (typeof rawPath === 'undefined') {
    return defaultForgeVaultPath;
  }

  const trimmedPath = rawPath.trim();
  if (!trimmedPath) {
    throw new Error('FORGE_VAULT_PATH is set but empty. Set a valid SQLite file path or remove the variable.');
  }

  const resolvedPath = path.isAbsolute(trimmedPath)
    ? path.normalize(trimmedPath)
    : path.resolve(process.cwd(), trimmedPath);

  if (path.extname(resolvedPath).toLowerCase() !== '.db') {
    throw new Error(
      `FORGE_VAULT_PATH must point to a .db SQLite file. Received: "${rawPath}".`
    );
  }

  return resolvedPath;
}

export const config = {
  app: {
    env: optional('NODE_ENV', 'development'),
    port: optionalNumber('PORT', 3000),
    url: optional('APP_URL', 'http://localhost:3000'),
    /** Next.js marketing/dashboard URL (Stripe/PayPal return links). */
    webUrl: optional('WEB_APP_URL', optional('NEXT_PUBLIC_SITE_URL', 'http://localhost:3010')),
    name: optional('APP_NAME', 'ATINA'),
    isDev: optional('NODE_ENV', 'development') === 'development',
    isProd: optional('NODE_ENV', 'development') === 'production',
  },
  webPush: {
    publicKey: optional('VAPID_PUBLIC_KEY', ''),
    privateKey: optional('VAPID_PRIVATE_KEY', ''),
    subject: optional('VAPID_SUBJECT', 'mailto:admin@omnigroup.io'),
  },
  jwt: {
    secret: optional('JWT_SECRET', 'change-me-in-production'),
    expiresIn: optional('JWT_EXPIRES_IN', '7d'),
    refreshSecret: optional('JWT_REFRESH_SECRET', 'refresh-change-me'),
    refreshExpiresIn: optional('JWT_REFRESH_EXPIRES_IN', '30d'),
  },
  database: {
    host: optional('DB_HOST', 'localhost'),
    port: optionalNumber('DB_PORT', 5432),
    name: optional('DB_NAME', 'atina_saas_db'),
    user: optional('DB_USER', 'atina_user'),
    password: optional('DB_PASSWORD', 'atina_password'),
    ssl: optionalBool('DB_SSL', false),
    pool: {
      min: optionalNumber('DB_POOL_MIN', 2),
      max: optionalNumber('DB_POOL_MAX', 10),
    },
  },
  redis: {
    host: optional('REDIS_HOST', 'localhost'),
    port: optionalNumber('REDIS_PORT', 6379),
    password: optional('REDIS_PASSWORD', ''),
    db: optionalNumber('REDIS_DB', 0),
  },
  aggregators: {
    ai: {
      url: optional('AI_URL', ''),
      key: optional('AI_KEY', ''),
    },
    aiModel: optional('AI_MODEL', 'openrouter/auto'),
    businessDev: {
      url: optional('BUSINESS_AND_DEV_URL', ''),
      key: optional('BUSINESS_AND_DEV_KEY', ''),
    },
    scraper: {
      url: optional('SCRAPER_URL', ''),
      key: optional('SCRAPER_KEY', ''),
    },
    finance: {
      url: optional('FINANCE_URL', ''),
      key: optional('FINANCE_KEY', ''),
    },
    comms: {
      url: optional('COMMS_URL', ''),
      key: optional('COMMS_KEY', ''),
    },
    infrastructure: {
      url: optional('INFRASTRUCTURE_URL', ''),
      key: optional('INFRASTRUCTURE_KEY', ''),
    },
    /** Kad nema remote infra agregatora — lokalni test/git prep (checklist A/F). */
    infrastructureLocalFallback: optionalBool('INFRASTRUCTURE_LOCAL_FALLBACK', true),
    storage: {
      url: optional('STORAGE_URL', ''),
      key: optional('STORAGE_KEY', ''),
    },
    captcha: {
      url: optional('CAPTCHA_URL', ''),
      key: optional('CAPTCHA_KEY', ''),
    },
    domain: {
      url: optional('DOMAIN_URL', ''),
      key: optional('DOMAIN_KEY', ''),
    },
    web3Storage: {
      url: optional('WEB3_STORAGE_URL', ''),
      key: optional('WEB3_STORAGE_KEY', ''),
    },
  },
  phase: {
    env: optional('PHASE', ''),
  },
  factory: {
    phase: (() => {
      const raw = optional('FACTORY_PHASE', 'M0').trim().toUpperCase();
      if (raw === 'AUTO') return 'M6' as const;
      const allowed = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6'] as const;
      return (allowed.includes(raw as (typeof allowed)[number]) ? raw : 'M0') as
        | 'M0'
        | 'M1'
        | 'M2'
        | 'M3'
        | 'M4'
        | 'M5'
        | 'M6';
    })(),
    autoEnabled: optionalBool('FACTORY_PHASE_AUTO', false) || optional('FACTORY_PHASE', '').trim().toUpperCase() === 'AUTO',
    monthlyBudgetEur: optionalNumber('OWNER_MONTHLY_BUDGET_EUR', 200),
  },
  pipelines: {
    youtubeWorkerUrl: optional('YOUTUBE_PIPELINE_URL', ''),
    elevenLabsKey: optional('ELEVENLABS_API_KEY', ''),
    elevenLabsDefaultVoiceId: optional('ELEVENLABS_DEFAULT_VOICE_ID', 'pNInz6obpgDQGcFmaJgB'),
    youtubeClientId: optional('YOUTUBE_CLIENT_ID', ''),
    youtubeClientSecret: optional('YOUTUBE_CLIENT_SECRET', ''),
    youtubeRefreshToken: optional('YOUTUBE_REFRESH_TOKEN', ''),
  },
  craftor: {
    useRealScraper: optionalBool('CRAFTOR_USE_REAL_SCRAPER', false),
    deployPath: optional('CRAFTOR_DEPLOY_PATH', ''),
  },
  productFactory: {
    enabled: optionalBool('PRODUCT_FACTORY_ENABLED', true),
    outputDir: optional('PRODUCT_FACTORY_OUTPUT_DIR', 'data/product-factory'),
    runTestsOnBuild: optionalBool('PRODUCT_FACTORY_RUN_TESTS', true),
    internalLaneEnabled: optionalBool('PRODUCT_FACTORY_INTERNAL_LANE', true),
    maxInternalPerTick: optionalNumber('PRODUCT_FACTORY_MAX_INTERNAL_PER_TICK', 1),
  },
  deliverableFulfillment: {
    enabled: optionalBool('DELIVERABLE_FULFILLMENT_ENABLED', true),
    /** false = fully automatic client delivery (no admin QA gate). */
    requireQaBeforeRelease: optionalBool('DELIVERABLE_FULFILLMENT_REQUIRE_QA', false),
    learningLoopEnabled: optionalBool('DELIVERABLE_FULFILLMENT_LEARNING_LOOP', true),
    autoChecklistEnabled: optionalBool('DELIVERABLE_FULFILLMENT_AUTO_CHECKLIST', true),
    /** Block client email until automated checklist passes. */
    blockReleaseUntilChecklistPasses: optionalBool('DELIVERABLE_FULFILLMENT_BLOCK_UNTIL_CHECKLIST', true),
    maxRetryAttempts: optionalNumber('DELIVERABLE_FULFILLMENT_MAX_RETRY_ATTEMPTS', 3),
    maxChecklistRetries: optionalNumber('DELIVERABLE_FULFILLMENT_MAX_CHECKLIST_RETRIES', 3),
    memoryNamespace: optional('DELIVERABLE_FULFILLMENT_MEMORY_NAMESPACE', 'fulfillment'),
  },
  apex: {
    maxSimBatchProfiles: optionalNumber('APEX_MAX_SIM_BATCH_PROFILES', 1000),
    suicideSwitchArmed: optionalBool('APEX_SUICIDE_SWITCH_ARMED', false),
    fluxUrl: optional('APEX_FLUX_API_URL', ''),
    fluxKey: optional('APEX_FLUX_API_KEY', ''),
    livePortraitUrl: optional('APEX_LIVE_PORTRAIT_API_URL', ''),
    livePortraitKey: optional('APEX_LIVE_PORTRAIT_API_KEY', ''),
  },
  steam: {
    webApiKey: optional('STEAM_WEB_API_KEY', ''),
  },
  stripe: {
    secretKey: envFirst('FINANCE_KEY', 'STRIPE_SECRET_KEY'),
    webhookSecret: optional('STRIPE_WEBHOOK_SECRET', ''),
    publishableKey: optional('STRIPE_PUBLISHABLE_KEY', ''),
    priceIds: {
      starter: optional('STARTER_PRICE_ID', 'price_starter'),
      pro: optional('PRO_PRICE_ID', 'price_pro'),
      enterprise: optional('ENTERPRISE_PRICE_ID', 'price_enterprise'),
    },
  },
  paypal: {
    clientId: optional('PAYPAL_CLIENT_ID', ''),
    clientSecret: optional('PAYPAL_CLIENT_SECRET', ''),
    mode: optional('PAYPAL_MODE', 'sandbox') as 'sandbox' | 'live',
  },
  wise: {
    apiKey: optional('WISE_API_KEY', ''),
    profileId: optional('WISE_PROFILE_ID', ''),
  },
  cursor: {
    apiKey: optional('CURSOR_API_KEY', ''),
    model: optional('CURSOR_MODEL', 'composer-2.5'),
    runtime: optional('CURSOR_RUNTIME', 'local') as 'local' | 'cloud',
    repoPath: optional('CURSOR_REPO_PATH', ''),
    cloudRepo: optional('CURSOR_CLOUD_REPO_URL', ''),
    evolutionEnabled: optionalBool('CURSOR_EVOLUTION_ENABLED', false),
    agentEnabled: optionalBool('CURSOR_AGENT_ENABLED', false),
  },
  kriptoman: {
    enabled: optionalBool('KRIPTOMAN_ENABLED', false),
    url: optional('KRIPTOMAN_URL', ''),
    apiKey: optional('KRIPTOMAN_API_KEY', ''),
    webhookSecret: optional('KRIPTOMAN_WEBHOOK_SECRET', ''),
    merchantId: optional('KRIPTOMAN_MERCHANT_ID', ''),
    defaultCrypto: optional('KRIPTOMAN_DEFAULT_CRYPTO', 'USDT'),
    devMock: optionalBool('KRIPTOMAN_DEV_MOCK', false),
  },
  payments: {
    mode: resolvePaymentsMode(),
    allowManualInProduction: optionalBool('ALLOW_MANUAL_PAYMENTS_IN_PRODUCTION', false),
    manual: {
      accountName: optional('MANUAL_PAYMENT_ACCOUNT_NAME', ''),
      iban: optional('MANUAL_PAYMENT_IBAN', ''),
      bankName: optional('MANUAL_PAYMENT_BANK', ''),
      swift: optional('MANUAL_PAYMENT_SWIFT', ''),
      referencePrefix: optional('MANUAL_PAYMENT_REFERENCE_PREFIX', 'ATINA'),
      currency: optional('MANUAL_PAYMENT_CURRENCY', 'EUR'),
      note: optional(
        'MANUAL_PAYMENT_NOTE',
        'Uključi referencu u opis uplate. Pretplata se aktivira nakon potvrde admina (do 24h).'
      ),
      companyLegalName: optional('COMPANY_LEGAL_NAME', ''),
      companyTaxId: optional('COMPANY_TAX_ID', ''),
      companyAddress: optional('COMPANY_ADDRESS', ''),
    },
  },
  smtp: {
    enabled: optionalBool('SMTP_ENABLED', true),
    host: optional('SMTP_HOST', 'smtp.gmail.com'),
    port: optionalNumber('SMTP_PORT', 587),
    secure: optionalBool('SMTP_SECURE', false),
    user: optional('SMTP_USER', ''),
    password: optional('SMTP_PASSWORD', ''),
    from: optional('EMAIL_FROM', optional('CONTACT_EMAIL_FROM', 'noreply@atina.io')),
    fromName: optional('EMAIL_FROM_NAME', 'ATINA'),
  },
  resend: {
    apiKey: optional('RESEND_API_KEY', ''),
    from: optional('CONTACT_EMAIL_FROM', optional('EMAIL_FROM', 'noreply@atina.io')),
  },
  admin: {
    email: optional('ADMIN_EMAIL', 'admin@atina.io'),
    password: optional('ADMIN_PASSWORD', 'Admin@123456'),
    name: optional('ADMIN_NAME', 'System Admin'),
  },
  paymentNotifyEmail: optional('PAYMENT_NOTIFY_EMAIL', ''),
  videoMeetings: {
    supportNotifyEmail: optional('SUPPORT_NOTIFY_EMAIL', ''),
    salesEnabled: optionalBool('SALES_MEETINGS_ENABLED', false),
    supportAvatarEnabled: optionalBool('SUPPORT_AVATAR_ENABLED', true),
    salesAvatarEnabled: optionalBool('SALES_AVATAR_ENABLED', true),
    avatarUseAiAggregator: optionalBool('AVATAR_USE_AI_AGGREGATOR', false),
    supportAgentsJson: optional('SUPPORT_AGENTS_JSON', ''),
    salesAgentsJson: optional('SALES_AGENTS_JSON', ''),
    defaultDurationMinutes: optionalNumber('MEETING_DEFAULT_DURATION_MIN', 30),
    support: {
      agentName: optional('SUPPORT_AGENT_NAME', 'Mila'),
      agentTitle: optional('SUPPORT_AGENT_TITLE', 'Technical support'),
      agentAvatarUrl: optional('SUPPORT_AGENT_AVATAR_URL', ''),
      voiceId: optional('SUPPORT_AGENT_VOICE_ID', ''),
      persona: optional('SUPPORT_AGENT_PERSONA', ''),
      greeting: optional('SUPPORT_AGENT_GREETING', ''),
    },
    sales: {
      agentName: optional('SALES_AGENT_NAME', 'Nikola'),
      agentTitle: optional('SALES_AGENT_TITLE', 'Prodajni konsultant'),
      agentAvatarUrl: optional('SALES_AGENT_AVATAR_URL', ''),
      voiceId: optional('SALES_AGENT_VOICE_ID', ''),
      persona: optional('SALES_AGENT_PERSONA', ''),
      greeting: optional('SALES_AGENT_GREETING', ''),
    },
    zoom: {
      accountId: optional('ZOOM_ACCOUNT_ID', ''),
      clientId: optional('ZOOM_CLIENT_ID', ''),
      clientSecret: optional('ZOOM_CLIENT_SECRET', ''),
    },
    googleMeet: {
      supportRoomUrl: optional('SUPPORT_GOOGLE_MEET_URL', ''),
      salesRoomUrl: optional('SALES_GOOGLE_MEET_URL', ''),
    },
    avatarMedia: {
      /** Redosled TTS provajdera: elevenlabs,cartesia */
      ttsChain: optional('AVATAR_TTS_PROVIDER_CHAIN', 'elevenlabs,cartesia'),
      /** Redosled video provajdera: heygen,d-id,live_portrait */
      videoChain: optional('AVATAR_VIDEO_PROVIDER_CHAIN', 'heygen,d-id,live_portrait'),
      clientMemoryEnabled: optionalBool('AVATAR_CLIENT_MEMORY_ENABLED', true),
      heygenApiKey: optional('HEYGEN_API_KEY', ''),
      didApiKey: optional('DID_API_KEY', ''),
      cartesiaApiKey: optional('CARTESIA_API_KEY', ''),
      cartesiaVoiceId: optional('CARTESIA_VOICE_ID', ''),
      cartesiaModelId: optional('CARTESIA_MODEL_ID', 'sonic-2'),
    },
  },
  rateLimit: {
    windowMs: optionalNumber('RATE_LIMIT_WINDOW_MS', 900000),
    max: optionalNumber('RATE_LIMIT_MAX', 2000),
  },
  logging: {
    level: optional('LOG_LEVEL', 'info'),
    file: optional('LOG_FILE', 'logs/atina.log'),
  },
  forge: {
    vaultPath: resolveForgeVaultPath(process.env.FORGE_VAULT_PATH),
    minReserveRsd: optionalNumber('FORGE_MIN_RESERVE_RSD', 0),
    hardStopMode: optionalBool('FORGE_HARD_STOP_MODE', false),
  },
  monitoring: {
    workflowTemplateSuccessAlertThreshold: optionalNumber(
      'WORKFLOW_TEMPLATE_SUCCESS_ALERT_THRESHOLD',
      80
    ),
  },
  features: {
    scraper: optionalBool('ENABLE_SCRAPER', true),
    automation: optionalBool('ENABLE_AUTOMATION', true),
    crm: optionalBool('ENABLE_CRM', true),
    analytics: optionalBool('ENABLE_ANALYTICS', true),
  },
  pricing: {
    eurUsdRate: optionalNumber('PRICING_EUR_USD_RATE', 0.92),
    targetMarginPct: optionalNumber('PRICING_TARGET_MARGIN_PCT', 35),
    yearlyInfraDiscount: optionalNumber('PRICING_YEARLY_INFRA_DISCOUNT', 0.85),
    defaultTamUsd: optionalNumber('PRICING_DEFAULT_TAM_USD', 50_000),
    competitionDiscountMax: optionalNumber('PRICING_COMPETITION_DISCOUNT_MAX', 0.25),
    resourceUnitCosts: {
      aiUsdPer1kTokens: optionalNumber('PRICING_COST_AI_USD_PER_1K_TOKENS', 0.002),
      scraperUsdPerRun: optionalNumber('PRICING_COST_SCRAPER_USD_PER_RUN', 0.05),
      infraUsdPerHour: optionalNumber('PRICING_COST_INFRA_USD_PER_HOUR', 2),
      supportUsdPerHour: optionalNumber('PRICING_COST_SUPPORT_USD_PER_HOUR', 25),
      storageUsdPerGbMonth: optionalNumber('PRICING_COST_STORAGE_USD_PER_GB', 0.1),
    },
    paymentProviders: {
      manual: {
        feeRate: optionalNumber('PRICING_FEE_MANUAL_RATE', 0),
        fixedEur: optionalNumber('PRICING_FEE_MANUAL_FIXED_EUR', 0),
      },
      kriptoman: {
        feeRate: optionalNumber('PRICING_FEE_KRIPTOMAN_RATE', 0.015),
        fixedEur: optionalNumber('PRICING_FEE_KRIPTOMAN_FIXED_EUR', 0),
      },
      stripe: {
        feeRate: optionalNumber('PRICING_FEE_STRIPE_RATE', 0.029),
        fixedEur: optionalNumber('PRICING_FEE_STRIPE_FIXED_EUR', 0.25),
      },
      paypal: {
        feeRate: optionalNumber('PRICING_FEE_PAYPAL_RATE', 0.034),
        fixedEur: optionalNumber('PRICING_FEE_PAYPAL_FIXED_EUR', 0.35),
      },
      wise: {
        feeRate: optionalNumber('PRICING_FEE_WISE_RATE', 0),
        fixedEur: optionalNumber('PRICING_FEE_WISE_FIXED_EUR', 0),
      },
    },
    tierMultipliers: {
      budget: optionalNumber('PRICING_TIER_BUDGET', 0.75),
      standard: optionalNumber('PRICING_TIER_STANDARD', 1),
      premium: optionalNumber('PRICING_TIER_PREMIUM', 1.35),
      regulated: optionalNumber('PRICING_TIER_REGULATED', 1.65),
      nonprofit: optionalNumber('PRICING_TIER_NONPROFIT', 0.6),
    },
  },
  /** Split client payments: resources, tax reserve, fees, owner net, system reinvest. */
  revenueAllocation: {
    ownerTaxReserveRate: optionalNumber('OWNER_TAX_RESERVE_RATE', 0),
    systemReinvestRate: optionalNumber('REVENUE_SYSTEM_REINVEST_RATE', 0.2),
    planResourceReservePct: optionalNumber('REVENUE_PLAN_RESOURCE_RESERVE_PCT', 0.18),
  },
  autonomy: {
    enabled: optionalBool('AUTONOMY_ENABLED', false),
    autoStartScheduler: optionalBool('AUTONOMY_AUTO_START_SCHEDULER', false),
    tickIntervalMs: optionalNumber('AUTONOMY_TICK_INTERVAL_MS', 300_000),
    autoDeploy: optionalBool('AUTONOMY_AUTO_DEPLOY', false),
    gitRepoPath: optional('AUTONOMY_GIT_REPO_PATH', ''),
    generatedDir: optional('AUTONOMY_GENERATED_DIR', 'data/generated-verticals'),
    maxVerticalsPerTick: optionalNumber('AUTONOMY_MAX_VERTICALS_PER_TICK', 3),
    realEcosystemRuns: optionalBool('AUTONOMY_REAL_ECOSYSTEM_RUNS', true),
    categoryRolloutEnabled: optionalBool('AUTONOMY_CATEGORY_ROLLOUT_ENABLED', true),
    categoryRolloutMaxCategoriesPerTick: optionalNumber('AUTONOMY_CATEGORY_ROLLOUT_MAX_CATEGORIES', 1),
    categoryRolloutBatchSize: optionalNumber('AUTONOMY_CATEGORY_ROLLOUT_BATCH_SIZE', 8),
    /** freelance = samo online poslovi (#1–25); legacy_smb = SMB dodatak; all = svih 50 */
    rolloutSegment: optional('AUTONOMY_ROLLOUT_SEGMENT', 'freelance'),
    evolutionRunTestsOnDeploy: optionalBool('AUTONOMY_EVOLUTION_RUN_TESTS', true),
    evolutionCodeEditEnabled: optionalBool('AUTONOMY_EVOLUTION_CODE_EDIT', true),
    /** Optional absolute path to generated-verticals-index.json on host monorepo */
    webGeneratedIndexPath: optional('AUTONOMY_WEB_GENERATED_INDEX_PATH', ''),
    budget: {
      initialUsd: optionalNumber('AUTONOMY_INITIAL_BUDGET_USD', 50),
      maxSpendPerTickUsd: optionalNumber('AUTONOMY_MAX_SPEND_PER_TICK_USD', 2),
      maxSpendPerDayUsd: optionalNumber('AUTONOMY_MAX_SPEND_PER_DAY_USD', 10),
      minReserveUsd: optionalNumber('AUTONOMY_MIN_RESERVE_USD', 15),
      revenueReinvestRate: optionalNumber('AUTONOMY_REVENUE_REINVEST_RATE', 0.2),
      marketingEnabled: optionalBool('AUTONOMY_MARKETING_ENABLED', false),
      marketingMinPriority: optionalNumber('AUTONOMY_MARKETING_MIN_PRIORITY', 40),
      costs: {
        research: optionalNumber('AUTONOMY_COST_RESEARCH_USD', 0.2),
        generate: optionalNumber('AUTONOMY_COST_GENERATE_USD', 0.05),
        deploy: optionalNumber('AUTONOMY_COST_DEPLOY_USD', 0.1),
        aiLearn: optionalNumber('AUTONOMY_COST_AI_LEARN_USD', 0.08),
        marketing: optionalNumber('AUTONOMY_COST_MARKETING_USD', 0.5),
      },
    },
    telegram: {
      botToken: optional('TELEGRAM_BOT_TOKEN', ''),
      chatId: optional('TELEGRAM_CHAT_ID', ''),
      notifyAutonomy: optionalBool('AUTONOMY_TELEGRAM_NOTIFY', true),
    },
  },
  outreach: {
    warmupMode: optionalBool('OUTREACH_WARMUP_MODE', true),
    domainWarmupComplete: optionalBool('OUTREACH_DOMAIN_WARMUP_COMPLETE', false),
    dailyCap: optionalNumber('OUTREACH_DAILY_CAP', 20),
    fallbackNotifyEmail: optional('OUTREACH_FALLBACK_EMAIL', optional('ADMIN_EMAIL', '')),
    /** Dev: šalji draftove na fallback email bez domain warmup (ne za produkciju). */
    devSendToFallback: optionalBool('OUTREACH_DEV_SEND_TO_FALLBACK', false),
  },
  hunt: {
    /** Comma list of JobBoardKind to skip (default: government). */
    excludePlatformKinds: parseCsvList(optional('HUNT_EXCLUDE_PLATFORM_KINDS', 'government'), [
      'government',
    ]),
    /** Only create outbound/CRM rows with company (non-free-mail) emails. */
    companyEmailsOnly: optionalBool('HUNT_COMPANY_EMAILS_ONLY', true),
  },
  /**
   * External AI vendor stack (Clay, Intercom, Make, Jasper, Devin, …).
   * Keys + connection URLs only — product adapters land later.
   * Catalog/status: modules/billing/lib/external-ai-stack.ts
   */
  externalAiStack: {
    clayApiKey: optional('CLAY_API_KEY', ''),
    salesforgeApiKey: optional('SALESFORGE_API_KEY', ''),
    intercomApiKey: optional('INTERCOM_API_KEY', ''),
    intercomAppId: optional('INTERCOM_APP_ID', ''),
    sierraApiKey: optional('SIERRA_API_KEY', ''),
    makeApiKey: optional('MAKE_API_KEY', ''),
    makeWebhookUrl: optional('MAKE_WEBHOOK_URL', ''),
    n8nApiKey: optional('N8N_API_KEY', ''),
    n8nBaseUrl: optional('N8N_BASE_URL', ''),
    rampApiKey: optional('RAMP_API_KEY', ''),
    vicAiApiKey: optional('VIC_AI_API_KEY', ''),
    jasperApiKey: optional('JASPER_API_KEY', ''),
    predisApiKey: optional('PREDIS_API_KEY', ''),
    devinApiKey: optional('DEVIN_API_KEY', ''),
    replitAgentApiKey: optional('REPLIT_AGENT_API_KEY', ''),
    crewaiApiKey: optional('CREWAI_API_KEY', ''),
    crewaiBaseUrl: optional('CREWAI_BASE_URL', ''),
    langchainApiKey: optional('LANGCHAIN_API_KEY', ''),
    langchainProject: optional('LANGCHAIN_PROJECT', ''),
  },
  /** B2B lead baze (Apollo, Hunter, …) + email verify — fazno paljenje LEAD_DATABASE_ROLLOUT_PHASE F0–F5 */
  leadDatabases: {
    enabled: optionalBool('LEAD_DATABASE_ENABLED', false),
    rolloutPhase: optional('LEAD_DATABASE_ROLLOUT_PHASE', 'F0'),
    enrichOnHuntOverride: optionalBool('LEAD_ENRICH_ON_HUNT', false),
    maxPerRun: optionalNumber('LEAD_ENRICH_MAX_PER_RUN', 10),
    providerChain: parseCsvList(
      optional('LEAD_DATABASE_PROVIDER_CHAIN', 'apollo,hunter,lusha,snov'),
      ['apollo', 'hunter', 'lusha', 'snov']
    ),
    emailVerifyChain: parseCsvList(
      optional('EMAIL_VERIFICATION_PROVIDER_CHAIN', 'neverbounce,zerobounce'),
      ['neverbounce', 'zerobounce']
    ),
    apolloApiKey: optional('APOLLO_API_KEY', ''),
    hunterApiKey: optional('HUNTER_API_KEY', ''),
    lushaApiKey: optional('LUSHA_API_KEY', ''),
    snovApiKey: optional('SNOV_API_KEY', ''),
    snovUserId: optional('SNOV_USER_ID', ''),
    zoominfoApiKey: optional('ZOOMINFO_API_KEY', ''),
    zoominfoApiUrl: optional('ZOOMINFO_API_URL', ''),
    neverbounceApiKey: optional('NEVERBOUNCE_API_KEY', ''),
    zerobounceApiKey: optional('ZEROBOUNCE_API_KEY', ''),
  },
  slack: {
    webhookUrl: optional('SLACK_WEBHOOK_URL', ''),
  },
  retainerScheduler: {
    enabled: optionalBool('RETAINER_SCHEDULER_ENABLED', true),
    /** Daily check for monthly lead-gen retainer runs */
    intervalMs: optionalNumber('RETAINER_SCHEDULER_INTERVAL_MS', 86_400_000),
  },
};

export type Config = typeof config;

if (
  config.app.isProd &&
  config.payments.mode === 'manual' &&
  !config.payments.allowManualInProduction
) {
  throw new Error(
    'PAYMENTS_MODE=manual is blocked in production. Set ALLOW_MANUAL_PAYMENTS_IN_PRODUCTION=true if intentional.'
  );
}
