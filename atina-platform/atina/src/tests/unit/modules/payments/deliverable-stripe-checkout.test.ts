import { getDeliverable } from '../../../../modules/billing/lib/deliverable-catalog';
import { getMaintenanceTierById } from '../../../../modules/billing/lib/package-maintenance-tiers';
import { buildDeliverableStripeSessionParams } from '../../../../modules/payments/lib/deliverable-stripe-checkout';

describe('deliverable-stripe-checkout', () => {
  it('uses payment mode for one-time deliverable without maintenance', () => {
    const deliverable = getDeliverable('landing')!;
    const result = buildDeliverableStripeSessionParams({
      deliverable,
      amountEur: 990,
      categoryLabel: ' — Marketing',
      maintenanceTier: null,
      paymentId: 'pay-1',
      userId: 'user-1',
      industryCategory: 'marketing',
    });
    expect(result.mode).toBe('payment');
    expect(result.lineItems).toHaveLength(1);
    expect(result.lineItems[0].price_data?.recurring).toBeUndefined();
    expect(result.subscriptionData).toBeUndefined();
  });

  it('uses subscription mode with maintenance recurring line for one-time + tier', () => {
    const deliverable = getDeliverable('landing')!;
    const tier = getMaintenanceTierById('landing', 'professional')!;
    const result = buildDeliverableStripeSessionParams({
      deliverable,
      amountEur: 990,
      categoryLabel: '',
      maintenanceTier: tier,
      paymentId: 'pay-2',
      userId: 'user-1',
    });
    expect(result.mode).toBe('subscription');
    expect(result.lineItems).toHaveLength(2);
    expect(result.lineItems[0].price_data?.recurring).toBeUndefined();
    expect(result.lineItems[1].price_data?.recurring).toEqual({ interval: 'month' });
    expect(result.subscriptionData?.metadata?.maintenanceTierId).toBe('professional');
  });

  it('uses subscription mode with recurring deliverable price (maintenance included)', () => {
    const deliverable = getDeliverable('vertical-package')!;
    const result = buildDeliverableStripeSessionParams({
      deliverable,
      amountEur: 299,
      categoryLabel: '',
      maintenanceTier: null,
      paymentId: 'pay-3',
      userId: 'user-1',
    });
    expect(result.mode).toBe('subscription');
    expect(result.lineItems).toHaveLength(1);
    expect(result.lineItems[0].price_data?.recurring).toEqual({ interval: 'month' });
    expect(result.subscriptionData?.metadata?.maintenanceIncludedInPrice).toBe('1');
  });
});
