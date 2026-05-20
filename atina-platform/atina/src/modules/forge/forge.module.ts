import { Router } from 'express';
import { IModule, moduleRegistry } from '../../core/ModuleRegistry';
import { getForgeHealthDetails } from './service/forge-health.service';
import { authenticate } from '../../api/middleware/auth.middleware';
import { authSessionLimiter } from '../../api/middleware/rate-limit.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { ForgeController } from './controller/forge.controller';
import { CreateForgeDto, ForgeRunParamsDto, RunForgeDto } from './dto/forge.dto';

export class ForgeModule implements IModule {
  name = 'Forge';
  slug = 'forge';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  private readonly controller = new ForgeController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    moduleRegistry.registerHealthProbe('forge', async () => {
      const details = await getForgeHealthDetails();
      return details as unknown as Record<string, unknown>;
    });

    this.router.get('/status', authenticate, authSessionLimiter, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.status);
    this.router.get('/', authenticate, authSessionLimiter, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.list);
    this.router.post('/', authenticate, authSessionLimiter, validateQuery(StrictEmptyQueryDto), validateBody(CreateForgeDto), this.controller.create);
    this.router.post(
      '/:id/run',
      authenticate,
      authSessionLimiter,
      validateParams(ForgeRunParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(RunForgeDto),
      this.controller.run
    );
  }
}
