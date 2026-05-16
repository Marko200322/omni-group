import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { GdprController } from './controller/gdpr.controller';
import {
  CreateGdprRequestDto,
  GdprListAllQueryDto,
  GdprListMineQueryDto,
  GdprProcessIdParamsDto,
  ProcessGdprRequestDto,
} from './dto/gdpr.dto';

export class GdprModule implements IModule {
  name = 'GDPR';
  slug = 'gdpr';
  version = '1.0.0';
  isCore = true;
  router: Router;
  private readonly controller = new GdprController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get(
      '/mine',
      authenticate,
      validateQuery(GdprListMineQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listMine
    );
    this.router.post('/request', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(CreateGdprRequestDto), this.controller.create);
    this.router.get(
      '/admin/all',
      authenticate,
      requireAdmin,
      validateQuery(GdprListAllQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listAll
    );
    this.router.post(
      '/admin/:id/process',
      authenticate,
      requireAdmin,
      validateParams(GdprProcessIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(ProcessGdprRequestDto),
      this.controller.process
    );
  }
}
