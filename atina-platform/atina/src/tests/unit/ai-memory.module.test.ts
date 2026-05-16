import { AiMemoryModule } from '../../modules/ai-memory/ai-memory.module';

describe('AiMemoryModule', () => {
  it('exposes module metadata', () => {
    const m = new AiMemoryModule();
    expect(m.slug).toBe('ai-memory');
    expect(m.name).toBe('AI Learning & Memory');
    expect(m.requiredPlan).toBe('enterprise');
    expect(m.isCore).toBe(false);
  });

  it('initialize registers routes', async () => {
    const m = new AiMemoryModule();
    await m.initialize();
    expect(m.router).toBeDefined();
    expect(m.router.stack.some((layer) => 'route' in layer && layer.route?.path === '/remember')).toBe(
      true
    );
    expect(m.router.stack.some((layer) => 'route' in layer && layer.route?.path === '/recall')).toBe(
      true
    );
  });

  it('exposes version', () => {
    expect(new AiMemoryModule().version).toBe('1.0.0');
  });

  it('has no mounted routes before initialize', () => {
    const m = new AiMemoryModule();
    expect(m.router.stack.filter((layer) => 'route' in layer)).toHaveLength(0);
  });
});
