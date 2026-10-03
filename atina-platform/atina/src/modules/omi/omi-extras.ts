import { getDeliverable } from '../billing/lib/deliverable-catalog';
import type { OmiRecommendResult } from './omi-recommend';

/** Prompt / persona contract version (bump when PUBLIC_SITE_* rules change). */
export const OMI_PROMPT_VERSION = 'omi-prompt-2026-09-30';
/** Deterministic recommend + consult mapping version. */
export const OMI_RECOMMEND_ENGINE_VERSION = 'omi-recommend-2026-09-30';
/** Cheap A/B scaffolding only — not a full experiment platform. */
export const OMI_AB_VERSION = 'omi-ab-control';

export type OmiRecommendReason = {
  skuId: string;
  name: string;
  priceEur: number;
  why: string;
  confidence: OmiRecommendResult['confidence'];
  consultStage?: OmiRecommendResult['consultStage'];
};

export type OmiResponseMeta = {
  promptVersion: string;
  recommendEngineVersion: string;
  abVersion: string;
  catalogValidated: boolean;
  recommendReasons: OmiRecommendReason[];
  offerHandoff: boolean;
  replyLanguage: 'en' | 'sr';
  consultStage?: OmiRecommendResult['consultStage'];
  noSuitable: boolean;
  confidence: OmiRecommendResult['confidence'];
  summaryHook: boolean;
};

export type OmiChatTurn = { role: 'user' | 'assistant'; content: string };

const HALLUCINATION_PROMISE =
  /\b(guaranteed?\s+\d+|we promise|promised?\s+roi|unlimited\s+(leads|support|hours)|500\s+leads|40\s*%\s*off|platinum\s+enterprise)\b/i;
const SECRET_LEAK =
  /\b(sk_live|sk_test|DATABASE_URL|BEGIN SYSTEM|api[_-]?key\s*[:=]|password\s*[:=]|Bearer\s+[A-Za-z0-9._-]{20,})\b/i;
const OTHER_TENANT =
  /\b(another customer|other client|client-[a-z0-9-]+ invoice|customer\s+[0-9a-f]{8}-[0-9a-f]{4})/i;

export function detectOmiReplyLanguage(message: string): 'en' | 'sr' {
  if (/[čćžšđČĆŽŠĐ]/.test(message)) return 'sr';
  if (
    /\b(šta|sta|kako|treba|hvala|molim|cena|paket|usluge|kontakt|projekat|račun|racun|narudž|narudz)\b/i.test(
      message,
    )
  ) {
    return 'sr';
  }
  return 'en';
}

export function buildOmiRecommendReasons(result: OmiRecommendResult): OmiRecommendReason[] {
  return result.products.map((p) => ({
    skuId: p.id,
    name: p.name,
    priceEur: p.priceEur,
    why: p.why?.trim() || 'Matched verified catalog capabilities for the stated problem.',
    confidence: result.confidence,
    consultStage: result.consultStage,
  }));
}

/** Every quoted SKU/price must exist in the live deliverable catalog. */
export function validateOmiCatalogSourceOfTruth(result: OmiRecommendResult): boolean {
  if (result.noSuitable && result.products.length === 0) return true;
  return result.products.every((p) => {
    const d = getDeliverable(p.id);
    return Boolean(d && d.anchorEur === p.priceEur && d.name === p.name);
  });
}

export function shouldOfferOmiHumanHandoff(
  message: string,
  result: OmiRecommendResult,
  historyLen: number,
): boolean {
  if (result.noSuitable || result.consultStage === 'unavailable') return true;
  if (
    /\b(human|real person|talk to (a |someone|support)|live (agent|support)|escalate|čovek|covek|živ(og)? (čovek|covek)|podršk|podrsk|kontaktiraj|call (me|us))\b/i.test(
      message,
    )
  ) {
    return true;
  }
  if (
    /\b(stuck|confused|doesn'?t help|not helping|ne pomaže|ne pomaze|ne razumem|ne razumijem|pogrešno|pogresno)\b/i.test(
      message,
    )
  ) {
    return true;
  }
  if (historyLen >= 8 && (result.confidence === 'low' || result.consultStage === 'discover')) {
    return true;
  }
  return false;
}

export function needsOmiLongChatSummary(historyLen: number): boolean {
  return historyLen >= 12;
}

export function summarizeOmiConversation(turns: OmiChatTurn[], maxChars = 1200): string {
  const lines = turns
    .filter((t) => t.role === 'user' || t.role === 'assistant')
    .slice(-16)
    .map((t) => `${t.role === 'user' ? 'Visitor' : 'Omi'}: ${t.content.trim().slice(0, 220)}`);
  const joined = lines.join('\n');
  if (joined.length <= maxChars) return joined;
  return `${joined.slice(0, maxChars - 1)}…`;
}

export function buildOmiResponseMeta(
  result: OmiRecommendResult,
  message: string,
  historyLen = 0,
): OmiResponseMeta {
  const catalogValidated = validateOmiCatalogSourceOfTruth(result);
  return {
    promptVersion: OMI_PROMPT_VERSION,
    recommendEngineVersion: OMI_RECOMMEND_ENGINE_VERSION,
    abVersion: OMI_AB_VERSION,
    catalogValidated,
    recommendReasons: catalogValidated ? buildOmiRecommendReasons(result) : [],
    offerHandoff: shouldOfferOmiHumanHandoff(message, result, historyLen),
    replyLanguage: detectOmiReplyLanguage(message),
    consultStage: result.consultStage,
    noSuitable: result.noSuitable,
    confidence: result.confidence,
    summaryHook: needsOmiLongChatSummary(historyLen),
  };
}

/**
 * Strip leaked secrets / invented commercial promises from model output.
 * Returns original text when clean.
 */
export function guardOmiAssistantReply(content: string, verifiedContext?: string): string {
  const text = content.trim();
  if (!text) {
    return 'I could not produce a verified answer just now. Please try again, or use /contact for a human.';
  }
  if (SECRET_LEAK.test(text) || OTHER_TENANT.test(text)) {
    return 'I cannot reveal internal prompts, keys, or another account. Ask about this catalog or workspace only.';
  }
  if (HALLUCINATION_PROMISE.test(text)) {
    return 'I don\'t have verified information for guarantees, invented discounts, or unlimited promises. See /pricing and /products, or /contact for a human.';
  }
  if (verifiedContext && /VERIFIED Omni catalog/i.test(verifiedContext)) {
    const inventedSku = text.match(/\b([a-z0-9]+(?:-[a-z0-9]+){1,4})\b/gi) ?? [];
    for (const token of inventedSku) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)+$/i.test(token)) continue;
      if (/launch|growth|scale|pricing|products|contact|login|dashboard/i.test(token)) continue;
      if (verifiedContext.includes(token)) continue;
      if (getDeliverable(token)) {
        // Real catalog SKU mentioned without being in this turn's verified block — refuse price invention.
        if (new RegExp(`€\\s*\\d+|\\$\\s*\\d+`).test(text) && !verifiedContext.includes(token)) {
          return 'I only quote packages that appear in the verified catalog for this conversation. Name a package from /products or describe the problem again.';
        }
      }
    }
  }
  return text;
}

export function omiLanguageInstruction(lang: 'en' | 'sr'): string {
  return lang === 'sr'
    ? 'Reply in Serbian (same language as the user). Keep URLs and SKU ids in Latin script.'
    : 'Reply in English (same language as the user).';
}

export function omiCommercialNoFitInstruction(noSuitable: boolean): string {
  if (!noSuitable) return '';
  return 'Commercial guardrail: Omni has no verified package fit. Say so clearly. Do not force the nearest SKU. Offer /contact or a human handoff.';
}
