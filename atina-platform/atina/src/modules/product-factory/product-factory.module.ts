import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { authSessionLimiter } from '../../api/middleware/rate-limit.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { ProductFactoryController } from './controller/product-factory.controller';
import {
  CreateProductFactoryProjectDto,
  ProductFactoryListQueryDto,
  ProductFactoryProjectIdParamsDto,
} from './dto/product-factory.dto';

export class ProductFactoryModule implements IModule {
  name = 'Product Factory';
  slug = 'product-factory';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  private readonly controller = new ProductFactoryController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    const auth = [authenticate, authSessionLimiter];

    this.router.get(
      '/stats',
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.stats
    );
    this.router.get(
      '/projects',
      ...auth,
      validateQuery(ProductFactoryListQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.list
    );
    this.router.get(
      '/projects/:id',
      ...auth,
      validateParams(ProductFactoryProjectIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getById
    );
    this.router.post(
      '/projects',
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(CreateProductFactoryProjectDto),
      this.controller.create
    );
    this.router.post(
      '/projects/:id/build',
      ...auth,
      validateParams(ProductFactoryProjectIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.build
    );
    this.router.post(
      '/projects/:id/test',
      ...auth,
      validateParams(ProductFactoryProjectIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.test
    );
    this.router.post(
      '/projects/:id/deploy-prep',
      ...auth,
      validateParams(ProductFactoryProjectIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.deployPrep
    );
    this.router.post(
      '/internal/tick',
      authenticate,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.internalTick
    );
  }
}
