import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { authSessionLimiter } from '../../api/middleware/rate-limit.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { PackagePricingController } from './controller/package-pricing.controller';
import {
  CreatePackagePricingDto,
  PackagePricingRunParamsDto,
  RunPackagePricingDto,
} from './dto/package-pricing.dto';

export class PackagePricingModule implements IModule {
  name = 'Package Pricing';
  slug = 'package-pricing';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  private readonly controller = new PackagePricingController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.list);
    this.router.post('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(CreatePackagePricingDto), this.controller.create);
    this.router.post(
      '/:id/run',
      authenticate,
      authSessionLimiter,
      validateParams(PackagePricingRunParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(RunPackagePricingDto),
      this.controller.run
    );
  }
}
