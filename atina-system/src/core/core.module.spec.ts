import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CoreEngineService } from './core-engine.service';
import { CoreModule } from './core.module';
import { ModuleRegistryService } from './module-registry.service';

@Module({
  imports: [CoreModule],
  providers: [],
})
class CoreConsumerModule {}

describe('CoreModule', () => {
  it('provides ModuleRegistryService and CoreEngineService', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CoreModule],
    }).compile();

    expect(moduleRef.get(ModuleRegistryService)).toBeInstanceOf(
      ModuleRegistryService,
    );
    expect(moduleRef.get(CoreEngineService)).toBeInstanceOf(CoreEngineService);
  });

  it('exposes registry and engine to an importing module', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CoreConsumerModule],
    }).compile();

    expect(moduleRef.get(ModuleRegistryService)).toBeInstanceOf(
      ModuleRegistryService,
    );
    expect(moduleRef.get(CoreEngineService)).toBeInstanceOf(CoreEngineService);
  });
});
