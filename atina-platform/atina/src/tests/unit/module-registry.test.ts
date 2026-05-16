import { Router } from 'express';
import { moduleRegistry, IModule } from '../../core/ModuleRegistry';

function makeModule(
  slug: string,
  opts: {
    name?: string;
    isCore?: boolean;
    initialize?: () => Promise<void>;
    shutdown?: () => Promise<void>;
  } = {}
): IModule {
  const name = opts.name ?? slug;
  return {
    name,
    slug,
    version: '1.0.0',
    isCore: opts.isCore ?? false,
    router: Router(),
    initialize: opts.initialize ?? jest.fn().mockResolvedValue(undefined),
    ...(opts.shutdown ? { shutdown: opts.shutdown } : {}),
  };
}

describe('ModuleRegistry', () => {
  beforeEach(() => {
    moduleRegistry.resetForTests();
  });

  afterEach(() => {
    moduleRegistry.resetForTests();
  });

  it('resetForTests clears modules and allows initializeAll again', async () => {
    moduleRegistry.register(makeModule('a'));
    await moduleRegistry.initializeAll();
    expect(moduleRegistry.getAll()).toHaveLength(1);

    moduleRegistry.resetForTests();
    expect(moduleRegistry.getAll()).toHaveLength(0);

    moduleRegistry.register(makeModule('b'));
    await expect(moduleRegistry.initializeAll()).resolves.toBeUndefined();
    expect(moduleRegistry.get('b')).toBeDefined();
  });

  it('register replaces duplicate slug', () => {
    const first = makeModule('dup', { name: 'First' });
    const second = makeModule('dup', { name: 'Second' });
    moduleRegistry.register(first);
    moduleRegistry.register(second);
    expect(moduleRegistry.get('dup')?.name).toBe('Second');
  });

  it('get returns undefined for unknown slug', () => {
    expect(moduleRegistry.get('nope')).toBeUndefined();
  });

  it('isRegistered reflects registration', () => {
    expect(moduleRegistry.isRegistered('x')).toBe(false);
    moduleRegistry.register(makeModule('x'));
    expect(moduleRegistry.isRegistered('x')).toBe(true);
  });

  it('initializeAll is a no-op when already initialized', async () => {
    const init = jest.fn().mockResolvedValue(undefined);
    moduleRegistry.register(makeModule('once', { initialize: init }));
    await moduleRegistry.initializeAll();
    await moduleRegistry.initializeAll();
    expect(init).toHaveBeenCalledTimes(1);
  });

  it('initializeAll throws when a core module fails', async () => {
    moduleRegistry.register(
      makeModule('core-bad', {
        isCore: true,
        initialize: jest.fn().mockRejectedValue(new Error('core boom')),
      })
    );
    await expect(moduleRegistry.initializeAll()).rejects.toThrow("Core module 'core-bad' failed");
  });

  it('initializeAll logs and continues when a non-core module fails', async () => {
    const goodInit = jest.fn().mockResolvedValue(undefined);
    moduleRegistry.register(
      makeModule('bad', {
        initialize: jest.fn().mockRejectedValue(new Error('soft fail')),
      })
    );
    moduleRegistry.register(makeModule('good', { initialize: goodInit }));

    await expect(moduleRegistry.initializeAll()).resolves.toBeUndefined();
    expect(goodInit).toHaveBeenCalled();
  });

  it('shutdownAll invokes shutdown when present and swallows errors', async () => {
    const ok = jest.fn().mockResolvedValue(undefined);
    const bad = jest.fn().mockRejectedValue(new Error('shutdown fail'));
    moduleRegistry.register(makeModule('s1', { shutdown: ok }));
    moduleRegistry.register(makeModule('s2', { shutdown: bad }));
    moduleRegistry.register(makeModule('no-shutdown'));

    await expect(moduleRegistry.shutdownAll()).resolves.toBeUndefined();
    expect(ok).toHaveBeenCalled();
    expect(bad).toHaveBeenCalled();
  });

  it('mountRoutes maps slug to router under base path', () => {
    moduleRegistry.register(makeModule('alpha'));
    moduleRegistry.register(makeModule('beta'));
    const map = moduleRegistry.mountRoutes('/api/v1');
    expect(map.get('/api/v1/alpha')).toBeDefined();
    expect(map.get('/api/v1/beta')).toBeDefined();
  });

  it('mountRoutes uses default base path', () => {
    moduleRegistry.register(makeModule('only'));
    const map = moduleRegistry.mountRoutes();
    expect(map.get('/api/v1/only')).toBeDefined();
  });
});
