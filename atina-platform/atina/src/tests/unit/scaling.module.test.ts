import { ScalingModule } from '../../modules/scaling/scaling.module';

describe('ScalingModule', () => {
  it('initialize registers scaling routes', async () => {
    const module = new ScalingModule();
    await module.initialize();
    expect(module.slug).toBe('scaling');
    expect(module.router.stack.length).toBeGreaterThanOrEqual(3);
  });
});
