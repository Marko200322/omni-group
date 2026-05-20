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
  },
  apex: {
    maxSimBatchProfiles: optionalNumber('APEX_MAX_SIM_BATCH_PROFILES', 1000),
    suicideSwitchArmed: optionalBool('APEX_SUICIDE_SWITCH_ARMED', false),
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
};

export type Config = typeof config;
