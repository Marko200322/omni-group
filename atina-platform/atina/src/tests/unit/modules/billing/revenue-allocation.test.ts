import {
  buildAllocationPlan,
  computePaymentFeeEur,
} from '../../../../modules/billing/service/revenue-allocation.service';

describe('revenue-allocation.service', () => {
  it('splits deliverable payment into resources, reinvest, and owner net', () => {
    const plan = buildAllocationPlan({
      paymentId: 'test',
      userId: 'user',
      grossEur: 8895,
      currency: 'EUR',
      paymentProvider: 'manual',
      purchaseType: 'deliverable',
      deliverableId: 'custom-software',
      billingCycle: 'one_time',
    });

    expect(plan.grossEur).toBe(8895);
    expect(plan.paymentFeeEur).toBe(0);
    expect(plan.resourceReserveEur).toBeGreaterThan(0);
    expect(plan.systemReinvestEur).toBeGreaterThan(0);
    expect(plan.ownerNetEur).toBeGreaterThan(0);

    const sum =
      plan.paymentFeeEur +
      plan.taxReserveEur +
      plan.resourceReserveEur +
      plan.systemReinvestEur +
      plan.ownerNetEur;
    expect(sum).toBeCloseTo(plan.grossEur, 0);

    const ownerLine = plan.lines.find((l) => l.bucket === 'owner_net');
    expect(ownerLine?.labelSr).toContain('čist');
  });

  it('applies stripe fee before resource and profit split', () => {
    const fee = computePaymentFeeEur(1000, 'stripe');
    expect(fee).toBeGreaterThan(0);

    const plan = buildAllocationPlan({
      paymentId: 'test',
      userId: 'user',
      grossEur: 1000,
      currency: 'EUR',
      paymentProvider: 'stripe',
      purchaseType: 'deliverable',
      deliverableId: 'vertical-package',
      billingCycle: 'monthly',
    });

    expect(plan.paymentFeeEur).toBeGreaterThan(0);
    expect(plan.lines.some((l) => l.bucket === 'payment_fee')).toBe(true);
  });

  it('covers all catalog deliverables without negative owner net', () => {
    const ids = [
      'setup-quick',
      'setup-full',
      'vertical-package',
      'custom-software',
      'website-ecommerce',
    ];
    for (const deliverableId of ids) {
      const plan = buildAllocationPlan({
        paymentId: 'test',
        userId: 'user',
        grossEur: 5000,
        currency: 'EUR',
        paymentProvider: 'manual',
        purchaseType: 'deliverable',
        deliverableId,
      });
      expect(plan.ownerNetEur).toBeGreaterThanOrEqual(0);
      expect(plan.lines.length).toBeGreaterThan(0);
    }
  });
});
