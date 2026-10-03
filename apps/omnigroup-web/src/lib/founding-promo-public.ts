export type FoundingPromoPublic = {
  enabled: boolean;
  active: boolean;
  discountPct: number;
  lockMonths: number;
  maxSlots: number;
  remaining: number;
  redeemed: number;
};

export async function fetchFoundingPromoStatus(): Promise<FoundingPromoPublic | null> {
  const res = await fetch('/api/atina/payments/founding-promo', { cache: 'no-store' });
  const json = (await res.json()) as { ok?: boolean; data?: FoundingPromoPublic };
  if (!res.ok || !json.ok || !json.data) return null;
  return json.data;
}
