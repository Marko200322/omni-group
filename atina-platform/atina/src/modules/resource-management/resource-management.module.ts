import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { validateBody, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { ResourceManagementController } from './controller/resource-management.controller';
import { AllocateBudgetDto } from './dto/resource-management.dto';

export class ResourceManagementModule implements IModule {
  name = 'Resource Management';
  slug = 'resource-management';
  version = '1.0.0';
  isCore = true;
  router: Router;
  private readonly controller = new ResourceManagementController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get(
      '/overview',
      authenticate,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.overview
    );
    this.router.post(
      '/allocate',
      authenticate,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(AllocateBudgetDto),
      this.controller.allocate
    );
  }
}
