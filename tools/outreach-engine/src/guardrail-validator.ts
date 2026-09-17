/**
 * Deterministic guardrails against hallucinations / bad pricing / bad SLAs.
 * Runs AFTER Agent 2 (or instead of trusting the LLM alone).
 */
import {
  Agent1OutputSchema,
  Agent2OutputSchema,
  type Agent1Output,
  type Agent2Output,
  type CatalogPackage,
  type GuardrailFinding,
  type GuardrailResult,
  type SourceOfTruth,
} from './types.js';
import { assertSafeCheckoutUrl } from './security-config.js';
import { DEFAULT_DISCLAIMER_FOOTER } from './system-prompts.js';

const HALLUCINATION_PATTERNS: Array<{ code: string; re: RegExp }> = [
  { code: 'guarantee_money_back', re: /\b(100%\s*money[- ]back|full\s*refund\s*guaranteed|risk[- ]free)\b/i },
  { code: 'guarantee_results', re: /\b(guaranteed\s+(leads|roi|revenue|clients|results)|we\s+guarantee\s+\d+)\b/i },
  { code: 'exact_sla_hours', re: /\b(within\s+\d+\s*(minutes|mins)|24\/7\s+human\s+support\s+guaranteed)\b/i },
  { code: 'unlimited_custom', re: /\b(unlimited\s+custom\s+(dev|development|software)|any\s+feature\s+you\s+want)\b/i },
  { code: 'scraped_pii', re: /\b(i\s+found\s+your\s+(email|phone|personal)|scraped\s+your\s+contact)\b/i },
  { code: 'bank_details', re: /\b(iban|swift|wire\s+to\s+our\s+account|send\s+crypto\s+to)\b/i },
  { code: 'unauthorized_discount', re: /\b(\d{1,2}%\s*off|discount\s+code|special\s+price\s+just\s+for\s+you)\b/i },
  { code: 'fake_processor_link', re: /https?:\/\/(?:buy|checkout)\.stripe\.com|paddle\.com\/checkout|lemonsqueezy\.com/i },
];

const SPAM_MARKERS: RegExp[] = [
  /\bhope this (email )?finds you well\b/i,
  /\bact now\b/i,
  /\blimited time offer\b/i,
  /\bdear (sir|madam|valued customer)\b/i,
  /!!!/,
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function packageById(
  truth: SourceOfTruth,
  id: string | null | undefined,
): CatalogPackage | null {
  if (!id) return null;
  return truth.packages.find((p) => p.id === id) ?? null;
}

function allowedTextBlob(pkg: CatalogPackage | null, truth: SourceOfTruth): string {
  const parts = [
    ...truth.allowedFeaturePhrases,
    ...truth.modules.flatMap((m) => [m.name, m.tagline, m.description]),
    ...(pkg
      ? [
          pkg.name,
          pkg.description,
          ...(pkg.includes ?? []),
          ...(pkg.modules ?? []),
        ]
      : truth.packages.flatMap((p) => [p.name, p.description, ...(p.includes ?? [])])),
  ];
  return normalize(parts.join(' | '));
}

function featureClaimsUnsupported(
  claims: string[],
  draft: string,
  allowedBlob: string,
): GuardrailFinding[] {
  const findings: GuardrailFinding[] = [];
  const candidates = [
    ...claims,
    ...extractCapabilityLikePhrases(draft),
  ];
  for (const claim of candidates) {
    const n = normalize(claim);
    if (n.length < 8) continue;
    // Allow soft verbs / questions
    if (/^(could|can we|would you|curious|looking)\b/.test(n)) continue;
    const tokens = n.split(/\W+/).filter((t) => t.length > 3);
    const hitRatio =
      tokens.length === 0
        ? 0
        : tokens.filter((t) => allowedBlob.includes(t)).length / tokens.length;
    if (hitRatio < 0.45 && /api|portal|ai|automation|crm|stripe|ssl|sla|integration|scraper|lead/.test(n)) {
      findings.push({
        code: 'feature_not_in_catalog',
        severity: 'block',
        message: `Claim not grounded in catalog: "${claim.slice(0, 120)}"`,
        evidence: claim,
      });
    }
  }
  return findings;
}

function extractCapabilityLikePhrases(text: string): string[] {
  const out: string[] = [];
  const re =
    /\b(?:we (?:offer|provide|include|build|deliver)|includes?|comes with)\s+([^.!?\n]{8,100})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out.push(m[1].trim());
  }
  return out;
}

function pricingFindings(
  agent1: Agent1Output,
  draft: string,
  pkg: CatalogPackage | null,
): GuardrailFinding[] {
  const findings: GuardrailFinding[] = [];
  const catalogPrice = pkg?.priceEur ?? pkg?.anchorEur;
  if (agent1.claimedPriceEur != null && catalogPrice != null) {
    const delta = Math.abs(agent1.claimedPriceEur - catalogPrice);
    if (delta > 1) {
      findings.push({
        code: 'price_mismatch',
        severity: 'block',
        message: `Claimed €${agent1.claimedPriceEur} != catalog €${catalogPrice}`,
      });
    }
  }
  if (/\bcustom pricing\b|\bname your price\b|\bpay what you want\b/i.test(draft)) {
    findings.push({
      code: 'unauthorized_custom_pricing',
      severity: 'block',
      message: 'Unauthorized custom pricing language',
    });
  }
  const priceMentions = [...draft.matchAll(/€\s?(\d+(?:[.,]\d+)?)/g)];
  if (catalogPrice != null) {
    for (const m of priceMentions) {
      const n = Number(String(m[1]).replace(',', '.'));
      if (!Number.isFinite(n)) continue;
      if (Math.abs(n - catalogPrice) > 1) {
        findings.push({
          code: 'price_in_text_mismatch',
          severity: 'block',
          message: `Text price €${n} != catalog €${catalogPrice}`,
        });
      }
    }
  }
  return findings;
}

function deliveryFindings(agent1: Agent1Output, draft: string, pkg: CatalogPackage | null): GuardrailFinding[] {
  const findings: GuardrailFinding[] = [];
  if (agent1.claimedDeliveryDays != null) {
    const desc = `${pkg?.description ?? ''} ${(pkg?.includes ?? []).join(' ')}`;
    const allowed = desc.match(/(\d+)\s*[–-]\s*(\d+)\s*days?|(\d+)\s*days?|24–48h|24-48h/i);
    if (!allowed) {
      findings.push({
        code: 'delivery_days_not_in_catalog',
        severity: 'block',
        message: `Delivery days ${agent1.claimedDeliveryDays} not supported by package text`,
      });
    }
  }
  if (/\bin \d+ day(s)? guaranteed\b|\bexactly \d+ days?\b/i.test(draft)) {
    findings.push({
      code: 'hard_delivery_guarantee',
      severity: 'block',
      message: 'Hard delivery-day guarantee not allowed',
    });
  }
  return findings;
}

function patternFindings(text: string): GuardrailFinding[] {
  const findings: GuardrailFinding[] = [];
  for (const p of HALLUCINATION_PATTERNS) {
    if (p.re.test(text)) {
      findings.push({
        code: p.code,
        severity: 'block',
        message: `Blocked pattern: ${p.code}`,
        evidence: text.match(p.re)?.[0],
      });
    }
  }
  return findings;
}

function spamScore(text: string): number {
  let hits = 0;
  for (const re of SPAM_MARKERS) {
    if (re.test(text)) hits += 1;
  }
  return hits;
}

function computeFactualityScore(input: {
  blocks: number;
  warns: number;
  groundedPackage: boolean;
  checkoutOk: boolean;
  spamHits: number;
}): number {
  let score = 1;
  score -= input.blocks * 0.25;
  score -= input.warns * 0.08;
  if (!input.groundedPackage) score -= 0.15;
  if (!input.checkoutOk) score -= 0.2;
  score -= Math.min(0.2, input.spamHits * 0.07);
  return Math.max(0, Math.min(1, Number(score.toFixed(3))));
}

function ensureDisclaimer(message: string, footer: string): string {
  if (message.includes(footer) || message.includes('omnigrouptech.com/legal/terms')) {
    return message.trim();
  }
  return `${message.trim()}\n\n${footer}`;
}

export type ValidateDraftInput = {
  truth: SourceOfTruth;
  agent1: unknown;
  agent2?: unknown;
  /** Optional prebuilt checkout URL from platform API only */
  platformCheckoutUrl?: string | null;
};

/**
 * Parse LLM payloads, score factuality 0–1, approve/reject with findings.
 */
export function validateDraftAgainstTruth(input: ValidateDraftInput): GuardrailResult {
  const findings: GuardrailFinding[] = [];
  let agent1: Agent1Output;
  try {
    agent1 = Agent1OutputSchema.parse(input.agent1);
  } catch (err) {
    return {
      ok: false,
      status: 'REJECTED',
      factualityScore: 0,
      findings: [
        {
          code: 'agent1_schema_invalid',
          severity: 'block',
          message: err instanceof Error ? err.message : 'Invalid Agent1 JSON',
        },
      ],
      finalMessage: '',
      approvedCheckoutUrl: null,
    };
  }

  if (agent1.discard || agent1.relevanceScore < 7) {
    return {
      ok: false,
      status: 'REJECTED',
      factualityScore: 1,
      findings: [
        {
          code: 'below_score_threshold',
          severity: 'warn',
          message: agent1.discardReason ?? `score ${agent1.relevanceScore} < 7`,
        },
      ],
      finalMessage: '',
      approvedCheckoutUrl: null,
    };
  }

  const pkg = packageById(input.truth, agent1.recommendedPackageId ?? agent1.checkoutPackageId);
  if (agent1.recommendedPackageId && !pkg) {
    findings.push({
      code: 'unknown_package_id',
      severity: 'block',
      message: `Package id not in catalog: ${agent1.recommendedPackageId}`,
    });
  }

  const draft =
    typeof input.agent2 === 'object' &&
    input.agent2 &&
    'finalMessage' in (input.agent2 as object)
      ? String((input.agent2 as Agent2Output).finalMessage || agent1.draftMessage)
      : agent1.draftMessage;

  const allowedBlob = allowedTextBlob(pkg, input.truth);
  findings.push(...featureClaimsUnsupported(agent1.claimedFeatures, draft, allowedBlob));
  findings.push(...pricingFindings(agent1, draft, pkg));
  findings.push(...deliveryFindings(agent1, draft, pkg));
  findings.push(...patternFindings(draft));

  const spamHits = spamScore(draft);
  if (spamHits >= 2) {
    findings.push({
      code: 'spam_tone',
      severity: 'block',
      message: `Spam/robotic markers=${spamHits}`,
    });
  } else if (spamHits === 1) {
    findings.push({
      code: 'spam_tone_warn',
      severity: 'warn',
      message: 'Mild spam marker detected',
    });
  }

  let agent2: Agent2Output | null = null;
  if (input.agent2 != null) {
    try {
      agent2 = Agent2OutputSchema.parse(input.agent2);
    } catch (err) {
      findings.push({
        code: 'agent2_schema_invalid',
        severity: 'block',
        message: err instanceof Error ? err.message : 'Invalid Agent2 JSON',
      });
    }
  }

  const proposed =
    input.platformCheckoutUrl ??
    agent2?.approvedCheckoutUrl ??
    null;
  const checkout = assertSafeCheckoutUrl(
    proposed,
    input.truth.checkoutBaseUrl,
    agent1.checkoutPackageId ?? agent1.recommendedPackageId,
  );
  if (!checkout.ok) {
    findings.push({
      code: checkout.reason ?? 'checkout_invalid',
      severity: 'block',
      message: 'Checkout URL failed platform validation',
    });
  }

  const blocks = findings.filter((f) => f.severity === 'block').length;
  const warns = findings.filter((f) => f.severity === 'warn').length;
  const factualityScore = computeFactualityScore({
    blocks,
    warns,
    groundedPackage: Boolean(pkg) || !agent1.recommendedPackageId,
    checkoutOk: checkout.ok,
    spamHits,
  });

  const footer = input.truth.terms.disclaimerFooter || DEFAULT_DISCLAIMER_FOOTER;
  let status: GuardrailResult['status'] = 'REJECTED';
  let finalMessage = '';

  if (blocks === 0 && factualityScore >= 0.85) {
    const base = agent2?.rewrittenMessage || agent2?.finalMessage || agent1.draftMessage;
    finalMessage = ensureDisclaimer(base, footer);
    if (checkout.url && !finalMessage.includes(checkout.url)) {
      finalMessage = `${finalMessage.trim()}\n\nOfficial checkout: ${checkout.url}`;
    }
    status = agent2?.status === 'REWRITTEN' || spamHits === 1 ? 'REWRITTEN' : 'APPROVED';
  } else {
    status = 'REJECTED';
    finalMessage = '';
  }

  // Agent2 hard reject wins even if deterministic score is high
  if (agent2?.status === 'REJECTED') {
    status = 'REJECTED';
    finalMessage = '';
    findings.push({
      code: 'agent2_rejected',
      severity: 'block',
      message: agent2.reasons.join('; ') || 'Supervisor rejected',
    });
  }

  return {
    ok: status === 'APPROVED' || status === 'REWRITTEN',
    status,
    factualityScore,
    findings,
    finalMessage,
    approvedCheckoutUrl: status === 'REJECTED' ? null : checkout.url,
  };
}

/** Convenience: FactualityScore only */
export function factualityScore(
  truth: SourceOfTruth,
  agent1: unknown,
  agent2?: unknown,
): number {
  return validateDraftAgainstTruth({ truth, agent1, agent2 }).factualityScore;
}
