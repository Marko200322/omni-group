import { ResourceManagementModule } from '../../modules/resource-management/resource-management.module';

describe('ResourceManagementModule', () => {
  it('initialize registers routes', async () => {
    const m = new ResourceManagementModule();
    await m.initialize();
    expect(m.router).toBeDefined();
    expect(m.slug).toBe('resource-management');
    expect(m.isCore).toBe(true);
    expect(m.name).toBe('Resource Management');
    expect(m.version).toBe('1.0.0');
    const stack = m.router.stack as { route?: { path: string } }[];
    const paths = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(paths).toEqual(expect.arrayContaining(['/overview', '/allocate']));
  });
});
