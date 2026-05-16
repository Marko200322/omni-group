import { KpiModule } from '../../modules/kpi/kpi.module';

describe('KpiModule', () => {
  it('initialize registers dashboard route', async () => {
    const m = new KpiModule();
    await m.initialize();
    expect(m.router).toBeDefined();
    expect(m.slug).toBe('kpi');
    expect(m.isCore).toBe(true);
    expect(m.name).toContain('KPI');
    const stack = m.router.stack as { route?: { path: string; methods: Record<string, boolean> } }[];
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toContain('/dashboard');
  });

  it('exposes module version', () => {
    const m = new KpiModule();
    expect(m.version).toBe('1.0.0');
  });
});
