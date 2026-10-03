/**
 * Read-only bridge: Marketing → Reinvestment.
 * Marketing NEVER authorizes spend.
 */

export type MarketingReinvestmentSignal = {
  kind: 'ACTUAL' | 'UNAVAILABLE';
  asOf: string;
  totalSpendCents: number | null;
  customers: number | null;
  contributionEur: number | null;
  topChannel: string | null;
  openRecommendations: number;
  reinvestmentReadyOpportunities: number;
  notes: string[];
};

export async function fetchMarketingSignalsForReinvestment(): Promise<MarketingReinvestmentSignal> {
  const asOf = new Date().toISOString();
  try {
    const { MarketingService } = await import('../service/marketing.service');
    const svc = new MarketingService();
    const overview = await svc.getOverview();
    return {
      kind: overview.kind === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'ACTUAL',
      asOf,
      totalSpendCents: overview.totals.spendCents ?? null,
      customers: overview.totals.customers ?? null,
      contributionEur: overview.totals.contributionEur ?? null,
      topChannel: overview.topChannelCode ?? null,
      openRecommendations: overview.openRecommendations ?? 0,
      reinvestmentReadyOpportunities: overview.reinvestmentReadyOpportunities ?? 0,
      notes: ['read_only', 'no_spend_authority', 'marketing_opportunity_only'],
    };
  } catch (err) {
    return {
      kind: 'UNAVAILABLE',
      asOf,
      totalSpendCents: null,
      customers: null,
      contributionEur: null,
      topChannel: null,
      openRecommendations: 0,
      reinvestmentReadyOpportunities: 0,
      notes: [
        'marketing_unavailable',
        err instanceof Error ? err.message.slice(0, 120) : 'unknown_error',
      ],
    };
  }
}
