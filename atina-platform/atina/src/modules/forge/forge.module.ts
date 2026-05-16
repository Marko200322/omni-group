import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
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
