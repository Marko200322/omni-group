import { query } from '../../../database/connection';

export type RevenueAllocationRow = {
  id: string;
  payment_id: string;
  user_id: string;
  purchase_type: string;
  deliverable_id: string | null;
  plan_slug: string | null;
  payment_provider: string;
  currency: string;
  gross_eur: string;
  payment_fee_eur: string;
  tax_reserve_eur: string;
  resource_reserve_eur: string;
  system_reinvest_eur: string;
  owner_net_eur: string;
  lines: unknown;
  quote_snapshot: unknown;
  metadata: unknown;
  applied_at: string;
  created_at: string;
};

export type InsertRevenueAllocationInput = {
  paymentId: string;
  userId: string;
  purchaseType: string;
  deliverableId?: string | null;
  planSlug?: string | null;
  paymentProvider: string;
  currency: string;
  grossEur: number;
  paymentFeeEur: number;
  taxReserveEur: number;
  resourceReserveEur: number;
  systemReinvestEur: number;
  ownerNetEur: number;
  lines: unknown[];
  quoteSnapshot?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
};

export class RevenueAllocationRepository {
  getByPaymentId(paymentId: string) {
    return query<RevenueAllocationRow>(
      `SELECT * FROM revenue_allocations WHERE payment_id = $1`,
      [paymentId]
    );
  }

  insert(input: InsertRevenueAllocationInput) {
    return query<RevenueAllocationRow>(
      `INSERT INTO revenue_allocations
         (payment_id, user_id, purchase_type, deliverable_id, plan_slug, payment_provider,
          currency, gross_eur, payment_fee_eur, tax_reserve_eur, resource_reserve_eur,
          system_reinvest_eur, owner_net_eur, lines, quote_snapshot, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        input.paymentId,
        input.userId,
        input.purchaseType,
        input.deliverableId ?? null,
        input.planSlug ?? null,
        input.paymentProvider,
        input.currency,
        input.grossEur,
        input.paymentFeeEur,
        input.taxReserveEur,
        input.resourceReserveEur,
        input.systemReinvestEur,
        input.ownerNetEur,
        JSON.stringify(input.lines),
        input.quoteSnapshot ? JSON.stringify(input.quoteSnapshot) : null,
        JSON.stringify(input.metadata ?? {}),
      ]
    );
  }

  getSummary() {
    return query<{
      total_gross: string;
      total_owner_net: string;
      total_system_reinvest: string;
      total_resource_reserve: string;
      total_tax_reserve: string;
      total_payment_fees: string;
      payment_count: string;
    }>(
      `SELECT
         COALESCE(SUM(gross_eur), 0) AS total_gross,
         COALESCE(SUM(owner_net_eur), 0) AS total_owner_net,
         COALESCE(SUM(system_reinvest_eur), 0) AS total_system_reinvest,
         COALESCE(SUM(resource_reserve_eur), 0) AS total_resource_reserve,
         COALESCE(SUM(tax_reserve_eur), 0) AS total_tax_reserve,
         COALESCE(SUM(payment_fee_eur), 0) AS total_payment_fees,
         COUNT(*) AS payment_count
       FROM revenue_allocations`
    );
  }

  listRecent(limit = 20) {
    return query<RevenueAllocationRow>(
      `SELECT * FROM revenue_allocations ORDER BY applied_at DESC LIMIT $1`,
      [limit]
    );
  }
}
