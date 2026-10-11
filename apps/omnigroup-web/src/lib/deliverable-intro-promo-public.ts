export type DeliverableIntroPromoPublic = {
  enabled: boolean;
  active: boolean;
  discountPct: number;
  maxSlots: number;
  remaining: number;
  redeemed: number;
  label: string;
};

export async function fetchDeliverableIntroPromoStatus(): Promise<DeliverableIntroPromoPublic | null> {
  const res = await fetch('/api/atina/payments/deliverable-intro-promo', { cache: 'no-store' });
  const json = (await res.json()) as { ok?: boolean; data?: DeliverableIntroPromoPublic };
  if (!res.ok || !json.ok || !json.data) return null;
  return json.data;
}

/** Display helper — intro charge from list when promo active (server is source of truth at checkout). */
export function introDisplayPriceEur(listEur: number, promo: DeliverableIntroPromoPublic | null): number {
  if (!promo?.active || !promo.discountPct) return listEur;
  return Math.max(9, Math.round(listEur * (1 - promo.discountPct / 100)));
}
