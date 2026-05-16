import { SubscriptionsModule } from '../../modules/subscriptions/subscriptions.module';

describe('SubscriptionsModule', () => {
  it('initialize registers routes', async () => {
    const m = new SubscriptionsModule();
    await m.initialize();
    expect(m.router).toBeDefined();
  });
});
