import { getDeliverable, listDeliverables } from '../billing/lib/deliverable-catalog';
import { getPackageDeliverySpec } from '../billing/lib/package-delivery-spec';
import {
  capabilityClusterFor,
  CLUSTER_SKUS,
  FORBIDDEN_SKU_CLUSTERS,
  inferClusterFromText,
  type CapabilityCluster,
} from './omi-clusters';
import {
  buildOmiConversationState,
  buildOmiConversationStateFromCombined,
  formatOmiConsultVisitorReply,
  resolveOmiConsultStage,
  type OmiConsultStage,
  type OmiConversationState,
} from './omi-consult';
import {
  classifyOmiProblems,
  mappingWhyForSku,
  rankOmiPackages,
  skusForCapabilities,
} from './omi-problem-model';

/** Public SaaS book — keep in sync with apps/omnigroup-web/src/lib/saas-plans.ts */
export const OMI_SAAS_PLANS = [
  { slug: 'starter', name: 'Launch', monthlyEur: 79, monthlyUsd: 89 },
  { slug: 'pro', name: 'Growth', monthlyEur: 249, monthlyUsd: 279 },
  { slug: 'enterprise', name: 'Scale', monthlyEur: 429, monthlyUsd: 469 },
] as const;

export type OmiProductCard = {
  id: string;
  name: string;
  priceEur: number;
  billing: string;
  description: string;
  exclusions?: string;
  why?: string;
  href: string;
};

export type OmiRecommendInput = {
  message: string;
  /** Prior user turns (preferred over embedding history in `message`). */
  priorUserMessages?: string[];
  industryCategory?: string;
  productId?: string;
  budgetEur?: number;
  pagePath?: string;
};

export type OmiRecommendResult = {
  understood: string;
  sourceMessage: string;
  problems: string[];
  products: OmiProductCard[];
  saas: ReadonlyArray<(typeof OMI_SAAS_PLANS)[number]>;
  noSuitable: boolean;
  confidence: 'high' | 'medium' | 'low';
  budgetEur?: number;
  saasFocus?: boolean;
  catalogFocus?: boolean;
  consultStage?: OmiConsultStage;
  conversation?: OmiConversationState;
};

export function isOmiSaasSurface(path?: string): boolean {
  if (!path) return false;
  return /^\/pricing(\/|$)/i.test(path) || /checkout/i.test(path);
}

export function isOmiPagePurchaseAsk(message: string): boolean {
  return /what am i buying|buying on this (page|site)|on this page|sta kupujem|šta kupujem|na ovoj stranici|compare (the )?plans|how do launch|which plan|saas plans?/i.test(
    message,
  );
}

export function isOmiAfterPaymentAsk(message: string): boolean {
  return /after payment|posle plac|posle plać|šta se dešava posle|sta se desava posle/i.test(message);
}

export function isOmiExplicitExpertAsk(message: string): boolean {
  return /expert|landing|website|setup-quick|setup full|retainer|audit|ecommerce|for my (restaurant|salon|dentist|hotel)|za (restoran|salon|stomatolog)/i.test(
    message,
  );
}

export function formatOmiSaasPageReply(): string {
  return `This page is the SaaS subscription: ${OMI_SAAS_PLANS.map(
    (s) => `${s.name} €${s.monthlyEur}/$${s.monthlyUsd}`,
  ).join(', ')} monthly. Yearly is 10× monthly. Expert services are a separate catalog on /products.`;
}

export function formatOmiAfterPaymentReply(): string {
  return 'Access starts after Stripe confirms the payment — the webhook, not the success page, is the source of truth. Then we turn on the portal and send the setup guide. Expert packages deliver into that portal only after the same confirmation.';
}

export function isOmiCatalogSurface(path?: string): boolean {
  return Boolean(path && /^\/(products|services)(\/|$)/i.test(path));
}

export function isOmiThisPackageAsk(message: string): boolean {
  return /what is included|this package|is this (for|suitable)|how does delivery|sta je ukljuc|šta je uključ|ovaj paket/i.test(
    message,
  );
}

export function formatOmiCatalogPageReply(): string {
  return 'This page is the expert catalog — 17 services plus 3 bundles, same list prices as /pricing. Open a package card or name the SKU and I will quote that verified item. SaaS plans stay on /pricing: Launch €79/$89, Growth €249/$279, Scale €429/$469 monthly.';
}

function cardFor(id: string, why?: string): OmiProductCard | null {
  const d = getDeliverable(id);
  if (!d) return null;
  const spec = getPackageDeliverySpec(id);
  return {
    id: d.id,
    name: d.name,
    priceEur: d.anchorEur,
    billing: d.billing,
    description: d.description,
    exclusions: spec?.excludes?.slice(0, 2).join('; '),
    why,
    href: `/products#${d.id}`,
  };
}

function extractBudgetEur(message: string): number | undefined {
  const re = /(?:€|eur|euro)\s*([0-9]{2,6})|([0-9]{2,6})\s*(?:€|eur|euro)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(message))) {
    const n = Number.parseInt(match[1] || match[2] || '', 10);
    if (!Number.isFinite(n)) continue;
    const after = message.slice(match.index + match[0].length, match.index + match[0].length + 24);
    if (/(?:\/|per|an)\s*h(our)?s?\b/i.test(after)) continue;
    return n;
  }
  return undefined;
}

const SEARCH_STOP = new Set([
  'the',
  'and',
  'for',
  'with',
  'your',
  'you',
  'need',
  'have',
  'this',
  'that',
  'system',
  'from',
  'not',
  'are',
  'our',
  'their',
  'about',
  'into',
  'more',
  'than',
  'what',
  'how',
  'can',
  'does',
  'will',
  'want',
  'like',
  'also',
  'just',
  'very',
  'small',
  'proper',
  'digital',
  'licensed',
  'control',
  'hardware',
  'page',
  'buying',
]);

export function searchOmiProducts(query: string, limit = 4): OmiProductCard[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const tokens = q.split(/[^a-z0-9+]+/).filter((t) => t.length > 2 && !SEARCH_STOP.has(t));
  if (!tokens.length) return [];
  const scored = listDeliverables()
    .map((d) => {
      const hay = `${d.id} ${d.name} ${d.nameSr} ${d.description}`.toLowerCase();
      const hits = tokens.filter((t) => hay.includes(t)).length;
      return { d, hits };
    })
    .filter((row) => row.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  return scored
    .slice(0, limit)
    .map((row) => cardFor(row.d.id))
    .filter((c): c is OmiProductCard => Boolean(c));
}

function extractExactCatalogPrice(message: string): number | undefined {
  if (/\b(i have|budget|budzet|imam)\b/i.test(message)) return undefined;
  const m = message.match(
    /(?:paket|package|plan|costs?|kosta|košta).*?(?:€|eur)\s*([0-9]{2,6})|(?:€|eur)\s*([0-9]{2,6})\s*(?:package|paket|plan)?/i,
  );
  if (!m) return undefined;
  const n = Number.parseInt(m[1] || m[2] || '', 10);
  return Number.isFinite(n) ? n : undefined;
}

export function recommendOmiProducts(input: OmiRecommendInput): OmiRecommendResult {
  const lastMessage = input.message.trim();
  const prior = (input.priorUserMessages ?? []).map((m) => m.trim()).filter(Boolean);
  const conversation: OmiConversationState =
    prior.length > 0
      ? buildOmiConversationState(prior, lastMessage)
      : buildOmiConversationStateFromCombined(lastMessage);
  const message = conversation.activeThread || lastMessage;
  const budgetSource = conversation.factThread || message;
  const budget = input.budgetEur ?? extractBudgetEur(budgetSource);
  const exactPrice = extractExactCatalogPrice(lastMessage) ?? extractExactCatalogPrice(message);
  const saasFocus =
    isOmiSaasSurface(input.pagePath) &&
    (isOmiPagePurchaseAsk(lastMessage) || isOmiAfterPaymentAsk(lastMessage)) &&
    !isOmiExplicitExpertAsk(lastMessage) &&
    !input.productId;
  const catalogFocus =
    isOmiCatalogSurface(input.pagePath) &&
    isOmiThisPackageAsk(lastMessage) &&
    !input.productId &&
    !isOmiExplicitExpertAsk(lastMessage);
  const pageFocus = saasFocus || catalogFocus;
  const classified = pageFocus
    ? { concepts: [], capabilities: [], labels: [] as string[] }
    : conversation.classified.labels.length || conversation.classified.concepts.length
      ? conversation.classified
      : classifyOmiProblems(message);
  const problems = pageFocus ? [] : classified.labels;
  const searchText = [conversation.activeThread, lastMessage].filter(Boolean).join('\n');
  const inferred = input.industryCategory
    ? capabilityClusterFor(input.industryCategory)
    : inferClusterFromText(searchText);
  const focused = input.productId ? cardFor(input.productId) : null;
  const priced =
    exactPrice != null
      ? listDeliverables()
          .filter((d) => d.anchorEur === exactPrice)
          .map((d) => cardFor(d.id, 'Listed catalog price matches the amount you asked about.'))
          .filter((c): c is OmiProductCard => Boolean(c))
      : [];
  const searched = pageFocus
    ? []
    : searchOmiProducts(searchText, 3).filter((c) => {
        if (!inferred) return true;
        const banned = FORBIDDEN_SKU_CLUSTERS[c.id];
        return !banned || !banned.includes(inferred);
      });
  const hasSignal = Boolean(
    !pageFocus && (inferred || focused || searched.length || priced.length || problems.length),
  );
  const cluster: CapabilityCluster = inferred ?? 'professional';

  const clusterCards = hasSignal
    ? CLUSTER_SKUS[cluster]
        .filter((row) => {
          const banned = FORBIDDEN_SKU_CLUSTERS[row.id];
          return !banned || !banned.includes(cluster);
        })
        .map((row) => cardFor(row.id, row.why))
        .filter((c): c is OmiProductCard => Boolean(c))
    : [];
  const mappedCards = pageFocus
    ? []
    : skusForCapabilities(classified.capabilities)
        .filter((id) => {
          const banned = FORBIDDEN_SKU_CLUSTERS[id];
          return !banned || !inferred || !banned.includes(inferred);
        })
        .map((id) =>
          cardFor(id, mappingWhyForSku(id, classified) ?? CLUSTER_SKUS[cluster].find((r) => r.id === id)?.why),
        )
        .filter((c): c is OmiProductCard => Boolean(c));

  const merged = new Map<string, OmiProductCard>();
  if (focused) merged.set(focused.id, focused);
  for (const c of [...priced, ...searched, ...clusterCards, ...mappedCards]) {
    const why = mappingWhyForSku(c.id, classified, c.why);
    merged.set(c.id, why && why !== c.why ? { ...c, why } : c);
  }

  const clusterSkuIds = CLUSTER_SKUS[cluster].map((row) => row.id);
  let products = rankOmiPackages([...merged.values()], classified, {
    message: searchText,
    clusterSkuIds,
    budgetEur: budget,
    pinnedId: focused?.id,
  });
  if (budget != null && budget > 0) {
    products = products.filter((p) => p.priceEur <= budget);
  }

  const saas =
    budget != null && budget > 0
      ? OMI_SAAS_PLANS.filter((s) => s.monthlyEur <= budget)
      : OMI_SAAS_PLANS;
  const noSuitable = products.length === 0 && !pageFocus;
  const confidence: OmiRecommendResult['confidence'] = pageFocus
    ? 'high'
    : focused || (input.industryCategory && products.length > 0)
      ? 'high'
      : inferClusterFromText(searchText) && products.length > 0
        ? 'medium'
        : 'low';

  const understoodBits = [
    conversation.intent !== 'other' ? `(${conversation.intent})` : '',
    lastMessage.slice(0, 160),
  ]
    .filter(Boolean)
    .join(' ');
  const draft: OmiRecommendResult = {
    understood: understoodBits.slice(0, 180),
    sourceMessage: conversation.factThread || message,
    problems,
    products: products.slice(0, 4),
    saas,
    noSuitable,
    confidence,
    budgetEur: budget,
    saasFocus,
    catalogFocus,
    conversation,
  };
  draft.consultStage = resolveOmiConsultStage(lastMessage, draft);
  return draft;
}

export function formatOmiVerifiedBlock(result: OmiRecommendResult): string {
  const lines = [
    'VERIFIED Omni catalog (do not invent other SKUs or prices):',
    `Confidence: ${result.confidence}.`,
  ];
  if (result.saasFocus) {
    lines.push(
      'Page focus: SaaS on /pricing. Lead with Launch, Growth, Scale. Do not list expert SKUs unless the visitor asked for expert delivery.',
    );
  }
  if (result.catalogFocus) {
    lines.push(
      'Page focus: expert catalog on /products. Do not pick a random SKU. Ask which package or quote only a named/hashed catalog id.',
    );
  }
  if (result.consultStage) {
    lines.push(`Consult stage: ${result.consultStage}.`);
    if (result.consultStage === 'discover') {
      lines.push(
        'Do not recommend a package yet. Ask 1–3 follow-up questions. Catalog rows below are internal candidates only.',
      );
    }
    if (result.consultStage === 'diagnose') {
      lines.push(
        'Summarize the bottleneck, ask to validate, and only hypothesise a catalog item with why / why-not. Do not upsell.',
      );
    }
    if (result.consultStage === 'recommend') {
      lines.push(
        'Enough signal to map problem → verified SKU. Explain why it fits THIS visitor. Say what it does not address. Label any euro maths as estimates, never promised savings.',
      );
    }
  }
  if (result.saas.length) {
    lines.push(
      `SaaS: ${result.saas.map((s) => `${s.name} €${s.monthlyEur}/$${s.monthlyUsd} monthly`).join('; ')}. Yearly = 10× monthly. Source: /pricing.`,
    );
  }
  if (result.problems.length) lines.push(`Identified problems: ${result.problems.join('; ')}.`);
  if (result.noSuitable) {
    lines.push(
      'No verified Omni package matches this request. Say so. Do not force the closest SKU.',
    );
  } else {
    for (const p of result.products) {
      const extra = [p.why, p.exclusions ? `Not included: ${p.exclusions}` : '']
        .filter(Boolean)
        .join(' ');
      lines.push(
        `- ${p.name} (${p.id}) €${p.priceEur} ${p.billing} — ${p.description} ${extra} Link: ${p.href}`,
      );
    }
  }
  lines.push(
    'If asked for something not listed: "I don\'t have verified information for that." Never invent discounts, guarantees, employees, or invoices.',
  );
  if (!result.saasFocus && !result.catalogFocus) {
    const visitor = formatOmiConsultVisitorReply(result, result.sourceMessage || result.understood || '');
    if (visitor) {
      lines.push('Visitor reply:');
      lines.push(visitor);
      lines.push('Consult footer:');
    }
  }
  return lines.join('\n');
}

export function formatOmiAdvisorReply(result: OmiRecommendResult): string {
  if (result.saasFocus) {
    const parts: string[] = [];
    if (result.understood) parts.push(`What I understood: ${result.understood}`);
    parts.push(
      isOmiAfterPaymentAsk(result.understood) ? formatOmiAfterPaymentReply() : formatOmiSaasPageReply(),
    );
    return parts.join(' ');
  }
  if (result.catalogFocus) {
    const parts: string[] = [];
    if (result.understood) parts.push(`What I understood: ${result.understood}`);
    parts.push(formatOmiCatalogPageReply());
    return parts.join(' ');
  }
  return formatOmiConsultVisitorReply(result, result.sourceMessage || result.understood || '');
}

export function formatOmiAdvisorReplyFromVerified(block: string): string | null {
  if (!block.trim()) return null;
  if (/Page focus: SaaS on \/pricing/i.test(block) || (/Current public page: \/pricing/.test(block) && /Lead with Launch/.test(block))) {
    return formatOmiSaasPageReply();
  }
  if (/Page focus: expert catalog on \/products/i.test(block)) {
    return formatOmiCatalogPageReply();
  }
  if (/No verified Omni package/.test(block) || /Consult stage: unavailable/i.test(block)) {
    return 'Omni does not currently have a verified solution for that requirement. I will not force a nearby package. Use /contact if you want a human to review it.';
  }
  const visitor = block.match(/Visitor reply:\n([\s\S]+?)\nConsult footer:/);
  if (visitor?.[1]?.trim()) return visitor[1].trim();

  const problems = block.match(/Identified problems: ([^\n]+)/);
  const confidence = block.match(/Confidence: (high|medium|low)/);
  const products = [...block.matchAll(/^- (.+)$/gm)].map((m) => m[1]);
  if (!products.length) {
    if (/Current public page: \/pricing/.test(block) && /SaaS:/.test(block)) {
      return formatOmiSaasPageReply();
    }
    if (/Consult stage: discover/i.test(block)) {
      return 'I want to understand the situation before recommending a package. What is currently costing time, money, or customers?';
    }
    return null;
  }
  const parts: string[] = [];
  if (problems) parts.push(`The bottleneck I would test first: ${problems[1]}`);
  if (confidence?.[1] === 'low') {
    parts.push('I do not have enough information yet to confidently name a root cause.');
  }
  if (/Consult stage: discover/i.test(block)) {
    return 'I want to understand the situation before recommending a package. What is currently costing time, money, or customers?';
  }
  parts.push(products[0]);
  parts.push('Does that sound like the actual problem, or are we missing something? I do not invent prices or packages. Next: /products or /contact.');
  return parts.join(' ');
}
