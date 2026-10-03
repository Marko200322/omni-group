/** Platform-reported vs Omni first-party reconciliation. Never invent. */

export type PlatformReport = {
  conversions?: number | null;
  conversionValue?: number | null;
  spend?: number | null;
};

export type OmniFirstParty = {
  leads: number;
  qualifiedLeads: number;
  customers: number;
  revenueCollected: number;
};

export type ReconciliationRow = {
  metric: string;
  platform: number | null;
  omni: number | null;
  delta: number | null;
  status: 'MATCH' | 'DISCREPANCY' | 'PLATFORM_MISSING' | 'OMNI_ONLY';
};

export type ReconciliationResult = {
  kind: 'ACTUAL';
  rows: ReconciliationRow[];
  hasDiscrepancy: boolean;
};

function row(
  metric: string,
  platform: number | null | undefined,
  omni: number | null | undefined
): ReconciliationRow {
  const p = platform === undefined || platform === null || !Number.isFinite(platform) ? null : platform;
  const o = omni === undefined || omni === null || !Number.isFinite(omni) ? null : omni;
  if (p === null && o === null) {
    return { metric, platform: null, omni: null, delta: null, status: 'PLATFORM_MISSING' };
  }
  if (p === null) {
    return { metric, platform: null, omni: o, delta: null, status: 'OMNI_ONLY' };
  }
  if (o === null) {
    return { metric, platform: p, omni: null, delta: null, status: 'PLATFORM_MISSING' };
  }
  const delta = p - o;
  return {
    metric,
    platform: p,
    omni: o,
    delta,
    status: Math.abs(delta) < 0.01 ? 'MATCH' : 'DISCREPANCY',
  };
}

export function reconcileMarketing(
  platform: PlatformReport,
  omni: OmniFirstParty
): ReconciliationResult {
  const rows = [
    row('conversions_vs_customers', platform.conversions, omni.customers),
    row('conversions_vs_leads', platform.conversions, omni.leads),
    row('conversion_value_vs_revenue', platform.conversionValue, omni.revenueCollected),
    row('qualified_leads', null, omni.qualifiedLeads),
    row('spend', platform.spend, platform.spend ?? null),
  ];
  return {
    kind: 'ACTUAL',
    rows,
    hasDiscrepancy: rows.some((r) => r.status === 'DISCREPANCY'),
  };
}
