import {
  applyDeliverableIntroPrice,
  buildDeliverableIntroPromoStatus,
  readDeliverableIntroPromoSettings,
} from '../../modules/payments/lib/deliverable-intro-promo';

describe('deliverable intro promo — first 50 then full price', () => {
  it('defaults enabled with 18% and 50 slots', () => {
    const s = readDeliverableIntroPromoSettings({});
    expect(s.enabled).toBe(true);
    expect(s.discountPct).toBe(18);
    expect(s.maxSlots).toBe(50);
    expect(s.startIso).toBe('2026-10-09T00:00:00.000Z');
  });

  it('applies intro while slots remain', () => {
    const priced = applyDeliverableIntroPrice(
      1000,
      { enabled: true, discountPct: 18, maxSlots: 50, startIso: null },
      0,
    );
    expect(priced.introApplied).toBe(true);
    expect(priced.listPriceEur).toBe(1000);
    expect(priced.chargeEur).toBe(820);
    expect(priced.remainingSlots).toBe(50);
  });

  it('returns full list price after 50 completed deliverable payments', () => {
    const priced = applyDeliverableIntroPrice(
      1000,
      { enabled: true, discountPct: 18, maxSlots: 50, startIso: null },
      50,
    );
    expect(priced.introApplied).toBe(false);
    expect(priced.chargeEur).toBe(1000);
    expect(priced.remainingSlots).toBe(0);
  });

  it('status label flips when intro closes', () => {
    const open = buildDeliverableIntroPromoStatus(
      { enabled: true, discountPct: 18, maxSlots: 50, startIso: null },
      10,
    );
    expect(open.active).toBe(true);
    expect(open.remaining).toBe(40);
    const closed = buildDeliverableIntroPromoStatus(
      { enabled: true, discountPct: 18, maxSlots: 50, startIso: null },
      50,
    );
    expect(closed.active).toBe(false);
    expect(closed.label).toMatch(/full regular list price/i);
  });
});
