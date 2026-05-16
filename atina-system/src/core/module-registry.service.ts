import { Injectable, Logger } from '@nestjs/common';

export interface AtinaModule {
  readonly name: string;
  init(): Promise<void>;
}

/** Blueprint: ModuleRegistry — boot redosled modula. */
@Injectable()
export class ModuleRegistryService {
  private readonly logger = new Logger(ModuleRegistryService.name);
  private readonly modules: AtinaModule[] = [];

  register(mod: AtinaModule): void {
    this.modules.push(mod);
  }

  async loadModules(): Promise<void> {
    for (const m of this.modules) {
      await m.init();
      this.logger.log(`Modul aktiviran: ${m.name}`);
    }
  }
}
