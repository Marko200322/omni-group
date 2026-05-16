import { CraftorModule } from '../../modules/craftor/craftor.module';

describe('CraftorModule', () => {
  it('initialize registers routes', async () => {
    const m = new CraftorModule();
    await m.initialize();
    expect(m.router).toBeDefined();
  });
});
