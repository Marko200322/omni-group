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
    name: optional('APP_NAME', 'ATINA'),
    isDev: optional('NODE_ENV', 'development') === 'development',
    isProd: optional('NODE_ENV', 'development') === 'production',
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
  pipelines: {
    youtubeWorkerUrl: optional('YOUTUBE_PIPELINE_URL', ''),
    elevenLabsKey: optional('ELEVENLABS_API_KEY', ''),
    youtubeClientId: optional('YOUTUBE_CLIENT_ID', ''),
    youtubeClientSecret: optional('YOUTUBE_CLIENT_SECRET', ''),
    youtubeRefreshToken: optional('YOUTUBE_REFRESH_TOKEN', ''),
  },
  craftor: {
    useRealScraper: optionalBool('CRAFTOR_USE_REAL_SCRAPER', false),
    deployPath: optional('CRAFTOR_DEPLOY_PATH', ''),
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
    },
  },
  smtp: {
    enabled: optionalBool('SMTP_ENABLED', true),
    host: optional('SMTP_HOST', 'smtp.gmail.com'),
    port: optionalNumber('SMTP_PORT', 587),
    secure: optionalBool('SMTP_SECURE', false),
    user: optional('SMTP_USER', ''),
    password: optional('SMTP_PASSWORD', ''),
    from: optional('EMAIL_FROM', 'noreply@atina.io'),
    fromName: optional('EMAIL_FROM_NAME', 'ATINA'),
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
    avatarUseAiAggregator: optionalBool('AVATAR_USE_AI_AGGREGATOR', true),
    supportAgentsJson: optional('SUPPORT_AGENTS_JSON', ''),
    salesAgentsJson: optional('SALES_AGENTS_JSON', ''),
    defaultDurationMinutes: optionalNumber('MEETING_DEFAULT_DURATION_MIN', 30),
    support: {
      agentName: optional('SUPPORT_AGENT_NAME', 'Mila'),
      agentTitle: optional('SUPPORT_AGENT_TITLE', 'Tehnička podrška'),
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
  },
  rateLimit: {
    windowMs: optionalNumber('RATE_LIMIT_WINDOW_MS', 900000),
    max: optionalNumber('RATE_LIMIT_MAX', 100),
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
  autonomy: {
    enabled: optionalBool('AUTONOMY_ENABLED', false),
    autoStartScheduler: optionalBool('AUTONOMY_AUTO_START_SCHEDULER', false),
    tickIntervalMs: optionalNumber('AUTONOMY_TICK_INTERVAL_MS', 300_000),
    autoDeploy: optionalBool('AUTONOMY_AUTO_DEPLOY', false),
    gitRepoPath: optional('AUTONOMY_GIT_REPO_PATH', ''),
    generatedDir: optional('AUTONOMY_GENERATED_DIR', 'data/generated-verticals'),
    maxVerticalsPerTick: optionalNumber('AUTONOMY_MAX_VERTICALS_PER_TICK', 3),
    realEcosystemRuns: optionalBool('AUTONOMY_REAL_ECOSYSTEM_RUNS', true),
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
