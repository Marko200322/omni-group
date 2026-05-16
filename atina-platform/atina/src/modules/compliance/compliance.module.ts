import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { validateBody, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { ComplianceController } from './controller/compliance.controller';
import { ComplianceListQueryDto, RecordComplianceDto } from './dto/compliance.dto';

export class ComplianceModule implements IModule {
  name = 'Compliance';
  slug = 'compliance';
  version = '1.0.0';
  isCore = true;
  router: Router;
  private readonly controller = new ComplianceController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get(
      '/',
      authenticate,
      requireAdmin,
      validateQuery(ComplianceListQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.list
    );
    this.router.post('/', authenticate, requireAdmin, validateQuery(StrictEmptyQueryDto), validateBody(RecordComplianceDto), this.controller.record);
  }
}
