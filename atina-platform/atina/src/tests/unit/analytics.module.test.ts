import { AnalyticsModule } from '../../modules/analytics/analytics.module';

describe('AnalyticsModule', () => {
  it('initialize registers router and routes', async () => {
    const m = new AnalyticsModule();
    await m.initialize();
    expect(m.router).toBeDefined();
    expect(m.name).toBe('Analytics');
    expect(m.slug).toBe('analytics');
    expect(m.requiredPlan).toBe('pro');
    expect(m.isCore).toBe(false);
  });

  it('exposes version', () => {
    expect(new AnalyticsModule().version).toBe('1.0.0');
  });

  it('initialize registers HTTP paths', async () => {
    const m = new AnalyticsModule();
    await m.initialize();
    const hasPath = (p: string) =>
      m.router.stack.some((layer) => 'route' in layer && layer.route?.path === p);
    expect(hasPath('/track')).toBe(true);
    expect(hasPath('/dashboard')).toBe(true);
    expect(hasPath('/admin/overview')).toBe(true);
    expect(hasPath('/events')).toBe(true);
  });
});
