/**
 * Expected module flags per revenue factory phase — keep in sync with scripts/prod-factory-phase.ps1
 */
import { getFactoryPhase, phaseGte, type FactoryPhase } from './factory-phase';
import { buildExternalAiStackStatus } from './external-ai-stack';

export type FactoryModuleProfile = {
  phase: FactoryPhase;
  label: string;
  modules: Record<string, boolean>;
  requiredEnvKeys: string[];
  optionalEnvKeys: string[];
};

const PROFILES: FactoryModuleProfile[] = [
  {
    phase: 'M0',
    label: 'Launch — manual sales + automated fulfillment',
    modules: {
      payments: true,
      billing: true,
      fulfillment: true,
      crm: true,
      scraper: false,
      outreach_send: false,
      lead_db: false,
      autonomy: false,
      avatar: false,
      stripe_live: false,
    },
    requiredEnvKeys: ['OPENROUTER_API_KEY', 'MANUAL_PAYMENT_IBAN'],
    optionalEnvKeys: ['TELEGRAM_BOT_TOKEN'],
  },
  {
    phase: 'M1',
    label: 'Inbound — contact form + CRM ingress',
    modules: {
      payments: true,
      billing: true,
      fulfillment: true,
      crm: true,
      notifications: true,
      scraper: false,
      outreach_send: false,
      lead_db: false,
      autonomy: false,
    },
    requiredEnvKeys: ['RESEND_API_KEY', 'CONTACT_EMAIL_FROM', 'CONTACT_EMAIL_TO'],
    optionalEnvKeys: ['SLACK_WEBHOOK_URL', 'CONTACT_CRM_INGRESS_EMAIL'],
  },
  {
    phase: 'M2',
    label: 'Warm outbound — scraper + outreach drafts',
    modules: {
      scraper: true,
      outreach_draft: true,
      outreach_send: false,
      client_hunter: true,
      lead_db: false,
    },
    requiredEnvKeys: ['SCRAPER_KEY'],
    optionalEnvKeys: ['COMMS_KEY'],
  },
  {
    phase: 'M3',
    label: 'Deliver & upsell — public sites + retainers',
    modules: {
      public_site: true,
      retainer_scheduler: true,
      shop_manual: true,
    },
    requiredEnvKeys: [],
    optionalEnvKeys: ['NEXT_PUBLIC_ATINA_API_BASE'],
  },
  {
    phase: 'M4',
    label: 'Lead machine — Hunter F3 + outbound send',
    modules: {
      lead_db: true,
      outreach_send: true,
      titanis: true,
      hot_clients: true,
      analytics: true,
    },
    requiredEnvKeys: ['HUNTER_API_KEY', 'LEAD_DATABASE_ENABLED'],
    optionalEnvKeys: [
      'SNOV_API_KEY',
      'NEVERBOUNCE_API_KEY',
      'CLAY_API_KEY',
      'SALESFORGE_API_KEY',
      'INTERCOM_API_KEY',
      'SIERRA_API_KEY',
      'MAKE_API_KEY',
      'N8N_API_KEY',
      'ELEVENLABS_API_KEY',
    ],
  },
  {
    phase: 'M5',
    label: 'Autonomy reinvest — marketing micro-spend',
    modules: {
      autonomy: true,
      autonomy_marketing: true,
      product_factory_internal: true,
    },
    requiredEnvKeys: ['AUTONOMY_ENABLED'],
    optionalEnvKeys: [
      'BUSINESS_AND_DEV_KEY',
      'RAMP_API_KEY',
      'VIC_AI_API_KEY',
      'JASPER_API_KEY',
      'PREDIS_API_KEY',
      'DEVIN_API_KEY',
      'REPLIT_AGENT_API_KEY',
      'CREWAI_API_KEY',
      'LANGCHAIN_API_KEY',
    ],
  },
  {
    phase: 'M6',
    label: 'Full factory — Stripe live + avatar + lead F5',
    modules: {
      stripe_live: true,
      avatar: true,
      lead_db_f5: true,
      omnitube: false,
    },
    requiredEnvKeys: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    optionalEnvKeys: ['HEYGEN_API_KEY', 'DID_API_KEY', 'YOUTUBE_CLIENT_ID'],
  },
];

export function getFactoryModuleProfiles(): FactoryModuleProfile[] {
  return PROFILES;
}

export function getActiveFactoryModuleProfile(phase: FactoryPhase = getFactoryPhase()): FactoryModuleProfile {
  const merged: FactoryModuleProfile = {
    phase,
    label: PROFILES.find((p) => p.phase === phase)?.label ?? phase,
    modules: {},
    requiredEnvKeys: [],
    optionalEnvKeys: [],
  };

  for (const p of PROFILES) {
    if (!phaseGte(phase, p.phase)) continue;
    Object.assign(merged.modules, p.modules);
    merged.requiredEnvKeys.push(...p.requiredEnvKeys);
    merged.optionalEnvKeys.push(...p.optionalEnvKeys);
  }

  merged.requiredEnvKeys = [...new Set(merged.requiredEnvKeys)];
  merged.optionalEnvKeys = [...new Set(merged.optionalEnvKeys)];
  return merged;
}

export type FactoryPhaseGap = {
  key: string;
  kind: 'required' | 'optional' | 'module_off';
  message: string;
};

function envPresent(key: string): boolean {
  const v = process.env[key]?.trim();
  return Boolean(v && v !== 'placeholder' && !v.startsWith('your_'));
}

function envFlag(key: string): boolean {
  const v = process.env[key]?.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

/** Runtime gaps for admin — what owner still needs to add. */
export function auditFactoryPhaseGaps(phase: FactoryPhase = getFactoryPhase()): FactoryPhaseGap[] {
  const profile = getActiveFactoryModuleProfile(phase);
  const gaps: FactoryPhaseGap[] = [];

  for (const key of profile.requiredEnvKeys) {
    if (!envPresent(key)) {
      gaps.push({ key, kind: 'required', message: `Missing env ${key} for factory ${phase}` });
    }
  }

  if (phaseGte(phase, 'M1') && !envPresent('RESEND_API_KEY')) {
    gaps.push({ key: 'RESEND_DOMAIN', kind: 'required', message: 'Verify Resend domain for omnigrouptech.com' });
  }

  if (phaseGte(phase, 'M2') && !envFlag('ENABLE_SCRAPER')) {
    gaps.push({ key: 'ENABLE_SCRAPER', kind: 'module_off', message: 'Scraper disabled - bump factory phase or redeploy' });
  }

  if (phaseGte(phase, 'M4') && !envFlag('LEAD_DATABASE_ENABLED')) {
    gaps.push({ key: 'LEAD_DATABASE_ENABLED', kind: 'module_off', message: 'Lead DB off - check FACTORY_PHASE env on VPS' });
  }

  if (phaseGte(phase, 'M5') && !envFlag('AUTONOMY_ENABLED')) {
    gaps.push({ key: 'AUTONOMY_ENABLED', kind: 'module_off', message: 'Autonomy off - check FACTORY_PHASE env on VPS' });
  }

  if (phaseGte(phase, 'M6')) {
    if (process.env.PAYMENTS_MODE?.trim() !== 'live') {
      gaps.push({ key: 'PAYMENTS_MODE', kind: 'required', message: 'Stripe live not enabled (PAYMENTS_MODE≠live)' });
    }
    if (!envPresent('HEYGEN_API_KEY') && !envPresent('DID_API_KEY')) {
      gaps.push({ key: 'HEYGEN_API_KEY', kind: 'optional', message: 'No avatar provider key (HeyGen or D-ID)' });
    }
  }

  if (phaseGte(phase, 'M0') && !envPresent('MANUAL_PAYMENT_IBAN')) {
    gaps.push({ key: 'MANUAL_PAYMENT_IBAN', kind: 'required', message: 'Manual IBAN not set on API' });
  }

  return gaps;
}

export function buildFactoryPhaseStatus() {
  const phase = getFactoryPhase();
  const profile = getActiveFactoryModuleProfile(phase);
  const gaps = auditFactoryPhaseGaps(phase);
  // Lazy require — effective breakdown may include async-populated cache
  let auto: Record<string, unknown> | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { factoryPhaseAutoService } = require('../service/factory-phase-auto.service') as {
      factoryPhaseAutoService: {
        getCachedBreakdown: () => {
          ceiling: string;
          autoEnabled: boolean;
          keysOkThrough: string;
          revenueOkThrough: string;
          effective: string;
          blockedNext: string | null;
          blockedReason: string | null;
          metrics: Record<string, number>;
        } | null;
      };
    };
    const b = factoryPhaseAutoService.getCachedBreakdown();
    if (b) {
      auto = {
        enabled: b.autoEnabled,
        ceiling: b.ceiling,
        effective: b.effective,
        keysOkThrough: b.keysOkThrough,
        revenueOkThrough: b.revenueOkThrough,
        blockedNext: b.blockedNext,
        blockedReason: b.blockedReason,
        metrics: b.metrics,
      };
    }
  } catch {
    auto = undefined;
  }
  return {
    phase,
    label: profile.label,
    modules: profile.modules,
    gaps,
    ready: gaps.filter((g) => g.kind === 'required' || g.kind === 'module_off').length === 0,
    auto,
    externalAiStack: buildExternalAiStackStatus(),
  };
}
