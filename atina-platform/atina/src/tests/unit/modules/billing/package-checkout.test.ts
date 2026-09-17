import { DELIVERABLE_CATALOG } from '../../../../modules/billing/lib/deliverable-catalog';
import { canCheckoutPackage, PACKAGE_DELIVERY_SPECS } from '../../../../modules/billing/lib/package-delivery-spec';

describe('catalog checkout', () => {
  const prevPhase = process.env.FACTORY_PHASE;
  const prevBudget = process.env.OWNER_MONTHLY_BUDGET_EUR;

  beforeEach(() => {
    process.env.FACTORY_PHASE = 'M0';
    process.env.OWNER_MONTHLY_BUDGET_EUR = '100';
  });

  afterEach(() => {
    if (prevPhase === undefined) delete process.env.FACTORY_PHASE;
    else process.env.FACTORY_PHASE = prevPhase;
    if (prevBudget === undefined) delete process.env.OWNER_MONTHLY_BUDGET_EUR;
    else process.env.OWNER_MONTHLY_BUDGET_EUR = prevBudget;
  });

  it('opens all 17 catalog packages for self-serve checkout', () => {
    expect(PACKAGE_DELIVERY_SPECS).toHaveLength(17);
    expect(DELIVERABLE_CATALOG).toHaveLength(17);
    for (const item of DELIVERABLE_CATALOG) {
      expect(canCheckoutPackage(item.id)).toBe(true);
    }
  });
});
