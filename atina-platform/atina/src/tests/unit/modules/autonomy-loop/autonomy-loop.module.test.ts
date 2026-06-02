import { AutonomyLoopModule } from '../../../../modules/autonomy-loop/autonomy-loop.module';

describe('AutonomyLoopModule', () => {
  it('registers with expected metadata', () => {
    const mod = new AutonomyLoopModule();
    expect(mod.name).toBe('Autonomy Loop');
    expect(mod.slug).toBe('autonomy-loop');
    expect(mod.requiredPlan).toBe('enterprise');
  });

  it('initializes routes', async () => {
    const mod = new AutonomyLoopModule();
    await mod.initialize();
    expect(mod.router.stack.length).toBeGreaterThan(5);
  });
});
