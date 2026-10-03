/** Marketing health indicators — explainable, not a single AI score. */

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unavailable';

export type HealthDimension = {
  name: string;
  status: HealthStatus;
  reasons: string[];
};

export type MarketingHealth = {
  dimensions: HealthDimension[];
  overall: HealthStatus;
  kind: 'ACTUAL';
};

export type HealthInput = {
  hasTracking: boolean;
  touchpointCount: number;
  spendEntries: number;
  channelCount: number;
  openAlerts: number;
  hasDiscrepancy: boolean;
  budgetConfigured: boolean;
  experimentCount: number;
  leads: number;
  customers: number;
};

export function computeMarketingHealth(input: HealthInput): MarketingHealth {
  const dimensions: HealthDimension[] = [
    {
      name: 'Tracking Health',
      status: input.hasTracking && input.touchpointCount > 0 ? 'healthy' : input.hasTracking ? 'warning' : 'unavailable',
      reasons: input.touchpointCount > 0
        ? [`${input.touchpointCount} touchpoints recorded`]
        : ['No touchpoints yet — UTM persistence may be incomplete'],
    },
    {
      name: 'Data Health',
      status: input.hasDiscrepancy ? 'warning' : input.spendEntries > 0 ? 'healthy' : 'unavailable',
      reasons: input.hasDiscrepancy
        ? ['Platform vs Omni reconciliation has discrepancies']
        : input.spendEntries > 0
          ? [`${input.spendEntries} spend entries`]
          : ['No spend data ingested'],
    },
    {
      name: 'Acquisition Health',
      status: input.leads > 0 ? 'healthy' : 'warning',
      reasons: input.leads > 0 ? [`${input.leads} leads observed`] : ['No leads in window'],
    },
    {
      name: 'Conversion Health',
      status: input.customers > 0 ? 'healthy' : input.leads > 0 ? 'warning' : 'unavailable',
      reasons: input.customers > 0
        ? [`${input.customers} customers`]
        : ['No customers attributed in window'],
    },
    {
      name: 'Economics Health',
      status: input.spendEntries > 0 && input.customers > 0 ? 'healthy' : 'warning',
      reasons: ['Economics require ACTUAL spend + collected revenue'],
    },
    {
      name: 'Channel Health',
      status: input.channelCount > 0 ? 'healthy' : 'unavailable',
      reasons: [`${input.channelCount} channels configured`],
    },
    {
      name: 'Budget Health',
      status: input.budgetConfigured ? 'healthy' : 'warning',
      reasons: input.budgetConfigured ? ['Budget period configured'] : ['No marketing budget period'],
    },
    {
      name: 'Experiment Health',
      status: input.experimentCount > 0 ? 'healthy' : 'warning',
      reasons: input.experimentCount > 0
        ? [`${input.experimentCount} experiments`]
        : ['No experiments — recommendations stay low confidence'],
    },
  ];

  if (input.openAlerts > 0) {
    dimensions.push({
      name: 'Alerts',
      status: input.openAlerts > 3 ? 'critical' : 'warning',
      reasons: [`${input.openAlerts} open marketing alerts`],
    });
  }

  const order: HealthStatus[] = ['critical', 'unavailable', 'warning', 'healthy'];
  const overall = order.find((s) => dimensions.some((d) => d.status === s)) ?? 'unavailable';

  return { dimensions, overall, kind: 'ACTUAL' };
}
