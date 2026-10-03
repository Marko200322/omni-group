import { resolvePricingTier } from '../../billing/lib/category-pricing';

export type FoundingPromoSettings = {
  enabled: boolean;
  discountPct: number;
  lockMonths: number;
  maxSlots: number;
  couponId: string | null;
};

export type FoundingCouponInventory = {
  couponId: string;
  maxRedemptions: number | null;
  timesRedeemed: number;
  valid: boolean;
};

export type FoundingPromoStatus = {
  enabled: boolean;
  active: boolean;
  discountPct: number;
  lockMonths: number;
  maxSlots: number;
  redeemed: number;
  remaining: number;
  couponId: string | null;
};

function envFlagOn(value: string | undefined): boolean {
  const v = (value ?? '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

export function readFoundingPromoSettings(
  env: NodeJS.ProcessEnv = process.env,
  couponIdFromConfig?: string | null,
): FoundingPromoSettings {
  const enabled =
    envFlagOn(env.FOUNDING_CLIENT_PROMO) || envFlagOn(env.NEXT_PUBLIC_FOUNDING_CLIENT_PROMO);
  const discountRaw = Number(
    env.FOUNDING_CLIENT_DISCOUNT_PCT || env.NEXT_PUBLIC_FOUNDING_CLIENT_DISCOUNT_PCT || 15,
  );
  const discountPct = Number.isFinite(discountRaw) && discountRaw > 0 && discountRaw < 100 ? discountRaw : 15;
  const lockRaw = Number(env.FOUNDING_CLIENT_LOCK_MONTHS || env.NEXT_PUBLIC_FOUNDING_CLIENT_LOCK_MONTHS || 12);
  const lockMonths = Number.isFinite(lockRaw) && lockRaw >= 1 ? Math.floor(lockRaw) : 12;
  const slotsRaw = Number(env.FOUNDING_CLIENT_MAX_SLOTS || env.NEXT_PUBLIC_FOUNDING_CLIENT_MAX_SLOTS || 50);
  const maxSlots = Number.isFinite(slotsRaw) && slotsRaw >= 1 ? Math.floor(slotsRaw) : 50;
  const couponId = (couponIdFromConfig || env.FOUNDING_STRIPE_COUPON_ID || '').trim() || null;
  return { enabled, discountPct, lockMonths, maxSlots, couponId };
}

export function remainingFoundingSlots(
  settings: FoundingPromoSettings,
  inventory: FoundingCouponInventory | null,
): number {
  if (!inventory || !inventory.valid) return 0;
  const stripeCap = inventory.maxRedemptions ?? settings.maxSlots;
  const limit = Math.min(settings.maxSlots, stripeCap);
  return Math.max(0, limit - inventory.timesRedeemed);
}

export function shouldApplyFoundingCoupon(
  settings: FoundingPromoSettings,
  inventory: FoundingCouponInventory | null,
  industryCategory?: string | null,
): boolean {
  if (!settings.enabled || !settings.couponId) return false;
  if (resolvePricingTier(industryCategory) === 'regulated') return false;
  return remainingFoundingSlots(settings, inventory) > 0;
}

export function buildFoundingPromoStatus(
  settings: FoundingPromoSettings,
  inventory: FoundingCouponInventory | null,
): FoundingPromoStatus {
  const remaining = settings.enabled ? remainingFoundingSlots(settings, inventory) : 0;
  const redeemed = inventory?.timesRedeemed ?? 0;
  return {
    enabled: settings.enabled,
    active: settings.enabled && remaining > 0 && Boolean(settings.couponId),
    discountPct: settings.discountPct,
    lockMonths: settings.lockMonths,
    maxSlots: settings.maxSlots,
    redeemed,
    remaining,
    couponId: settings.couponId,
  };
}
