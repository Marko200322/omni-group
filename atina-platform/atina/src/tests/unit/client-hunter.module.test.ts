import { ClientHunterModule } from '../../modules/client-hunter/client-hunter.module';

describe('ClientHunterModule', () => {
  it('initialize registers routes', async () => {
    const m = new ClientHunterModule();
    await m.initialize();
    expect(m.router).toBeDefined();
  });
});
