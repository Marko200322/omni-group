import { ApexPredatorModule } from '../../../../modules/apex-predator/apex-predator.module';

describe('ApexPredatorModule', () => {
  it('initialize registers routes', async () => {
    const m = new ApexPredatorModule();
    await m.initialize();
    expect(m.router).toBeDefined();
  });
});
