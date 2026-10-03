import {
  buildFoundingPromoStatus,
  readFoundingPromoSettings,
  remainingFoundingSlots,
  shouldApplyFoundingCoupon,
} from '../../modules/payments/lib/founding-promo';

const coupon = {
  couponId: 'omni_founding_15_12m',
  maxRedemptions: 50,
  timesRedeemed: 12,
  valid: true,
};

describe('founding promo', () => {
  it('reads the 15% / 12 month / 50 slot defaults', () => {
    const settings = readFoundingPromoSettings(
      { FOUNDING_CLIENT_PROMO: 'true', FOUNDING_STRIPE_COUPON_ID: 'omni_founding_15_12m' },
      null,
    );
    expect(settings).toEqual({
      enabled: true,
      discountPct: 15,
      lockMonths: 12,
      maxSlots: 50,
      couponId: 'omni_founding_15_12m',
    });
  });

  it('counts remaining slots from the Stripe coupon, capped by env', () => {
    expect(remainingFoundingSlots({ ...readFoundingPromoSettings(), maxSlots: 50, enabled: true, discountPct: 15, lockMonths: 12, couponId: 'c' }, coupon)).toBe(38);
  });

  it('applies the coupon only while slots remain and the industry is not regulated', () => {
    const settings = readFoundingPromoSettings(
      { FOUNDING_CLIENT_PROMO: 'true', FOUNDING_STRIPE_COUPON_ID: 'omni_founding_15_12m' },
      'omni_founding_15_12m',
    );
    expect(shouldApplyFoundingCoupon(settings, coupon, null)).toBe(true);
    expect(shouldApplyFoundingCoupon(settings, { ...coupon, timesRedeemed: 50 }, null)).toBe(false);
    expect(shouldApplyFoundingCoupon(settings, coupon, 'healthcare')).toBe(false);
  });

  it('does not apply a discount without a Stripe coupon id', () => {
    const settings = readFoundingPromoSettings({ FOUNDING_CLIENT_PROMO: 'true' }, '');
    expect(shouldApplyFoundingCoupon(settings, coupon, null)).toBe(false);
    expect(buildFoundingPromoStatus(settings, coupon).active).toBe(false);
  });
});
