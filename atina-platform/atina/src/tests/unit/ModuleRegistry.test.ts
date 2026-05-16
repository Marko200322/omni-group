import { Router } from 'express';
import { ModuleRegistry, IModule } from '../../core/ModuleRegistry';

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

import logger from '../../utils/logger';

function makeModule(slug: string, isCore: boolean): IModule {
  return {
    name: `M-${slug}`,
    slug,
    version: '1.0.0',
    isCore,
    router: Router(),
    initialize: jest.fn().mockResolvedValue(undefined),
  };
}

describe('ModuleRegistry', () => {
  beforeEach(() => {
    (ModuleRegistry as any).instance = undefined;
  });

  it('is singleton', () => {
    const a = ModuleRegistry.getInstance();
    const b = ModuleRegistry.getInstance();
    expect(a).toBe(b);
  });

  it('register, get, getAll, isRegistered', () => {
    const r = ModuleRegistry.getInstance();
    const m = makeModule('alpha', false);
    r.register(m);
    expect(r.isRegistered('alpha')).toBe(true);
    expect(r.get('alpha')).toBe(m);
    expect(r.getAll()).toContain(m);
  });

  it('register replaces duplicate slug with warn', () => {
    const r = ModuleRegistry.getInstance();
    r.register(makeModule('dup', false));
    r.register(makeModule('dup', false));
    expect(r.getAll().filter((m) => m.slug === 'dup')).toHaveLength(1);
  });

  it('initializeAll skips second call', async () => {
    const r = ModuleRegistry.getInstance();
    r.register(makeModule('b', false));
    await r.initializeAll();
    await r.initializeAll();
  });

  it('initializeAll throws when core module fails', async () => {
    const r = ModuleRegistry.getInstance();
    const bad: IModule = {
      ...makeModule('core-bad', true),
      initialize: jest.fn().mockRejectedValue(new Error('fail')),
    };
    r.register(bad);
    await expect(r.initializeAll()).rejects.toThrow("Core module 'core-bad' failed");
  });

  it('shutdownAll calls shutdown when present', async () => {
    const r = ModuleRegistry.getInstance();
    const shutdown = jest.fn().mockResolvedValue(undefined);
    r.register({
      ...makeModule('s', false),
      shutdown,
    });
    await r.shutdownAll();
    expect(shutdown).toHaveBeenCalled();
  });

  it('shutdownAll logs and continues when shutdown throws', async () => {
    const r = ModuleRegistry.getInstance();
    r.register({
      ...makeModule('bad-shutdown', false),
      shutdown: jest.fn().mockRejectedValue(new Error('shutdown boom')),
    });
    await r.shutdownAll();
    expect(logger.error).toHaveBeenCalledWith(
      'Module shutdown error: bad-shutdown',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });

  it('mountRoutes prefixes path', () => {
    const r = ModuleRegistry.getInstance();
    r.register(makeModule('api', false));
    const map = r.mountRoutes('/v1');
    expect([...map.keys()]).toContain('/v1/api');
  });

  it('mountRoutes defaults to /api/v1', () => {
    const r = ModuleRegistry.getInstance();
    r.register(makeModule('defpath', false));
    const map = r.mountRoutes();
    expect([...map.keys()]).toContain('/api/v1/defpath');
  });

  it('resetForTests clears modules and allows initializeAll again', async () => {
    const r = ModuleRegistry.getInstance();
    r.register(makeModule('tmp', false));
    await r.initializeAll();
    r.resetForTests();
    expect(r.isRegistered('tmp')).toBe(false);
    r.register(makeModule('after', false));
    await r.initializeAll();
    expect(r.get('after')).toBeDefined();
  });
});
