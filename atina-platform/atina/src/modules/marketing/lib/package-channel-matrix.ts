/**
 * Package × channel matrix — OBSERVED from attributions + payments. Never invent.
 */
export type PackageChannelRow = {
  packageSku: string;
  channelCode: string;
  customers: number;
  revenueEur: number;
  spendEur: number | null;
  cac: number | null;
  contributionEur: number | null;
  kind: 'ACTUAL' | 'UNAVAILABLE';
};

export async function buildPackageChannelMatrix(): Promise<{
  kind: 'ACTUAL' | 'UNAVAILABLE';
  rows: PackageChannelRow[];
  note: string;
}> {
  try {
    const { query } = await import('../../../database/connection');

    // Prefer upserted stats table when populated
    const { rows: stats } = await query<{
      package_sku: string;
      channel_code: string;
      customers: string;
      revenue_cents: string;
      spend_cents: string;
    }>(
      `SELECT package_sku, channel_code, customers::text, revenue_cents::text, spend_cents::text
       FROM marketing_package_channel_stats
       ORDER BY revenue_cents DESC
       LIMIT 200`
    ).catch(() => ({ rows: [] as Array<{
      package_sku: string;
      channel_code: string;
      customers: string;
      revenue_cents: string;
      spend_cents: string;
    }> }));

    if (stats.length) {
      const rows: PackageChannelRow[] = stats.map((s) => {
        const customers = Number(s.customers) || 0;
        const revenueEur = (Number(s.revenue_cents) || 0) / 100;
        const spendEur = (Number(s.spend_cents) || 0) / 100;
        const cac = customers > 0 && spendEur > 0 ? spendEur / customers : null;
        return {
          packageSku: s.package_sku,
          channelCode: s.channel_code,
          customers,
          revenueEur,
          spendEur: spendEur > 0 ? spendEur : null,
          cac,
          contributionEur: revenueEur - spendEur,
          kind: 'ACTUAL',
        };
      });
      return {
        kind: 'ACTUAL',
        rows,
        note: 'From marketing_package_channel_stats (payment attribution). Spend may be N/A until campaign↔SKU mapped.',
      };
    }

    // Fallback: derive from attribution evidence JSON
    const { rows: attr } = await query<{
      channel_code: string | null;
      package_sku: string | null;
      customers: string;
      revenue: string;
    }>(
      `SELECT
         channel_code,
         evidence->>'packageSku' AS package_sku,
         COUNT(*)::text AS customers,
         COALESCE(SUM((evidence->>'amountEur')::numeric),0)::text AS revenue
       FROM marketing_attributions
       WHERE labeled_uncertain = FALSE
         AND evidence->>'packageSku' IS NOT NULL
         AND evidence->>'packageSku' <> ''
       GROUP BY channel_code, evidence->>'packageSku'
       ORDER BY revenue DESC
       LIMIT 200`
    ).catch(() => ({ rows: [] as Array<{
      channel_code: string | null;
      package_sku: string | null;
      customers: string;
      revenue: string;
    }> }));

    if (!attr.length) {
      return {
        kind: 'UNAVAILABLE',
        rows: [],
        note: 'No package×channel rows yet — needs completed payments with CRM touchpoints/UTM.',
      };
    }

    return {
      kind: 'ACTUAL',
      rows: attr.map((a) => {
        const customers = Number(a.customers) || 0;
        const revenueEur = Number(a.revenue) || 0;
        return {
          packageSku: a.package_sku ?? 'unknown',
          channelCode: a.channel_code ?? 'unknown',
          customers,
          revenueEur,
          spendEur: null,
          cac: null,
          contributionEur: revenueEur,
          kind: 'ACTUAL' as const,
        };
      }),
      note: 'Derived from certain attributions. Channel spend not allocated to SKU → spend/CAC N/A.',
    };
  } catch {
    return {
      kind: 'UNAVAILABLE',
      rows: [],
      note: 'package_channel_matrix_unavailable',
    };
  }
}
