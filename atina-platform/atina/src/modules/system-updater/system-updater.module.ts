import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { z } from 'zod';
import { SystemUpdaterController } from './controller/system-updater.controller';
import { FinishUpdateDto, ListUpdaterJobsQueryDto, QueueUpdateDto } from './dto/system-updater.dto';

const UpdaterJobIdParamsDto = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

export class SystemUpdaterModule implements IModule {
  name = 'System Updater';
  slug = 'system-updater';
  version = '1.0.0';
  isCore = true;
  router: Router;
  private readonly controller = new SystemUpdaterController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get(
      '/jobs',
      authenticate,
      requireAdmin,
      validateQuery(ListUpdaterJobsQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.list
    );
    this.router.post('/jobs', authenticate, requireAdmin, validateQuery(StrictEmptyQueryDto), validateBody(QueueUpdateDto), this.controller.queue);
    this.router.post(
      '/jobs/:id/finish',
      authenticate,
      requireAdmin,
      validateParams(UpdaterJobIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(FinishUpdateDto),
      this.controller.finish
    );
  }
}
