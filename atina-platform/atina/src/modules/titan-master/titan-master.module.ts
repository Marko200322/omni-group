import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { TitanMasterController } from './controller/titan-master.controller';
import {
  CreateTitanMasterDto,
  RunTitanMasterDto,
  TitanMasterIdParamDto,
} from './dto/titan-master.dto';

export class TitanMasterModule implements IModule {
  name = 'Titan Master';
  slug = 'titan-master';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'enterprise';
  router: Router;
  private readonly controller = new TitanMasterController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.get('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.list);
    this.router.post('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(CreateTitanMasterDto), this.controller.create);
    this.router.post(
      '/:id/run',
      authenticate,
      validateParams(TitanMasterIdParamDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(RunTitanMasterDto),
      this.controller.run
    );
    this.router.get('/admin/overview', authenticate, requireAdmin, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.adminOverview);
  }
}
