/**
 * First-50 deliverable intro pricing — list/full price stays in package-delivery-spec;
 * checkout applies a temporary discount until maxSlots completed deliverable payments.
 */
export type DeliverableIntroPromoSettings = {
  enabled: boolean;
  discountPct: number;
  maxSlots: number;
  /** ISO timestamp — only completed deliverable customers after this count toward the 50. */
  startIso: string | null;
};

export type DeliverableIntroPromoStatus = {
  enabled: boolean;
  active: boolean;
  discountPct: number;
  maxSlots: number;
  redeemed: number;
  remaining: number;
  label: string;
};

export type DeliverableCheckoutPrice = {
  listPriceEur: number;
  chargeEur: number;
  introApplied: boolean;
  discountPct: number;
  remainingSlots: number;
  promoLabel: string | null;
};

function envFlagOn(value: string | undefined): boolean {
  const v = (value ?? '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

export function readDeliverableIntroPromoSettings(
  env: NodeJS.ProcessEnv = process.env,
): DeliverableIntroPromoSettings {
  // Default ON — first 50 paying package customers get intro; then full list price.
  const enabled =
    env.DELIVERABLE_INTRO_PROMO === undefined && env.NEXT_PUBLIC_DELIVERABLE_INTRO_PROMO === undefined
      ? true
      : envFlagOn(env.DELIVERABLE_INTRO_PROMO) || envFlagOn(env.NEXT_PUBLIC_DELIVERABLE_INTRO_PROMO);
  const discountRaw = Number(
    env.DELIVERABLE_INTRO_DISCOUNT_PCT || env.NEXT_PUBLIC_DELIVERABLE_INTRO_DISCOUNT_PCT || 18,
  );
  const discountPct =
    Number.isFinite(discountRaw) && discountRaw > 0 && discountRaw < 50 ? discountRaw : 18;
  const slotsRaw = Number(
    env.DELIVERABLE_INTRO_MAX_SLOTS || env.NEXT_PUBLIC_DELIVERABLE_INTRO_MAX_SLOTS || 50,
  );
  const maxSlots = Number.isFinite(slotsRaw) && slotsRaw >= 1 ? Math.floor(slotsRaw) : 50;
  // Default: commercial launch window after matrix HARD floods — first 50 real clients.
  const startRaw = (
    env.DELIVERABLE_INTRO_START_ISO ||
    env.NEXT_PUBLIC_DELIVERABLE_INTRO_START_ISO ||
    '2026-10-09T00:00:00.000Z'
  ).trim();
  const startIso = startRaw.length > 0 ? startRaw : null;
  return { enabled, discountPct, maxSlots, startIso };
}

export function applyDeliverableIntroPrice(
  listPriceEur: number,
  settings: DeliverableIntroPromoSettings,
  redeemedCompletedDeliverablePayments: number,
): DeliverableCheckoutPrice {
  const list = Math.max(9, Math.round(listPriceEur));
  const redeemed = Math.max(0, Math.floor(redeemedCompletedDeliverablePayments));
  const remaining = settings.enabled ? Math.max(0, settings.maxSlots - redeemed) : 0;
  const introApplied = settings.enabled && remaining > 0;
  const chargeEur = introApplied
    ? Math.max(9, Math.round(list * (1 - settings.discountPct / 100)))
    : list;
  return {
    listPriceEur: list,
    chargeEur,
    introApplied,
    discountPct: introApplied ? settings.discountPct : 0,
    remainingSlots: remaining,
    promoLabel: introApplied
      ? `First ${settings.maxSlots} clients only (−${settings.discountPct}%). After that: full list price.`
      : null,
  };
}

export function buildDeliverableIntroPromoStatus(
  settings: DeliverableIntroPromoSettings,
  redeemedCompletedDeliverablePayments: number,
): DeliverableIntroPromoStatus {
  const redeemed = Math.max(0, Math.floor(redeemedCompletedDeliverablePayments));
  const remaining = settings.enabled ? Math.max(0, settings.maxSlots - redeemed) : 0;
  const active = settings.enabled && remaining > 0;
  return {
    enabled: settings.enabled,
    active,
    discountPct: settings.discountPct,
    maxSlots: settings.maxSlots,
    redeemed,
    remaining,
    label: active
      ? `First ${settings.maxSlots} clients: −${settings.discountPct}% now (${remaining} slots left). Then full regular price.`
      : settings.enabled
        ? 'Intro closed — everyone pays full regular list price'
        : 'Full regular list price',
  };
}
