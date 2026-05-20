import { CraftorModule } from '../../modules/craftor/craftor.module';
import { CRAFTOR_VERSION } from '../../modules/craftor/craftor.constants';

describe('CraftorModule', () => {
  it('initialize registers routes', async () => {
    const m = new CraftorModule();
    await m.initialize();
    expect(m.router).toBeDefined();
  });

  it('exposes Craftor V7 version', () => {
    const m = new CraftorModule();
    expect(m.version).toBe(CRAFTOR_VERSION);
    expect(m.version).toBe('7.0.0');
  });
});
