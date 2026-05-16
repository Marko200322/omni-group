import { OmniTubeModule } from '../../modules/omnitube/omnitube.module';

describe('OmniTubeModule', () => {
  it('initialize registers routes', async () => {
    const m = new OmniTubeModule();
    await m.initialize();
    expect(m.router).toBeDefined();
  });
});
