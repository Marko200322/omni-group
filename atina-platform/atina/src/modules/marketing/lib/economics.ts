/**
 * Marketing economics — pure functions. Divide-by-zero → null (N/A). Never fabricate.
 */

export function safeRatio(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }
  return numerator / denominator;
}

export function computeCpl(spend: number, leads: number): number | null {
  return safeRatio(spend, leads);
}

export function computeCpql(spend: number, qualifiedLeads: number): number | null {
  return safeRatio(spend, qualifiedLeads);
}

export function computeCac(spend: number, customers: number): number | null {
  return safeRatio(spend, customers);
}

export function conversionRate(from: number, to: number): number | null {
  return safeRatio(to, from);
}

export type ContributionInput = {
  revenue: number;
  paymentFees?: number;
  refunds?: number;
  deliveryCosts?: number;
  contractorCosts?: number;
  infraApiCosts?: number;
  otherAttributable?: number;
};

export function computeContribution(input: ContributionInput): number {
  const costs =
    (input.paymentFees ?? 0) +
    (input.refunds ?? 0) +
    (input.deliveryCosts ?? 0) +
    (input.contractorCosts ?? 0) +
    (input.infraApiCosts ?? 0) +
    (input.otherAttributable ?? 0);
  return input.revenue - costs;
}

export function marketingContribution(contribution: number, marketingSpend: number): number {
  return contribution - marketingSpend;
}

export function computeRoi(contribution: number, marketingSpend: number): number | null {
  return safeRatio(contribution - marketingSpend, marketingSpend);
}

export function computeRoas(revenue: number, marketingSpend: number): number | null {
  return safeRatio(revenue, marketingSpend);
}

export type ChannelEconomicsInput = {
  spend: number;
  leads: number;
  qualifiedLeads: number;
  opportunities: number;
  offers: number;
  customers: number;
  revenue: number;
  paymentFees?: number;
  refunds?: number;
  deliveryCosts?: number;
};

export type ChannelEconomics = {
  cpl: number | null;
  cpql: number | null;
  cac: number | null;
  leadToQualified: number | null;
  qualifiedToOpportunity: number | null;
  opportunityToOffer: number | null;
  offerToCustomer: number | null;
  leadToCustomer: number | null;
  contribution: number;
  marketingContribution: number;
  roi: number | null;
  roas: number | null;
};

export function computeChannelEconomics(input: ChannelEconomicsInput): ChannelEconomics {
  const contribution = computeContribution({
    revenue: input.revenue,
    paymentFees: input.paymentFees,
    refunds: input.refunds,
    deliveryCosts: input.deliveryCosts,
  });
  const mktContrib = marketingContribution(contribution, input.spend);
  return {
    cpl: computeCpl(input.spend, input.leads),
    cpql: computeCpql(input.spend, input.qualifiedLeads),
    cac: computeCac(input.spend, input.customers),
    leadToQualified: conversionRate(input.leads, input.qualifiedLeads),
    qualifiedToOpportunity: conversionRate(input.qualifiedLeads, input.opportunities),
    opportunityToOffer: conversionRate(input.opportunities, input.offers),
    offerToCustomer: conversionRate(input.offers, input.customers),
    leadToCustomer: conversionRate(input.leads, input.customers),
    contribution,
    marketingContribution: mktContrib,
    roi: computeRoi(contribution, input.spend),
    roas: computeRoas(input.revenue, input.spend),
  };
}
