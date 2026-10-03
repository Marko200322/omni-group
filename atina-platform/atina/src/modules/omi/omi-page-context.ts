import { getDeliverable } from '../billing/lib/deliverable-catalog';
import { resolveIndustryCategory } from './omi-clusters';
import {
  buildOmiResponseMeta,
  omiCommercialNoFitInstruction,
  omiLanguageInstruction,
  type OmiResponseMeta,
} from './omi-extras';
import { formatOmiVerifiedBlock, recommendOmiProducts, type OmiRecommendResult } from './omi-recommend';

export type OmiPageContext = {
  path?: string;
  productId?: string;
  industryCategory?: string;
};

export type OmiConsultPacket = {
  context: string;
  result: OmiRecommendResult;
  meta: OmiResponseMeta;
};

const SAFE_PATH = /^\/[A-Za-z0-9/_-]{0,120}$/;

/** Portal/public page context — never accepts customerId, tenantId, or forged secrets. */
export function sanitizeOmiPageContext(raw: unknown): OmiPageContext {
  if (!raw || typeof raw !== 'object') return {};
  const o = raw as Record<string, unknown>;
  // Explicitly ignore isolation-sensitive keys even if present.
  void o.customerId;
  void o.tenantId;
  void o.orgId;
  void o.userId;
  const path = typeof o.path === 'string' && SAFE_PATH.test(o.path) ? o.path : undefined;
  const productId =
    typeof o.productId === 'string' && getDeliverable(o.productId) ? o.productId.trim() : undefined;
  const industryRaw =
    typeof o.industryCategory === 'string' && /^[a-z0-9_-]{1,40}$/i.test(o.industryCategory)
      ? o.industryCategory
      : undefined;
  const industryCategory = industryRaw ? resolveIndustryCategory(industryRaw) : undefined;
  return { path, productId, industryCategory };
}

export function buildOmiConsultPacket(
  message: string,
  page?: OmiPageContext,
  priorUserMessages: string[] = [],
  historyLen = 0,
): OmiConsultPacket {
  const prior = priorUserMessages
    .map((row) => row.trim())
    .filter(Boolean)
    .slice(-8);
  let result = recommendOmiProducts({
    message,
    priorUserMessages: prior,
    productId: page?.productId,
    industryCategory: page?.industryCategory,
    pagePath: page?.path,
  });
  let meta = buildOmiResponseMeta(result, message, historyLen);
  if (!meta.catalogValidated) {
    result = {
      ...result,
      products: [],
      noSuitable: true,
      confidence: 'low',
      consultStage: 'unavailable',
    };
    meta = buildOmiResponseMeta(result, message, historyLen);
  }
  const pageLine = page?.path ? `Current public page: ${page.path}.` : '';
  const context = [
    pageLine,
    formatOmiVerifiedBlock(result),
    omiLanguageInstruction(meta.replyLanguage),
    omiCommercialNoFitInstruction(result.noSuitable),
  ]
    .filter(Boolean)
    .join('\n');
  return { context, result, meta };
}

export function buildOmiVerifiedContext(
  message: string,
  page?: OmiPageContext,
  priorUserMessages: string[] = [],
): string {
  return buildOmiConsultPacket(message, page, priorUserMessages).context;
}
