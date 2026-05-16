import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { z } from 'zod';
import { SelfHealingController } from './controller/self-healing.controller';
import { AutoHealDto, AutoScanDto, HealIssueDto, ReportIssueDto } from './dto/self-healing.dto';

const SelfHealingEventIdParamsDto = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

export class SelfHealingModule implements IModule {
  name = 'Self-Healing Supervisor';
  slug = 'self-healing';
  version = '1.0.0';
  isCore = true;
  router: Router;
  private readonly controller = new SelfHealingController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get(
      '/events',
      authenticate,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.list
    );
    this.router.post('/events', authenticate, requireAdmin, validateQuery(StrictEmptyQueryDto), validateBody(ReportIssueDto), this.controller.report);
    this.router.post(
      '/events/:id/heal',
      authenticate,
      requireAdmin,
      validateParams(SelfHealingEventIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(HealIssueDto),
      this.controller.heal
    );
    this.router.post('/auto-scan', authenticate, requireAdmin, validateQuery(StrictEmptyQueryDto), validateBody(AutoScanDto), this.controller.autoScan);
    this.router.post('/auto-heal', authenticate, requireAdmin, validateQuery(StrictEmptyQueryDto), validateBody(AutoHealDto), this.controller.autoHeal);
  }
}
