import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { adminMutationLimiter, authSessionLimiter } from '../../api/middleware/rate-limit.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { ResourceProcurementController } from './controller/resource-procurement.controller';
import {
  ResourceAutoToggleDto,
  ResourceCheckoutDto,
  ResourceOrderIdParamsDto,
} from './dto/resource-procurement.dto';

export class ResourceProcurementModule implements IModule {
  name = 'Resource Procurement';
  slug = 'resource-procurement';
  version = '1.0.0';
  isCore = true;
  router: Router;
  private readonly controller = new ResourceProcurementController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    const auth = [authenticate, requireAdmin, authSessionLimiter];

    this.router.get(
      '/catalog',
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.catalog
    );

    this.router.get(
      '/settings',
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.settings
    );

    this.router.patch(
      '/settings/auto',
      ...auth,
      adminMutationLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(ResourceAutoToggleDto),
      this.controller.setAutoProcurement
    );

    this.router.get(
      '/orders',
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listOrders
    );

    this.router.post(
      '/orders/checkout',
      ...auth,
      adminMutationLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(ResourceCheckoutDto),
      this.controller.checkout
    );

    this.router.post(
      '/orders/:id/mark-paid',
      ...auth,
      adminMutationLimiter,
      validateParams(ResourceOrderIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.markPaid
    );

    this.router.post(
      '/orders/:id/confirm',
      ...auth,
      adminMutationLimiter,
      validateParams(ResourceOrderIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.confirmPaid
    );

    this.router.post(
      '/auto/check',
      ...auth,
      adminMutationLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.runAutoCheck
    );
  }
}
