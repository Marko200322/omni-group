import { resolvePlanDeliverableId, PLAN_IMPLICIT_DELIVERABLE } from '../../modules/billing/lib/plan-deliverable-map';

describe('plan-deliverable-map', () => {
  it('maps subscription plans to setup deliverables', () => {
    expect(resolvePlanDeliverableId('starter')).toBe('setup-quick');
    expect(resolvePlanDeliverableId('pro')).toBe('setup-full');
    expect(resolvePlanDeliverableId('enterprise')).toBe('setup-custom');
  });

  it('covers all plan slugs', () => {
    expect(Object.keys(PLAN_IMPLICIT_DELIVERABLE).sort()).toEqual(['enterprise', 'pro', 'starter']);
  });

  it('returns null for unknown plan', () => {
    expect(resolvePlanDeliverableId('unknown')).toBeNull();
  });
});
