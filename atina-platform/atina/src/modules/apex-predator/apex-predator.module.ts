import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { ApexPredatorController } from './controller/apex-predator.controller';
import { ApexPredatorRunParamsDto, CreateApexPredatorDto, RunApexPredatorDto } from './dto/apex-predator.dto';

export class ApexPredatorModule implements IModule {
  name = 'Apex Predator';
  slug = 'apex-predator';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'enterprise';
  router: Router;
  private readonly controller = new ApexPredatorController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.list);
    this.router.post('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(CreateApexPredatorDto), this.controller.create);
    this.router.post(
      '/:id/run',
      authenticate,
      validateParams(ApexPredatorRunParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(RunApexPredatorDto),
      this.controller.run
    );
    this.router.get('/admin/risk-grid', authenticate, requireAdmin, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.riskGrid);
  }
}
