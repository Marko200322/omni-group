import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { validateBody, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { MarketingGrowthController } from './controller/marketing-growth.controller';

export class MarketingGrowthModule implements IModule {
  name = 'Marketing Growth';
  slug = 'marketing-growth';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  private readonly controller = new MarketingGrowthController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get(
      '/status',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.status,
    );
  }
}
