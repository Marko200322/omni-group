/**
 * Read-only financial observation adapters.
 * Source of truth = deterministic DB aggregates (never LLM).
 */
import { query } from '../../../database/connection';

export type RevenueObservation = {
  currency: string;
  paymentCount: number;
  grossCents: number;
  paymentFeeCents: number;
  taxReserveCents: number;
  resourceReserveCents: number;
  systemReinvestCents: number;
  ownerNetCents: number;
  asOf: string;
  kind: 'ACTUAL';
};

function eurToCents(v: string | number | null | undefined): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0'));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Aggregate confirmed revenue_allocations — existing Omni ledger, not invented. */
export async function observeRevenueAllocations(): Promise<RevenueObservation> {
  const { rows } = await query<{
    payment_count: string;
    gross: string;
    fees: string;
    tax: string;
    resources: string;
    system_reinvest: string;
    owner_net: string;
    max_applied: string | null;
  }>(
    `SELECT
       COUNT(*)::text AS payment_count,
       COALESCE(SUM(gross_eur), 0)::text AS gross,
       COALESCE(SUM(payment_fee_eur), 0)::text AS fees,
       COALESCE(SUM(tax_reserve_eur), 0)::text AS tax,
       COALESCE(SUM(resource_reserve_eur), 0)::text AS resources,
       COALESCE(SUM(system_reinvest_eur), 0)::text AS system_reinvest,
       COALESCE(SUM(owner_net_eur), 0)::text AS owner_net,
       MAX(applied_at)::text AS max_applied
     FROM revenue_allocations`
  );
  const r = rows[0];
  return {
    currency: 'EUR',
    paymentCount: parseInt(r?.payment_count ?? '0', 10) || 0,
    grossCents: eurToCents(r?.gross),
    paymentFeeCents: eurToCents(r?.fees),
    taxReserveCents: eurToCents(r?.tax),
    resourceReserveCents: eurToCents(r?.resources),
    systemReinvestCents: eurToCents(r?.system_reinvest),
    ownerNetCents: eurToCents(r?.owner_net),
    asOf: r?.max_applied ?? new Date().toISOString(),
    kind: 'ACTUAL',
  };
}
