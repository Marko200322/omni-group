import { TitanMasterModule } from '../../modules/titan-master/titan-master.module';

describe('TitanMasterModule', () => {
  it('initialize registers routes', async () => {
    const m = new TitanMasterModule();
    await m.initialize();
    expect(m.router).toBeDefined();
  });
});
