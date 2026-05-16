import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { authSessionLimiter } from '../../api/middleware/rate-limit.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { TitanisController } from './controller/titanis.controller';
import { CreateTitanisWorkspaceDto, RunTitanisDto, TitanisRunParamsDto } from './dto/titanis.dto';

export class TitanisModule implements IModule {
  name = 'Titanis Sales Engine';
  slug = 'titanis';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  private readonly controller = new TitanisController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.list);
    this.router.post('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(CreateTitanisWorkspaceDto), this.controller.create);
    this.router.post(
      '/:id/run',
      authenticate,
      authSessionLimiter,
      validateParams(TitanisRunParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(RunTitanisDto),
      this.controller.run
    );
  }
}
