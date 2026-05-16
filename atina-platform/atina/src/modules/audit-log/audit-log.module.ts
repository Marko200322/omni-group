import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { validateBody, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { AuditLogController } from './controller/audit-log.controller';
import { RecordAuditEventDto } from './dto/audit-log.dto';

export class AuditLogModule implements IModule {
  name = 'Audit Log';
  slug = 'audit-log';
  version = '1.0.0';
  isCore = true;
  router: Router;
  private readonly controller = new AuditLogController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get(
      '/',
      authenticate,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.list
    );
    this.router.post('/', authenticate, requireAdmin, validateQuery(StrictEmptyQueryDto), validateBody(RecordAuditEventDto), this.controller.record);
  }
}
