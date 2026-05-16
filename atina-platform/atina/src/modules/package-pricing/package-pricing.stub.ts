export type PackagePricingMode = 'list-tiers' | 'adjust-price' | 'bundle';

export type PricingMetrics = {
  tiers_count?: unknown;
  base_price?: unknown;
  last_adjustment_pct?: unknown;
  bundles_proposed?: unknown;
};

function num(m: PricingMetrics, key: keyof PricingMetrics): number {
  return Number(m[key] ?? 0);
}

export type PackagePricingRunOk = {
  outputPayload: Record<string, unknown>;
  revenueDelta: number;
  metricsPatch: Record<string, unknown>;
};

export type PackagePricingRunErr = {
  error: {
    code: 'VALIDATION_ERROR';
    message: string;
  };
};

/** Pure pricing run preview used by HTTP handler and unit tests (no DB). */
export function computePackagePricingRun(
  mode: PackagePricingMode,
  metrics: PricingMetrics,
  input: Record<string, unknown>,
  workspaceId: string
): PackagePricingRunOk | PackagePricingRunErr {
  const tiersCount = num(metrics, 'tiers_count');
  const basePrice = num(metrics, 'base_price') || 99;

  if (mode === 'adjust-price' && tiersCount < 1) {
    return {
      error: {
        code: 'VALIDATION_ERROR',
        message: "Mode 'adjust-price' requires at least one pricing pass — run 'list-tiers' first",
      },
    };
  }
  if (mode === 'bundle' && tiersCount < 2) {
    return {
      error: {
        code: 'VALIDATION_ERROR',
        message:
          "Mode 'bundle' requires multiple tiers — run 'list-tiers' until at least two tiers are modeled",
      },
    };
  }

  if (mode === 'list-tiers') {
    const tiers = [
      { id: 'starter', unit_price: Math.round(basePrice * 100) / 100 },
      { id: 'growth', unit_price: Math.round(basePrice * 1.55 * 100) / 100 },
      { id: 'scale', unit_price: Math.round(basePrice * 2.4 * 100) / 100 },
    ];
    return {
      outputPayload: {
        mode,
        result: { tiers, currency: 'USD' },
      },
      revenueDelta: 45,
      metricsPatch: {
        tiers_count: 3,
        base_price: basePrice,
        last_mode: mode,
      },
    };
  }

  if (mode === 'adjust-price') {
    const rawAdj = (input as { adjustmentPct?: unknown })?.adjustmentPct;
    const adjustmentPct =
      typeof rawAdj === 'number' && !Number.isNaN(rawAdj)
        ? Math.min(25, Math.max(-15, rawAdj))
        : 5;
    return {
      outputPayload: {
        mode,
        result: {
          adjustment_pct: adjustmentPct,
          preview_total: Math.round(basePrice * (1 + adjustmentPct / 100) * 100) / 100,
        },
      },
      revenueDelta: 88,
      metricsPatch: {
        last_adjustment_pct: adjustmentPct,
        last_mode: mode,
      },
    };
  }

  return {
    outputPayload: {
      mode,
      result: {
        bundle_id: `bundle_${workspaceId.slice(0, 8)}`,
        discount_pct: 12,
        included_tiers: ['starter', 'growth'],
      },
    },
    revenueDelta: 160,
    metricsPatch: {
      bundles_proposed: num(metrics, 'bundles_proposed') + 1,
      last_mode: mode,
    },
  };
}
