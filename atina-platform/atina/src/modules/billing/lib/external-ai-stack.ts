/**
 * External AI vendor stack — keys + purpose + connection readiness.
 * Full product adapters come later; this layer stores env wiring and admin status.
 */

export type ExternalAiSector =
  | 'sales_lead_gen'
  | 'customer_support'
  | 'process_automation'
  | 'finance_ops'
  | 'marketing'
  | 'exec_coding'
  | 'exec_media'
  | 'exec_agents';

export type ExternalAiVendorDef = {
  id: string;
  name: string;
  sector: ExternalAiSector;
  sectorLabel: string;
  purpose: string;
  purposeSr: string;
  /** Env keys that must be present for this vendor to count as configured. */
  envKeys: string[];
  /** Extra connection fields (webhook/base URL) — optional presence improves readiness. */
  connectionKeys?: string[];
  monthlyCostEur: { min: number; max: number };
  /** Earliest factory phase where this vendor is useful. */
  fromPhase: 'M4' | 'M5' | 'M6';
  docsUrl?: string;
  /** How Atina connects today (key store / webhook / existing provider). */
  connectionMode: 'api_key' | 'api_key_and_url' | 'existing_provider';
};

export const EXTERNAL_AI_STACK: ExternalAiVendorDef[] = [
  {
    id: 'clay',
    name: 'Clay',
    sector: 'sales_lead_gen',
    sectorLabel: 'Prodaja & Lead Gen',
    purpose: 'Lead enrichment / waterfall data for outbound pipeline',
    purposeSr: 'Enrich leadova / waterfall podaci za outbound',
    envKeys: ['CLAY_API_KEY'],
    monthlyCostEur: { min: 200, max: 400 },
    fromPhase: 'M4',
    docsUrl: 'https://www.clay.com',
    connectionMode: 'api_key',
  },
  {
    id: 'salesforge',
    name: 'Salesforge',
    sector: 'sales_lead_gen',
    sectorLabel: 'Prodaja & Lead Gen',
    purpose: 'AI outbound sequences and sales copy',
    purposeSr: 'AI outbound sekvence i sales copy',
    envKeys: ['SALESFORGE_API_KEY'],
    monthlyCostEur: { min: 200, max: 400 },
    fromPhase: 'M4',
    docsUrl: 'https://www.salesforge.ai',
    connectionMode: 'api_key',
  },
  {
    id: 'intercom',
    name: 'Intercom (Fin AI)',
    sector: 'customer_support',
    sectorLabel: 'Korisnička podrška',
    purpose: 'AI support inbox / Fin agent for ticket deflection',
    purposeSr: 'AI support inbox / Fin agent za tickete',
    envKeys: ['INTERCOM_API_KEY'],
    connectionKeys: ['INTERCOM_APP_ID'],
    monthlyCostEur: { min: 100, max: 300 },
    fromPhase: 'M4',
    docsUrl: 'https://www.intercom.com',
    connectionMode: 'api_key',
  },
  {
    id: 'sierra',
    name: 'Sierra',
    sector: 'customer_support',
    sectorLabel: 'Korisnička podrška',
    purpose: 'Conversational support agent alternative to Intercom',
    purposeSr: 'Konverzacioni support agent (alternativa Intercomu)',
    envKeys: ['SIERRA_API_KEY'],
    monthlyCostEur: { min: 100, max: 300 },
    fromPhase: 'M4',
    docsUrl: 'https://sierra.ai',
    connectionMode: 'api_key',
  },
  {
    id: 'make',
    name: 'Make.com',
    sector: 'process_automation',
    sectorLabel: 'Automatizacija procesa',
    purpose: 'No-code workflow automations triggered by Atina webhooks',
    purposeSr: 'No-code workflowi pokrenuti Atina webhookovima',
    envKeys: ['MAKE_API_KEY'],
    connectionKeys: ['MAKE_WEBHOOK_URL'],
    monthlyCostEur: { min: 20, max: 100 },
    fromPhase: 'M4',
    docsUrl: 'https://www.make.com',
    connectionMode: 'api_key_and_url',
  },
  {
    id: 'n8n',
    name: 'n8n',
    sector: 'process_automation',
    sectorLabel: 'Automatizacija procesa',
    purpose: 'Self-hosted / cloud workflow runner for internal ops',
    purposeSr: 'Self-hosted / cloud workflow runner za interne ops',
    envKeys: ['N8N_API_KEY'],
    connectionKeys: ['N8N_BASE_URL'],
    monthlyCostEur: { min: 20, max: 100 },
    fromPhase: 'M4',
    docsUrl: 'https://n8n.io',
    connectionMode: 'api_key_and_url',
  },
  {
    id: 'ramp',
    name: 'Ramp',
    sector: 'finance_ops',
    sectorLabel: 'Finansije & Operacije',
    purpose: 'Spend / card ops automation and expense sync',
    purposeSr: 'Spend / kartice i sync troškova',
    envKeys: ['RAMP_API_KEY'],
    monthlyCostEur: { min: 100, max: 250 },
    fromPhase: 'M5',
    docsUrl: 'https://ramp.com',
    connectionMode: 'api_key',
  },
  {
    id: 'vic_ai',
    name: 'Vic.ai',
    sector: 'finance_ops',
    sectorLabel: 'Finansije & Operacije',
    purpose: 'AP / invoice automation',
    purposeSr: 'Automatizacija faktura / AP',
    envKeys: ['VIC_AI_API_KEY'],
    monthlyCostEur: { min: 100, max: 250 },
    fromPhase: 'M5',
    docsUrl: 'https://www.vic.ai',
    connectionMode: 'api_key',
  },
  {
    id: 'jasper',
    name: 'Jasper AI',
    sector: 'marketing',
    sectorLabel: 'Marketing',
    purpose: 'Long-form marketing copy and brand voice drafts',
    purposeSr: 'Marketing copy i brand voice draftovi',
    envKeys: ['JASPER_API_KEY'],
    monthlyCostEur: { min: 60, max: 150 },
    fromPhase: 'M5',
    docsUrl: 'https://www.jasper.ai',
    connectionMode: 'api_key',
  },
  {
    id: 'predis',
    name: 'Predis.ai',
    sector: 'marketing',
    sectorLabel: 'Marketing',
    purpose: 'Social creative / post generation',
    purposeSr: 'Social creative / generisanje postova',
    envKeys: ['PREDIS_API_KEY'],
    monthlyCostEur: { min: 60, max: 150 },
    fromPhase: 'M5',
    docsUrl: 'https://predis.ai',
    connectionMode: 'api_key',
  },
  {
    id: 'devin',
    name: 'Devin',
    sector: 'exec_coding',
    sectorLabel: 'Izvršni deo — kodiranje',
    purpose: 'Autonomous coding agent for implementation tasks',
    purposeSr: 'Autonomni coding agent za implementacije',
    envKeys: ['DEVIN_API_KEY'],
    monthlyCostEur: { min: 100, max: 500 },
    fromPhase: 'M5',
    docsUrl: 'https://devin.ai',
    connectionMode: 'api_key',
  },
  {
    id: 'replit_agent',
    name: 'Replit Agent',
    sector: 'exec_coding',
    sectorLabel: 'Izvršni deo — kodiranje',
    purpose: 'Cloud agent for rapid app / prototype builds',
    purposeSr: 'Cloud agent za brze app / prototype buildove',
    envKeys: ['REPLIT_AGENT_API_KEY'],
    monthlyCostEur: { min: 100, max: 500 },
    fromPhase: 'M5',
    docsUrl: 'https://replit.com',
    connectionMode: 'api_key',
  },
  {
    id: 'heygen',
    name: 'HeyGen',
    sector: 'exec_media',
    sectorLabel: 'Izvršni deo — video/glas',
    purpose: 'Talking avatar / video artifacts (existing Atina provider)',
    purposeSr: 'Talking avatar / video artifacti (postojeći Atina provider)',
    envKeys: ['HEYGEN_API_KEY'],
    monthlyCostEur: { min: 50, max: 150 },
    fromPhase: 'M6',
    docsUrl: 'https://www.heygen.com',
    connectionMode: 'existing_provider',
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    sector: 'exec_media',
    sectorLabel: 'Izvršni deo — video/glas',
    purpose: 'TTS / voice for avatars and media pipeline',
    purposeSr: 'TTS / glas za avatare i media pipeline',
    envKeys: ['ELEVENLABS_API_KEY'],
    monthlyCostEur: { min: 50, max: 150 },
    fromPhase: 'M4',
    docsUrl: 'https://elevenlabs.io',
    connectionMode: 'existing_provider',
  },
  {
    id: 'crewai',
    name: 'CrewAI',
    sector: 'exec_agents',
    sectorLabel: 'Izvršni deo — AI agenti',
    purpose: 'Multi-agent orchestration gateway (API calls)',
    purposeSr: 'Koordinacija AI agenata (API pozivi)',
    envKeys: ['CREWAI_API_KEY'],
    connectionKeys: ['CREWAI_BASE_URL'],
    monthlyCostEur: { min: 30, max: 100 },
    fromPhase: 'M5',
    docsUrl: 'https://www.crewai.com',
    connectionMode: 'api_key_and_url',
  },
  {
    id: 'langchain',
    name: 'LangChain (LangSmith)',
    sector: 'exec_agents',
    sectorLabel: 'Izvršni deo — AI agenti',
    purpose: 'Agent traces / LangSmith + orchestration API',
    purposeSr: 'Agent traces / LangSmith + orchestration API',
    envKeys: ['LANGCHAIN_API_KEY'],
    connectionKeys: ['LANGCHAIN_PROJECT'],
    monthlyCostEur: { min: 30, max: 100 },
    fromPhase: 'M5',
    docsUrl: 'https://www.langchain.com',
    connectionMode: 'api_key',
  },
];

function envPresent(key: string): boolean {
  const v = process.env[key]?.trim();
  return Boolean(v && v !== 'placeholder' && !v.startsWith('your_'));
}

export type ExternalAiVendorStatus = {
  id: string;
  name: string;
  sector: ExternalAiSector;
  sectorLabel: string;
  purpose: string;
  purposeSr: string;
  fromPhase: string;
  monthlyCostEur: { min: number; max: number };
  connectionMode: string;
  keysConfigured: boolean;
  connectionReady: boolean;
  missingKeys: string[];
  missingConnectionKeys: string[];
  docsUrl?: string;
};

export type ExternalAiStackStatus = {
  budgetHintEur: { opsMin: number; opsMax: number; execMin: number; execMax: number };
  configuredCount: number;
  totalCount: number;
  bySector: Record<
    string,
    {
      label: string;
      vendors: ExternalAiVendorStatus[];
      configured: number;
      total: number;
    }
  >;
  vendors: ExternalAiVendorStatus[];
};

export function buildExternalAiStackStatus(): ExternalAiStackStatus {
  const vendors: ExternalAiVendorStatus[] = EXTERNAL_AI_STACK.map((v) => {
    const missingKeys = v.envKeys.filter((k) => !envPresent(k));
    const missingConnectionKeys = (v.connectionKeys ?? []).filter((k) => !envPresent(k));
    const keysConfigured = missingKeys.length === 0;
    const connectionReady =
      keysConfigured &&
      (v.connectionMode !== 'api_key_and_url' || missingConnectionKeys.length === 0);
    return {
      id: v.id,
      name: v.name,
      sector: v.sector,
      sectorLabel: v.sectorLabel,
      purpose: v.purpose,
      purposeSr: v.purposeSr,
      fromPhase: v.fromPhase,
      monthlyCostEur: v.monthlyCostEur,
      connectionMode: v.connectionMode,
      keysConfigured,
      connectionReady,
      missingKeys,
      missingConnectionKeys,
      docsUrl: v.docsUrl,
    };
  });

  const bySector: ExternalAiStackStatus['bySector'] = {};
  for (const v of vendors) {
    if (!bySector[v.sector]) {
      bySector[v.sector] = {
        label: v.sectorLabel,
        vendors: [],
        configured: 0,
        total: 0,
      };
    }
    bySector[v.sector].vendors.push(v);
    bySector[v.sector].total += 1;
    if (v.keysConfigured) bySector[v.sector].configured += 1;
  }

  return {
    budgetHintEur: { opsMin: 500, opsMax: 1200, execMin: 200, execMax: 800 },
    configuredCount: vendors.filter((v) => v.keysConfigured).length,
    totalCount: vendors.length,
    bySector,
    vendors,
  };
}

/** Env keys that belong to this stack (for docs / optional factory gaps). */
export function getExternalAiStackEnvKeys(opts?: {
  fromPhaseMax?: 'M4' | 'M5' | 'M6';
}): string[] {
  const order = ['M4', 'M5', 'M6'] as const;
  const maxIdx = opts?.fromPhaseMax ? order.indexOf(opts.fromPhaseMax) : order.length - 1;
  const keys = new Set<string>();
  for (const v of EXTERNAL_AI_STACK) {
    if (order.indexOf(v.fromPhase) > maxIdx) continue;
    for (const k of v.envKeys) keys.add(k);
    for (const k of v.connectionKeys ?? []) keys.add(k);
  }
  return [...keys];
}
