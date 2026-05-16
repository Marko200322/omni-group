import { ModuleRegistryService } from './module-registry.service';

describe('ModuleRegistryService', () => {
  it('runs init in registration order', async () => {
    const registry = new ModuleRegistryService();
    const order: string[] = [];

    registry.register({
      name: 'first',
      init: async () => {
        order.push('first');
      },
    });
    registry.register({
      name: 'second',
      init: async () => {
        order.push('second');
      },
    });

    await registry.loadModules();

    expect(order).toEqual(['first', 'second']);
  });

  it('loadModules with no registrations resolves', async () => {
    const registry = new ModuleRegistryService();
    await expect(registry.loadModules()).resolves.toBeUndefined();
  });
});
