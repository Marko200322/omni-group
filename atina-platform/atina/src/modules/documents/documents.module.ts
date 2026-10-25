import { Router } from 'express';
import { z } from 'zod';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { authSessionLimiter } from '../../api/middleware/rate-limit.middleware';
import { validateBody, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { DocumentsController } from './controller/documents.controller';
import { DocumentsService } from './service/documents.service';

const DocumentsListQueryDto = z
  .object({
    page: z.coerce.number().int().min(1).catch(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

/** Client document library — invoices / payment receipts (VAT-ready when Marko sets legal entity). */
export class DocumentsModule implements IModule {
  name = 'Documents';
  slug = 'documents';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  private readonly service = new DocumentsService();
  private readonly controller = new DocumentsController(this.service);

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get(
      '/',
      authenticate,
      authSessionLimiter,
      validateQuery(DocumentsListQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.list,
    );
  }
}
