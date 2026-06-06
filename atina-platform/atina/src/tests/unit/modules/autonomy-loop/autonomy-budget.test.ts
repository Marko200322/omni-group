import { createTickSpendTracker } from '../../../../modules/autonomy-loop/service/autonomy-budget.service';

describe('autonomy budget tick tracker', () => {
  it('starts at zero spend', () => {
    const t = createTickSpendTracker();
    expect(t.spentUsd).toBe(0);
  });

  it('accumulates spend in a tick session', () => {
    const t = createTickSpendTracker();
    t.spentUsd += 0.2;
    t.spentUsd += 0.5;
    expect(t.spentUsd).toBeCloseTo(0.7);
  });
});
