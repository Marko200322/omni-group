import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { TitanixController } from './controller/titanix.controller';
import { CreateTitanixWorkspaceDto, RunTitanixDto, TitanixRunParamsDto } from './dto/titanix.dto';

export class TitanixModule implements IModule {
  name = 'Titanix Execution Engine';
  slug = 'titanix';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'enterprise';
  router: Router;
  private readonly controller = new TitanixController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.list);
    this.router.post('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(CreateTitanixWorkspaceDto), this.controller.create);
    this.router.post(
      '/:id/run',
      authenticate,
      validateParams(TitanixRunParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(RunTitanixDto),
      this.controller.run
    );
  }
}
