import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { authSessionLimiter } from '../../api/middleware/rate-limit.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { Dominus360Controller } from './controller/dominus360.controller';
import { CreateDominusDto, DominusRunParamsDto, RunDominusDto } from './dto/dominus360.dto';

export class Dominus360Module implements IModule {
  name = 'Dominus360';
  slug = 'dominus360';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'enterprise';
  router: Router;
  private readonly controller = new Dominus360Controller();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.list);
    this.router.post('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(CreateDominusDto), this.controller.create);
    this.router.post(
      '/:id/run',
      authenticate,
      authSessionLimiter,
      validateParams(DominusRunParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(RunDominusDto),
      this.controller.run
    );
  }
}
