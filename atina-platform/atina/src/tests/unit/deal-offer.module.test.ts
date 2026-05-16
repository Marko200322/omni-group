import { DealOfferModule } from '../../modules/deal-offer/deal-offer.module';

describe('DealOfferModule', () => {
  it('initialize registers routes', async () => {
    const m = new DealOfferModule();
    await m.initialize();
    expect(m.router).toBeDefined();
  });
});
