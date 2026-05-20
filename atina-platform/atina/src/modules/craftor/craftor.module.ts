import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { authSessionLimiter } from '../../api/middleware/rate-limit.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { CRAFTOR_VERSION } from './craftor.constants';
import { CraftorController } from './controller/craftor.controller';
import { CreateCraftorDto, CraftorRunParamsDto, RunCraftorDto } from './dto/craftor.dto';

export class CraftorModule implements IModule {
  name = 'Craftor';
  slug = 'craftor';
  version = CRAFTOR_VERSION;
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  private readonly controller = new CraftorController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get(
      '/catalog',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.catalog
    );
    this.router.get('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.list);
    this.router.post('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(CreateCraftorDto), this.controller.create);
    this.router.post(
      '/:id/run',
      authenticate,
      authSessionLimiter,
      validateParams(CraftorRunParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(RunCraftorDto),
      this.controller.run
    );
  }
}
