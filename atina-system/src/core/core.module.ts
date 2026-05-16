import { Global, Module } from '@nestjs/common';
import { CoreEngineService } from './core-engine.service';
import { ModuleRegistryService } from './module-registry.service';

@Global()
@Module({
  providers: [ModuleRegistryService, CoreEngineService],
  exports: [ModuleRegistryService, CoreEngineService],
})
export class CoreModule {}
