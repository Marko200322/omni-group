/**
 * Budget allocation optimizer — recommendations only. Never auto-spend.
 * Never allocate 100% to one channel. CORE / TEST / RESERVE structure.
 */
import type { BudgetBucket } from './constants';

export type ChannelPerf = {
  channelCode: string;
  spend: number;
  customers: number;
  contribution: number;
  cac: number | null;
  confidence: 'high' | 'medium' | 'low';
};

export type AllocationRecommendation = {
  channelCode: string;
  bucket: BudgetBucket;
  amountEur: number;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  risk: 'low' | 'medium' | 'high';
  kind: 'RECOMMENDATION';
};

export type NextEurPlan = {
  amountEur: number;
  allocations: AllocationRecommendation[];
  reserveEur: number;
  note: string;
  kind: 'RECOMMENDATION';
};

function score(ch: ChannelPerf): number {
  if (ch.customers <= 0) return ch.contribution > 0 ? 1 : 0;
  const cacPenalty = ch.cac && ch.cac > 0 ? 1 / ch.cac : 0.1;
  const confBoost = ch.confidence === 'high' ? 1.2 : ch.confidence === 'medium' ? 1 : 0.7;
  return Math.max(0, ch.contribution) * cacPenalty * confBoost + ch.customers;
}

/** Recommend where the next €N should go — never 100% one channel. */
export function recommendNextEur(
  channels: ChannelPerf[],
  amountEur = 100
): NextEurPlan {
  const active = channels.filter((c) => c.channelCode);
  if (active.length === 0) {
    return {
      amountEur,
      allocations: [],
      reserveEur: amountEur,
      note: 'No channel performance data — hold in RESERVE',
      kind: 'RECOMMENDATION',
    };
  }

  const ranked = [...active].sort((a, b) => score(b) - score(a));
  const coreShare = 0.6;
  const testShare = 0.25;
  const reserveShare = 0.15;

  const allocations: AllocationRecommendation[] = [];
  const coreChannel = ranked[0];
  const testChannel = ranked[1] ?? ranked[0];

  allocations.push({
    channelCode: coreChannel.channelCode,
    bucket: 'CORE',
    amountEur: Math.round(amountEur * coreShare * 100) / 100,
    reason: 'Best observed contribution/CAC among channels with data',
    confidence: coreChannel.confidence,
    risk: coreChannel.confidence === 'low' ? 'high' : 'medium',
    kind: 'RECOMMENDATION',
  });

  if (testChannel.channelCode !== coreChannel.channelCode || ranked.length === 1) {
    allocations.push({
      channelCode: testChannel.channelCode === coreChannel.channelCode ? 'seo' : testChannel.channelCode,
      bucket: 'TEST',
      amountEur: Math.round(amountEur * testShare * 100) / 100,
      reason: 'Maintain TEST diversification — never 100% single channel',
      confidence: 'low',
      risk: 'medium',
      kind: 'RECOMMENDATION',
    });
  }

  const allocated = allocations.reduce((s, a) => s + a.amountEur, 0);
  const reserveEur = Math.round((amountEur - allocated || amountEur * reserveShare) * 100) / 100;

  return {
    amountEur,
    allocations,
    reserveEur: Math.max(reserveEur, Math.round(amountEur * reserveShare * 100) / 100),
    note: 'Recommendation only — no automatic spend. Requires admin / Reinvestment policy.',
    kind: 'RECOMMENDATION',
  };
}
