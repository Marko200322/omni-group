export type DemandCluster = {
  code: string;
  label: string;
  phrases: string[];
};

type ClusterDef = {
  code: string;
  label: string;
  stems: string[];
};

/**
 * Deterministic synonym/stem clusters — no LLM.
 */
const CLUSTERS: ClusterDef[] = [
  {
    code: 'crm_erp_integration',
    label: 'CRM/ERP integration',
    stems: [
      'crm',
      'erp',
      'salesforce',
      'hubspot',
      'sap',
      'dynamics',
      'integrat',
      'sync system',
      'connect crm',
      'connect erp',
    ],
  },
  {
    code: 'manual_data_transfer',
    label: 'Manual data transfer',
    stems: [
      'manual data',
      'copy paste',
      'copy-paste',
      'spreadsheet transfer',
      'csv export',
      'csv import',
      'rekey',
      're-enter',
      'double entry',
      'hand transfer',
    ],
  },
  {
    code: 'workflow_automation',
    label: 'Workflow automation',
    stems: [
      'workflow',
      'automat',
      'zapier',
      'n8n',
      'orchestrat',
      'approval flow',
      'process automat',
      'rpa',
      'bot flow',
    ],
  },
  {
    code: 'invoicing',
    label: 'Invoicing',
    stems: [
      'invoice',
      'invoicing',
      'billing',
      'accounts receivable',
      'ar process',
      'payment reminder',
      'dunning',
      'quote to cash',
    ],
  },
  {
    code: 'support_docs',
    label: 'Support docs',
    stems: [
      'support doc',
      'helpdesk',
      'knowledge base',
      'kb article',
      'faq',
      'documentation',
      'runbook',
      'sop',
      'ticket template',
    ],
  },
];

function normalizePhrase(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s/_+-]/g, ' ')
    .replace(/\s+/g, ' ');
}

function matchCluster(phrase: string): ClusterDef | null {
  const p = normalizePhrase(phrase);
  if (!p) return null;
  for (const cluster of CLUSTERS) {
    if (cluster.stems.some((stem) => p.includes(stem))) {
      return cluster;
    }
  }
  return null;
}

/**
 * Map free-text demand phrases into fixed synonym clusters.
 * Unmatched phrases are omitted (deterministic; no LLM invention).
 */
export function normalizeDemandPhrases(phrases: string[]): DemandCluster[] {
  const buckets = new Map<string, DemandCluster>();

  for (const raw of phrases) {
    if (typeof raw !== 'string') continue;
    const cluster = matchCluster(raw);
    if (!cluster) continue;
    const existing = buckets.get(cluster.code);
    const phrase = raw.trim();
    if (!phrase) continue;
    if (existing) {
      if (!existing.phrases.includes(phrase)) existing.phrases.push(phrase);
    } else {
      buckets.set(cluster.code, {
        code: cluster.code,
        label: cluster.label,
        phrases: [phrase],
      });
    }
  }

  return CLUSTERS.map((c) => buckets.get(c.code)).filter((x): x is DemandCluster => Boolean(x));
}
