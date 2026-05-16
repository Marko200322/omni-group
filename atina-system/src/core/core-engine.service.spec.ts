import { CoreEngineService } from './core-engine.service';
import { ModuleRegistryService } from './module-registry.service';

describe('CoreEngineService', () => {
  it('registers built-in modules and loads them on bootstrap', async () => {
    const registry = {
      register: jest.fn(),
      loadModules: jest.fn().mockResolvedValue(undefined),
    } as unknown as ModuleRegistryService;

    const engine = new CoreEngineService(registry);
    await engine.onModuleInit();

    expect(registry.register).toHaveBeenCalledTimes(2);
    expect(registry.register).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ name: 'notifications' }),
    );
    expect(registry.register).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ name: 'supply-core' }),
    );
    expect(registry.loadModules).toHaveBeenCalledTimes(1);
  });
});
