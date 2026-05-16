import { PaymentsModule } from '../../modules/payments/payments.module';

describe('PaymentsModule', () => {
  it('initialize registers routes', async () => {
    const m = new PaymentsModule();
    await m.initialize();
    expect(m.router).toBeDefined();
  });
});
