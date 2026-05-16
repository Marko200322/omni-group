import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModuleRegistryService } from './module-registry.service';

/** Blueprint: CoreEngine — bootstrap životnog ciklusa. */
@Injectable()
export class CoreEngineService implements OnModuleInit {
  private readonly logger = new Logger(CoreEngineService.name);

  constructor(private readonly registry: ModuleRegistryService) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Atina CoreEngine bootstrap…');
    this.registry.register({
      name: 'notifications',
      init: async () => Promise.resolve(),
    });
    this.registry.register({
      name: 'supply-core',
      init: async () => Promise.resolve(),
    });
    await this.registry.loadModules();
  }
}
