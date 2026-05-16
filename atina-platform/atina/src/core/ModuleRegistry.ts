import { Router } from 'express';
import logger from '../utils/logger';

export interface IModule {
  name: string;
  slug: string;
  version: string;
  isCore: boolean;
  requiredPlan?: string;
  router: Router;
  initialize(): Promise<void>;
  shutdown?(): Promise<void>;
}

export class ModuleRegistry {
  private static instance: ModuleRegistry;
  private modules: Map<string, IModule> = new Map();
  private initialized = false;

  private constructor() {}

  static getInstance(): ModuleRegistry {
    if (!ModuleRegistry.instance) {
      ModuleRegistry.instance = new ModuleRegistry();
    }
    return ModuleRegistry.instance;
  }

  register(module: IModule): void {
    if (this.modules.has(module.slug)) {
      logger.warn(`Module '${module.slug}' is already registered — replacing`);
    }
    this.modules.set(module.slug, module);
    logger.debug(`Module registered: ${module.name} (${module.slug}) v${module.version}`);
  }

  get(slug: string): IModule | undefined {
    return this.modules.get(slug);
  }

  getAll(): IModule[] {
    return Array.from(this.modules.values());
  }

  isRegistered(slug: string): boolean {
    return this.modules.has(slug);
  }

  async initializeAll(): Promise<void> {
    if (this.initialized) return;

    logger.info(`Initializing ${this.modules.size} modules...`);

    for (const [slug, module] of this.modules) {
      try {
        await module.initialize();
        logger.info(`Module initialized: ${module.name} (${slug})`);
      } catch (error) {
        logger.error(`Module initialization failed: ${slug}`, { error });
        if (module.isCore) {
          throw new Error(`Core module '${slug}' failed to initialize`);
        }
      }
    }

    this.initialized = true;
    logger.info('All modules initialized');
  }

  async shutdownAll(): Promise<void> {
    logger.info('Shutting down modules...');

    for (const [slug, module] of this.modules) {
      if (module.shutdown) {
        try {
          await module.shutdown();
          logger.info(`Module shutdown: ${slug}`);
        } catch (error) {
          logger.error(`Module shutdown error: ${slug}`, { error });
        }
      }
    }
  }

  mountRoutes(basePath = '/api/v1'): Map<string, Router> {
    const routes = new Map<string, Router>();
    for (const [slug, module] of this.modules) {
      routes.set(`${basePath}/${slug}`, module.router);
    }
    return routes;
  }

  /** Clears registrations and init flag (used from tests only). */
  resetForTests(): void {
    this.modules.clear();
    this.initialized = false;
  }
}

export const moduleRegistry = ModuleRegistry.getInstance();
