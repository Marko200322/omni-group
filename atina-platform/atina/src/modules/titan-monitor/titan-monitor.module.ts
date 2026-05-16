import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { validateBody, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { TitanMonitorController } from './controller/titan-monitor.controller';

export class TitanMonitorModule implements IModule {
  name = 'Titan Monitor';
  slug = 'titan-monitor';
  version = '1.0.0';
  isCore = true;
  router: Router;
  private readonly controller = new TitanMonitorController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get(
      '/snapshot',
      authenticate,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.snapshot
    );
  }
}
