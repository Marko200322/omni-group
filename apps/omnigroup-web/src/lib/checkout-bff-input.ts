import type { BillingCurrency } from './saas-plans';

export type PlanCheckoutInput = {
  planSlug: 'starter' | 'pro' | 'enterprise';
  billingCycle: 'monthly' | 'yearly';
  currency: BillingCurrency;
  industryCategory?: string;
  buyerCompany?: string;
  buyerVatId?: string;
  buyerBillingAddress?: string;
};

type UnknownBody = Record<string, unknown>;

function optionalText(value: unknown, max: number): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new Error('invalid_billing_details');
  const normalized = value.trim();
  if (!normalized || normalized.length > max) throw new Error('invalid_billing_details');
  return normalized;
}

export function parsePlanCheckoutInput(body: UnknownBody): PlanCheckoutInput {
  const planSlug = String(body.planSlug ?? '');
  if (!['starter', 'pro', 'enterprise'].includes(planSlug)) {
    throw new Error('invalid_plan');
  }

  const industryCategory =
    typeof body.industryCategory === 'string' && /^[a-z0-9_-]{2,64}$/.test(body.industryCategory)
      ? body.industryCategory
      : undefined;
  if (body.industryCategory !== undefined && !industryCategory) {
    throw new Error('invalid_industry_category');
  }

  const currency = String(body.currency ?? 'EUR').toUpperCase();
  if (currency !== 'EUR' && currency !== 'USD') throw new Error('invalid_currency');

  const buyerCompany = optionalText(body.buyerCompany, 120);
  const buyerVatId = optionalText(body.buyerVatId, 64);
  const buyerBillingAddress = optionalText(body.buyerBillingAddress, 240);

  return {
    planSlug: planSlug as PlanCheckoutInput['planSlug'],
    billingCycle: body.billingCycle === 'yearly' ? 'yearly' : 'monthly',
    currency,
    ...(industryCategory ? { industryCategory } : {}),
    ...(buyerCompany ? { buyerCompany } : {}),
    ...(buyerVatId ? { buyerVatId } : {}),
    ...(buyerBillingAddress ? { buyerBillingAddress } : {}),
  };
}

