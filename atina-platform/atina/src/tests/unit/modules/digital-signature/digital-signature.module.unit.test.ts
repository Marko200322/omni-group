import { DigitalSignatureModule } from '../../../../modules/digital-signature/digital-signature.module';

describe('DigitalSignatureModule', () => {
  it('exposes module metadata for registry', () => {
    const m = new DigitalSignatureModule();
    expect(m.name).toBe('Digital Signature');
    expect(m.slug).toBe('digital-signature');
    expect(m.version).toBe('1.0.0');
    expect(m.isCore).toBe(false);
    expect(m.requiredPlan).toBe('pro');
  });

  it('provides a router instance before initialize', () => {
    const m = new DigitalSignatureModule();
    expect(m.router).toBeDefined();
    expect(typeof m.router.get).toBe('function');
  });

  it('initialize registers HTTP routes on the module router', async () => {
    const m = new DigitalSignatureModule();
    await m.initialize();
    const stack = (m.router as { stack?: { route?: { path: string; methods: Record<string, boolean> } }[] }).stack;
    const paths = (stack ?? [])
      .map((layer) => layer.route?.path)
      .filter((p): p is string => typeof p === 'string');
    expect(paths).toEqual(expect.arrayContaining(['/', '/:id/run']));
  });

  it('exposes semver-shaped version string', () => {
    expect(new DigitalSignatureModule().version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
