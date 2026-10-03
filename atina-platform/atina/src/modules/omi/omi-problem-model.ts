/**
 * Problem → capability → catalog scoring.
 * Internal scores are never shown to visitors.
 */

export type OmiProblemConcept =
  | 'REPETITIVE_MANUAL_WORK'
  | 'SYSTEMS_NOT_CONNECTED'
  | 'TRAFFIC_WITHOUT_CONVERSION'
  | 'WEAK_WEB_PRESENCE'
  | 'MISSED_INQUIRIES'
  | 'POOR_REPORTING'
  | 'REPETITIVE_CUSTOMER_QUESTIONS'
  | 'BOOKING_FRICTION'
  | 'BILLING_SCATTERED'
  | 'DEMAND_UNSPECIFIED'
  | 'PROCESS_ERRORS_OR_CHURN';

export type OmiCapability =
  | 'integration'
  | 'workflow_automation'
  | 'data_sync'
  | 'process_automation'
  | 'conversion_investigation'
  | 'public_web'
  | 'booking'
  | 'customer_portal'
  | 'lead_followup'
  | 'reporting'
  | 'support_deflection'
  | 'billing_ops'
  | 'demand_discovery';

export type OmiProblemClassification = {
  concepts: OmiProblemConcept[];
  capabilities: OmiCapability[];
  labels: string[];
};

export const CONCEPT_LABEL: Record<OmiProblemConcept, string> = {
  REPETITIVE_MANUAL_WORK: 'manual data transfer',
  SYSTEMS_NOT_CONNECTED: 'systems do not communicate',
  TRAFFIC_WITHOUT_CONVERSION: 'traffic without conversion',
  WEAK_WEB_PRESENCE: 'weak or missing public web presence',
  MISSED_INQUIRIES: 'missed inquiries',
  POOR_REPORTING: 'poor reporting / no operational visibility',
  REPETITIVE_CUSTOMER_QUESTIONS: 'repetitive customer questions',
  BOOKING_FRICTION: 'reservation / booking communication',
  BILLING_SCATTERED: 'billing scattered across tools',
  DEMAND_UNSPECIFIED: 'need for demand, conversion, or follow-up — not specified which',
  PROCESS_ERRORS_OR_CHURN: 'errors or customer loss in the current process',
};

export const CONCEPT_CAPABILITIES: Record<OmiProblemConcept, OmiCapability[]> = {
  REPETITIVE_MANUAL_WORK: ['process_automation', 'workflow_automation', 'integration', 'data_sync'],
  SYSTEMS_NOT_CONNECTED: ['integration', 'data_sync'],
  TRAFFIC_WITHOUT_CONVERSION: ['conversion_investigation'],
  WEAK_WEB_PRESENCE: ['public_web'],
  MISSED_INQUIRIES: ['lead_followup', 'customer_portal'],
  POOR_REPORTING: ['reporting'],
  REPETITIVE_CUSTOMER_QUESTIONS: ['support_deflection'],
  BOOKING_FRICTION: ['booking', 'public_web', 'customer_portal'],
  BILLING_SCATTERED: ['billing_ops', 'customer_portal'],
  DEMAND_UNSPECIFIED: ['demand_discovery'],
  PROCESS_ERRORS_OR_CHURN: ['workflow_automation', 'process_automation'],
};

/** Catalog SKUs only — capabilities they actually cover. Bundles are broad, not specialists. */
export const SKU_CAPABILITIES: Record<string, OmiCapability[]> = {
  integration: ['integration', 'data_sync', 'process_automation'],
  'workflow-design': ['workflow_automation', 'process_automation'],
  'setup-full': ['process_automation', 'customer_portal', 'workflow_automation'],
  'custom-software': ['integration', 'process_automation'],
  'setup-custom': ['integration'],
  audit: ['reporting', 'conversion_investigation'],
  'setup-quick': ['customer_portal', 'billing_ops'],
  landing: ['public_web', 'conversion_investigation', 'lead_followup'],
  'website-business': ['public_web'],
  'website-ecommerce': ['public_web'],
  'sales-enablement': ['support_deflection', 'conversion_investigation', 'lead_followup'],
  'lead-gen-retainer': ['lead_followup', 'demand_discovery'],
  'ai-support-retainer': ['support_deflection'],
  'support-priority': ['support_deflection'],
  'vertical-package': ['customer_portal', 'process_automation'],
  'bundle-portal-presence': ['customer_portal', 'public_web'],
  'bundle-sales-launch': ['public_web', 'lead_followup'],
  'bundle-ops-clarity': ['workflow_automation', 'reporting'],
};

const GENERIC_BUNDLES = new Set([
  'bundle-portal-presence',
  'bundle-sales-launch',
  'bundle-ops-clarity',
]);

const HEAVY_SKU = new Set(['custom-software', 'setup-custom', 'website-ecommerce']);

const AUTOMATION_SKU = new Set(['integration', 'workflow-design', 'setup-full']);

export function normalizeOmiProblemText(message: string): string {
  return message
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Light stem so manually/manualized/copying collapse to the same token. */
export function stemOmiToken(token: string): string {
  let t = token;
  if (t.length < 4) return t;
  t = t.replace(/ization$/, '').replace(/ized$/, '');
  if (t.endsWith('ly') && t.length > 5) t = t.slice(0, -2);
  t = t.replace(/tting$/, 't').replace(/ing$/, '').replace(/tted$/, 't').replace(/ed$/, '');
  t = t.replace(/ies$/, 'y').replace(/es$/, '').replace(/s$/, '');
  return t;
}

function stemsOf(normalized: string): Set<string> {
  return new Set(
    normalized
      .split(' ')
      .map(stemOmiToken)
      .filter((t) => t.length > 2),
  );
}

function hasStem(stems: Set<string>, word: string): boolean {
  return stems.has(stemOmiToken(word));
}

function anyStem(stems: Set<string>, words: string[]): boolean {
  return words.some((w) => hasStem(stems, w));
}

export function classifyOmiProblems(message: string): OmiProblemClassification {
  const n = normalizeOmiProblemText(message);
  const stems = stemsOf(n);
  const concepts: OmiProblemConcept[] = [];
  const add = (c: OmiProblemConcept) => {
    if (!concepts.includes(c)) concepts.push(c);
  };

  const docManual = /\b(user|instruction|handbook|guide|owner)\s+manuals?\b/.test(n);
  const manualMorph = hasStem(stems, 'manual');
  const handWork = /\b(by hand|rucno|prepis|copy and paste|copy paste|data entry)\b/.test(n);
  if (
    handWork ||
    (manualMorph && !docManual) ||
    (hasStem(stems, 'copy') && anyStem(stems, ['data', 'information', 'order', 'system', 'excel', 'spreadsheet'])) ||
    hasStem(stems, 'spreadsheet') ||
    hasStem(stems, 'excel') ||
    (hasStem(stems, 'repeat') && anyStem(stems, ['enter', 'work', 'data', 'information', 'process']))
  ) {
    add('REPETITIVE_MANUAL_WORK');
  }

  if (
    /\b(don t communicate|do not communicate|does not communicate|systems? (don t|do not) talk|crm.{0,32}erp|erp.{0,32}crm|between systems?)\b/.test(
      n,
    ) ||
    (hasStem(stems, 'system') && anyStem(stems, ['talk', 'communicate', 'connect', 'integrat']))
  ) {
    add('SYSTEMS_NOT_CONNECTED');
  }

  if (/\b(repeat|repetitive|same question|faq|inbox)\b/.test(n)) add('REPETITIVE_CUSTOMER_QUESTIONS');
  if (/\b(reservation|booking|appoint)\b/.test(n)) add('BOOKING_FRICTION');
  if (
    /\b(leads?|inquir(?:y|ies)|missed calls?|lose leads|gubimo lead)\b/.test(n) ||
    /\b(sales follow[- ]?up|follow[- ]?up|nobody calls|no one (calls|responds)|calls them back)\b/.test(n)
  ) {
    add('MISSED_INQUIRIES');
  }
  if (/\b(invoice|billing|pay)\b/.test(n) && !/\b(after payment|posle)\b/.test(n)) add('BILLING_SCATTERED');
  if (
    /\b(website|landing page|online presence|nema sajt|nemam sajt|no (website|site))\b/.test(n)
  ) {
    add('WEAK_WEB_PRESENCE');
  }
  if (
    /\b(visitor|posetil|convert|konverzij|hardly anyone buys|niko ne kupuje|few purchases|lots of traffic)\b/.test(
      n,
    )
  ) {
    add('TRAFFIC_WITHOUT_CONVERSION');
  }
  if (/\b(report|reporting|izvestaj|visibility|nema pregled)\b/.test(n)) add('POOR_REPORTING');
  if (/\b(error|gresk|mistake|lossy|gubimo kupce|losing customers|churn)\b/.test(n)) {
    add('PROCESS_ERRORS_OR_CHURN');
  }
  if (/\b(more customers|vise kupac|vise klijen|more sales|vise prodaj)\b/.test(n)) {
    add('DEMAND_UNSPECIFIED');
  }

  const capabilities: OmiCapability[] = [];
  for (const concept of concepts) {
    for (const cap of CONCEPT_CAPABILITIES[concept]) {
      if (!capabilities.includes(cap)) capabilities.push(cap);
    }
  }
  return {
    concepts,
    capabilities,
    labels: concepts.map((c) => CONCEPT_LABEL[c]),
  };
}

export function skusForCapabilities(capabilities: OmiCapability[]): string[] {
  if (!capabilities.length) return [];
  const needed = new Set(capabilities);
  return Object.entries(SKU_CAPABILITIES)
    .filter(([, caps]) => caps.some((c) => needed.has(c)))
    .map(([id]) => id);
}

export type OmiScoreHints = {
  message: string;
  clusterSkuIds?: string[];
  budgetEur?: number;
  pinnedId?: string;
};

function wantsCustom(message: string): boolean {
  return /\b(custom|bespoke|po meri|codebase|from scratch)\b/i.test(message);
}

function namedInMessage(message: string, id: string, name: string): boolean {
  const n = normalizeOmiProblemText(`${id} ${name}`);
  const m = normalizeOmiProblemText(message);
  if (m.includes(id.replace(/-/g, ' ')) || m.includes(id)) return true;
  const nameBit = n.split(' ').filter((w) => w.length > 3).slice(0, 3);
  return nameBit.length > 0 && nameBit.every((w) => m.includes(w));
}

export function scoreOmiPackage(
  sku: { id: string; name: string; priceEur: number },
  classified: OmiProblemClassification,
  hints: OmiScoreHints,
): number {
  if (hints.pinnedId && sku.id === hints.pinnedId) return 10_000;
  const caps = SKU_CAPABILITIES[sku.id] ?? [];
  const needed = classified.capabilities;
  const overlap = caps.filter((c) => needed.includes(c));
  const specialistAutomation =
    AUTOMATION_SKU.has(sku.id) &&
    (classified.concepts.includes('REPETITIVE_MANUAL_WORK') ||
      classified.concepts.includes('SYSTEMS_NOT_CONNECTED'));

  let score = 0;
  if (overlap.length && specialistAutomation) score += 40;
  else if (overlap.length) score += 18;
  if (
    classified.concepts.includes('SYSTEMS_NOT_CONNECTED') &&
    caps.includes('integration')
  ) {
    score += 25;
  }
  if (
    classified.concepts.includes('REPETITIVE_MANUAL_WORK') &&
    (caps.includes('workflow_automation') || caps.includes('process_automation'))
  ) {
    score += 20;
  }
  if (overlap.includes('conversion_investigation') && classified.concepts.includes('TRAFFIC_WITHOUT_CONVERSION')) {
    score += 20;
  }
  if (overlap.includes('lead_followup') && classified.concepts.includes('MISSED_INQUIRIES')) {
    score += 24;
  }
  if (overlap.includes('reporting') && classified.concepts.includes('POOR_REPORTING')) {
    score += 24;
  }
  if (classified.concepts.includes('MISSED_INQUIRIES') && sku.id === 'setup-quick') {
    score -= 14;
  }
  if (overlap.length) score += 20;
  if (hints.clusterSkuIds?.includes(sku.id)) score += 10;
  if (hints.budgetEur != null && sku.priceEur <= hints.budgetEur) score += 10;
  if (GENERIC_BUNDLES.has(sku.id)) score += 2;
  if (namedInMessage(hints.message, sku.id, sku.name)) score += 50;

  const specialistExists = needed.some((cap) =>
    [
      'integration',
      'workflow_automation',
      'data_sync',
      'process_automation',
      'lead_followup',
      'reporting',
    ].includes(cap),
  );
  if (GENERIC_BUNDLES.has(sku.id) && specialistExists) score -= 22;
  if (HEAVY_SKU.has(sku.id) && !wantsCustom(hints.message)) score -= 18;
  if (sku.id === 'website-business' && classified.concepts.includes('TRAFFIC_WITHOUT_CONVERSION')) {
    score -= 16;
  }
  if (sku.id === 'lead-gen-retainer' && classified.concepts.includes('DEMAND_UNSPECIFIED')) {
    score -= 30;
  }
  return score;
}

export function rankOmiPackages<T extends { id: string; name: string; priceEur: number }>(
  products: T[],
  classified: OmiProblemClassification,
  hints: OmiScoreHints,
): T[] {
  return [...products].sort((a, b) => {
    const diff = scoreOmiPackage(b, classified, hints) - scoreOmiPackage(a, classified, hints);
    if (diff !== 0) return diff;
    return a.priceEur - b.priceEur;
  });
}

export function mappingWhyForSku(
  skuId: string,
  classified: OmiProblemClassification,
  fallback?: string,
): string | undefined {
  if (
    classified.concepts.includes('REPETITIVE_MANUAL_WORK') ||
    classified.concepts.includes('SYSTEMS_NOT_CONNECTED')
  ) {
    if (AUTOMATION_SKU.has(skuId)) {
      return 'It addresses the manual transfer itself — connecting or orchestrating the work — not a generic portal or presence bundle.';
    }
    if (GENERIC_BUNDLES.has(skuId)) {
      return 'A presence/portal bundle does not remove the manual transfer between systems.';
    }
  }
  if (classified.concepts.includes('TRAFFIC_WITHOUT_CONVERSION') && skuId !== 'website-business') {
    return 'It is relevant to conversion and follow-up, not an automatic website rebuild.';
  }
  return fallback;
}
