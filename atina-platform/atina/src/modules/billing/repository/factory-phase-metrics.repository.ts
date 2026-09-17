import { query } from '../../../database/connection';
import type { FactoryRevenueMetrics } from '../lib/factory-phase-effective';

/**
 * Aggregate payment / fulfillment metrics for factory phase auto gates.
 */
export class FactoryPhaseMetricsRepository {
  async loadMetrics(): Promise<FactoryRevenueMetrics> {
    const empty: FactoryRevenueMetrics = {
      confirmedPaymentCount: 0,
      confirmedRevenueEur: 0,
      fulfilledPackageCount: 0,
      estimatedMrrEur: 0,
    };

    try {
      const { rows: payRows } = await query<{ count: string; revenue: string }>(
        `SELECT
           COUNT(*)::text AS count,
           COALESCE(SUM(amount), 0)::text AS revenue
         FROM payments
         WHERE status = 'completed'`,
      );

      const { rows: fulfillRows } = await query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM deliverable_fulfillment_jobs
         WHERE status = 'completed'
           AND (review_status = 'approved' OR released_at IS NOT NULL OR review_status = 'pending_review')`,
      );

      const { rows: mrrRows } = await query<{ mrr: string }>(
        `SELECT COALESCE(SUM(amount), 0)::text AS mrr
         FROM subscriptions
         WHERE status = 'active'`,
      );

      return {
        confirmedPaymentCount: Number.parseInt(payRows[0]?.count ?? '0', 10) || 0,
        confirmedRevenueEur: Number.parseFloat(payRows[0]?.revenue ?? '0') || 0,
        fulfilledPackageCount: Number.parseInt(fulfillRows[0]?.count ?? '0', 10) || 0,
        estimatedMrrEur: Number.parseFloat(mrrRows[0]?.mrr ?? '0') || 0,
      };
    } catch {
      return empty;
    }
  }
}
