/**
 * Splits confirmed client payments into: payment fee, tax reserve, resource wallets,
 * system development reinvest, and owner net — with per-line reasons.
 */

import { config } from '../../../config';
import { AutonomyBudgetService } from '../../autonomy-loop/service/autonomy-budget.service';
import type { DeliverableBilling } from '../lib/deliverable-catalog';
import { getDeliverable } from '../lib/deliverable-catalog';
import {
  calculateDeliverableQuote,
  type PaymentProviderId,
  type QuoteBreakdown,
} from '../lib/dynamic-pricing.engine';
import { ResourceProcurementRepository } from '../../resource-procurement/repository/resource-procurement.repository';
import { RevenueAllocationRepository } from '../repository/revenue-allocation.repository';
import logger from '../../../utils/logger';

export type AllocationBucket =
  | 'payment_fee'
  | 'tax_reserve'
  | 'resource_wallet'
  | 'system_reinvest'
  | 'owner_net';

export type RevenueAllocationLine = {
  bucket: AllocationBucket;
  target?: string;
  label: string;
  labelSr: string;
  amountEur: number;
  reason: string;
};

export type RevenueAllocationResult = {
  paymentId: string;
  grossEur: number;
  currency: string;
  paymentFeeEur: number;
  taxReserveEur: number;
  resourceReserveEur: number;
  systemReinvestEur: number;
  ownerNetEur: number;
  lines: RevenueAllocationLine[];
  quoteSnapshot: QuoteBreakdown | null;
  alreadyApplied: boolean;
};

export type AllocatePaymentInput = {
  paymentId: string;
  userId: string;
  grossEur: number;
  currency: string;
  paymentProvider: PaymentProviderId;
  purchaseType: 'deliverable' | 'platform_plan';
  deliverableId?: string | null;
  planSlug?: string | null;
  billingCycle?: DeliverableBilling | 'monthly' | 'yearly';
  industryCategory?: string | null;
  verticalSlug?: string | null;
};

function roundEur(n: number): number {
  return Math.round(n * 100) / 100;
}

function getProviderFees(provider: PaymentProviderId) {
  const p = config.pricing.paymentProviders[provider];
  return { feeRate: p.feeRate, fixedEur: p.fixedEur };
}

/** Payment provider fee on gross received amount. */
export function computePaymentFeeEur(grossEur: number, provider: PaymentProviderId): number {
  const { feeRate, fixedEur } = getProviderFees(provider);
  if (feeRate <= 0 && fixedEur <= 0) return 0;
  return roundEur(grossEur * feeRate + fixedEur);
}

/** Map deliverable resource profile → provider wallet credits (EUR + USD). */
export function splitResourceWalletsEur(
  resources: QuoteBreakdown['resources'],
  billing: DeliverableBilling,
): Array<{ providerId: string; amountEur: number; amountUsd: number; reason: string }> {
  const c = config.pricing.resourceUnitCosts;
  const eurUsd = config.pricing.eurUsdRate;
  const complexityMult = 0.8 + resources.deployComplexity * 0.12;

  let billingMult = 1;
  if (billing === 'yearly') {
    billingMult = 12 * config.pricing.yearlyInfraDiscount;
  }

  const aiUsd = resources.aiTokensK * c.aiUsdPer1kTokens * complexityMult * billingMult;
  const scraperUsd = resources.scraperRuns * c.scraperUsdPerRun * complexityMult * billingMult;
  const infraUsd =
    (resources.infraHours * c.infraUsdPerHour + resources.storageGbMonth * c.storageUsdPerGbMonth) *
    complexityMult *
    billingMult;

  const splits: Array<{ providerId: string; usd: number; reason: string }> = [
    {
      providerId: 'openrouter',
      usd: aiUsd + infraUsd * 0.55,
      reason: 'AI tokens + hosting infra for delivery',
    },
    {
      providerId: 'scraper',
      usd: scraperUsd,
      reason: 'Apify/scraper runs budgeted for this order',
    },
    {
      providerId: 'comms',
      usd: infraUsd * 0.45,
      reason: 'Email/SMS/comms reserve for client delivery',
    },
  ];

  return splits
    .filter((s) => s.usd > 0)
    .map((s) => ({
      providerId: s.providerId,
      amountEur: roundEur(s.usd * eurUsd),
      amountUsd: roundEur(s.usd),
      reason: s.reason,
    }));
}

export function buildAllocationPlan(
  input: AllocatePaymentInput,
): Omit<RevenueAllocationResult, 'paymentId' | 'alreadyApplied'> {
  const taxRate = config.revenueAllocation.ownerTaxReserveRate;
  const reinvestRate = config.revenueAllocation.systemReinvestRate;
  const grossEur = roundEur(input.grossEur);
  const paymentFeeEur = computePaymentFeeEur(grossEur, input.paymentProvider);
  const afterFee = roundEur(Math.max(0, grossEur - paymentFeeEur));
  const taxReserveEur = roundEur(afterFee * taxRate);
  const afterTax = roundEur(Math.max(0, afterFee - taxReserveEur));

  let quoteSnapshot: QuoteBreakdown | null = null;
  let resourceReserveEur = 0;
  const walletSplits: Array<{ providerId: string; amountEur: number; amountUsd: number; reason: string }> = [];

  if (input.purchaseType === 'deliverable' && input.deliverableId) {
    const deliverable = getDeliverable(input.deliverableId);
    const billing = (input.billingCycle ?? deliverable?.billing ?? 'one_time') as DeliverableBilling;
    quoteSnapshot = calculateDeliverableQuote({
      deliverableId: input.deliverableId,
      industryCategory: input.industryCategory,
      verticalSlug: input.verticalSlug,
      billingCycle: billing,
      paymentProvider: input.paymentProvider,
    });
    resourceReserveEur = roundEur(Math.min(quoteSnapshot.resourceCostEur, afterTax));
    if (deliverable) {
      walletSplits.push(...splitResourceWalletsEur(deliverable.resources, billing));
      const walletTotal = roundEur(walletSplits.reduce((s, w) => s + w.amountEur, 0));
      if (walletTotal > resourceReserveEur && resourceReserveEur > 0 && walletTotal > 0) {
        const scale = resourceReserveEur / walletTotal;
        for (const w of walletSplits) {
          w.amountEur = roundEur(w.amountEur * scale);
          w.amountUsd = roundEur(w.amountUsd * scale);
        }
      }
    }
  } else {
    resourceReserveEur = roundEur(afterTax * config.revenueAllocation.planResourceReservePct);
    walletSplits.push({
      providerId: 'openrouter',
      amountEur: roundEur(resourceReserveEur * 0.6),
      amountUsd: roundEur((resourceReserveEur * 0.6) / config.pricing.eurUsdRate),
      reason: 'Platform plan — AI/infra reserve',
    });
    walletSplits.push({
      providerId: 'comms',
      amountEur: roundEur(resourceReserveEur * 0.4),
      amountUsd: roundEur((resourceReserveEur * 0.4) / config.pricing.eurUsdRate),
      reason: 'Platform plan — comms/hosting reserve',
    });
  }

  const operatingProfitEur = roundEur(Math.max(0, afterTax - resourceReserveEur));
  const systemReinvestEur = roundEur(operatingProfitEur * reinvestRate);
  const ownerNetEur = roundEur(Math.max(0, operatingProfitEur - systemReinvestEur));

  const lines: RevenueAllocationLine[] = [];

  if (paymentFeeEur > 0) {
    lines.push({
      bucket: 'payment_fee',
      label: 'Payment provider fee',
      labelSr: 'Provizija platnog provajdera',
      amountEur: paymentFeeEur,
      reason: `Commission for ${input.paymentProvider} on gross €${grossEur}`,
    });
  }

  if (taxReserveEur > 0) {
    lines.push({
      bucket: 'tax_reserve',
      label: 'Tax reserve',
      labelSr: 'Rezerva za porez',
      amountEur: taxReserveEur,
      reason: `${Math.round(taxRate * 100)}% provision on net after fees — set OWNER_TAX_RESERVE_RATE when firma is active`,
    });
  }

  for (const w of walletSplits) {
    if (w.amountEur <= 0) continue;
    lines.push({
      bucket: 'resource_wallet',
      target: w.providerId,
      label: `Resource wallet: ${w.providerId}`,
      labelSr: `Resursi: ${w.providerId}`,
      amountEur: w.amountEur,
      reason: w.reason,
    });
  }

  if (systemReinvestEur > 0) {
    lines.push({
      bucket: 'system_reinvest',
      target: 'autonomy_budget',
      label: 'System development reinvest',
      labelSr: 'Reinvesticija u razvoj sistema',
      amountEur: systemReinvestEur,
      reason: `${Math.round(reinvestRate * 100)}% of operating profit → autonomy budget (evolution, verticals, AI)`,
    });
  }

  if (ownerNetEur > 0) {
    lines.push({
      bucket: 'owner_net',
      target: 'owner',
      label: 'Owner net profit',
      labelSr: 'Tvoj čist deo',
      amountEur: ownerNetEur,
      reason: 'After resources, tax reserve, fees, and system reinvest — yours to keep or distribute',
    });
  }

  return {
    grossEur,
    currency: input.currency,
    paymentFeeEur,
    taxReserveEur,
    resourceReserveEur,
    systemReinvestEur,
    ownerNetEur,
    lines,
    quoteSnapshot,
  };
}

export class RevenueAllocationService {
  private readonly repo = new RevenueAllocationRepository();
  private readonly wallets = new ResourceProcurementRepository();
  private readonly budget = new AutonomyBudgetService();

  async getByPaymentId(paymentId: string) {
    const { rows } = await this.repo.getByPaymentId(paymentId);
    return rows[0] ?? null;
  }

  async getSummary() {
    const [{ rows: summary }, { rows: recent }] = await Promise.all([
      this.repo.getSummary(),
      this.repo.listRecent(15),
    ]);
    const s = summary[0];
    return {
      totals: {
        grossEur: parseFloat(s?.total_gross ?? '0'),
        ownerNetEur: parseFloat(s?.total_owner_net ?? '0'),
        systemReinvestEur: parseFloat(s?.total_system_reinvest ?? '0'),
        resourceReserveEur: parseFloat(s?.total_resource_reserve ?? '0'),
        taxReserveEur: parseFloat(s?.total_tax_reserve ?? '0'),
        paymentFeeEur: parseFloat(s?.total_payment_fees ?? '0'),
        paymentCount: parseInt(s?.payment_count ?? '0', 10),
      },
      config: {
        ownerTaxReserveRate: config.revenueAllocation.ownerTaxReserveRate,
        systemReinvestRate: config.revenueAllocation.systemReinvestRate,
      },
      recent,
    };
  }

  /** Idempotent: applies wallets + autonomy budget once per payment. */
  async allocateConfirmedPayment(input: AllocatePaymentInput): Promise<RevenueAllocationResult> {
    const existing = await this.getByPaymentId(input.paymentId);
    if (existing) {
      return {
        paymentId: input.paymentId,
        grossEur: parseFloat(existing.gross_eur),
        currency: existing.currency,
        paymentFeeEur: parseFloat(existing.payment_fee_eur),
        taxReserveEur: parseFloat(existing.tax_reserve_eur),
        resourceReserveEur: parseFloat(existing.resource_reserve_eur),
        systemReinvestEur: parseFloat(existing.system_reinvest_eur),
        ownerNetEur: parseFloat(existing.owner_net_eur),
        lines: (existing.lines as RevenueAllocationLine[]) ?? [],
        quoteSnapshot: (existing.quote_snapshot as QuoteBreakdown | null) ?? null,
        alreadyApplied: true,
      };
    }

    const plan = buildAllocationPlan(input);

    for (const line of plan.lines) {
      if (line.bucket !== 'resource_wallet' || !line.target || line.amountEur <= 0) continue;
      await this.wallets.creditWallet(
        line.target,
        line.amountEur,
        roundEur(line.amountEur / config.pricing.eurUsdRate),
      );
    }

    if (plan.systemReinvestEur > 0) {
      const usd = roundEur(plan.systemReinvestEur / config.pricing.eurUsdRate);
      await this.budget.creditTopup(usd, 'client_payment_reinvest', {
        metadata: {
          paymentId: input.paymentId,
          grossEur: plan.grossEur,
          reinvestEur: plan.systemReinvestEur,
          reinvestRate: config.revenueAllocation.systemReinvestRate,
        },
      });
    }

    await this.repo.insert({
      paymentId: input.paymentId,
      userId: input.userId,
      purchaseType: input.purchaseType,
      deliverableId: input.deliverableId,
      planSlug: input.planSlug,
      paymentProvider: input.paymentProvider,
      currency: input.currency,
      grossEur: plan.grossEur,
      paymentFeeEur: plan.paymentFeeEur,
      taxReserveEur: plan.taxReserveEur,
      resourceReserveEur: plan.resourceReserveEur,
      systemReinvestEur: plan.systemReinvestEur,
      ownerNetEur: plan.ownerNetEur,
      lines: plan.lines,
      quoteSnapshot: plan.quoteSnapshot as unknown as Record<string, unknown> | null,
      metadata: {
        industryCategory: input.industryCategory ?? null,
        verticalSlug: input.verticalSlug ?? null,
      },
    });

    logger.info('Revenue allocation applied', {
      paymentId: input.paymentId,
      grossEur: plan.grossEur,
      ownerNetEur: plan.ownerNetEur,
      systemReinvestEur: plan.systemReinvestEur,
      resourceReserveEur: plan.resourceReserveEur,
    });

    return { paymentId: input.paymentId, ...plan, alreadyApplied: false };
  }
}
