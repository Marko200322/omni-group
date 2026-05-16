import { OmniGameModule } from '../../modules/omnigame/omnigame.module';

describe('OmniGameModule', () => {
  it('initialize registers routes', async () => {
    const m = new OmniGameModule();
    await m.initialize();
    expect(m.router).toBeDefined();
  });
});
