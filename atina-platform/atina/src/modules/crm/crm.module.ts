import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { authSessionLimiter } from '../../api/middleware/rate-limit.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { CrmController } from './controller/crm.controller';
import {
  BulkImportContactsDto,
  ContactIdParamsDto,
  ContactQueryDto,
  CreateContactDto,
  UpdateContactDto,
} from './dto/crm.dto';

export class CrmModule implements IModule {
  name = 'CRM';
  slug = 'crm';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  private readonly controller = new CrmController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get(
      '/contacts',
      authenticate,
      authSessionLimiter,
      validateQuery(ContactQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listContacts
    );
    this.router.post(
      '/contacts/bulk',
      authenticate,
      authSessionLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(BulkImportContactsDto),
      this.controller.bulkImport
    );
    this.router.get(
      '/contacts/:id',
      authenticate,
      authSessionLimiter,
      validateParams(ContactIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getContact
    );
    this.router.post(
      '/contacts',
      authenticate,
      authSessionLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(CreateContactDto),
      this.controller.createContact
    );
    this.router.patch(
      '/contacts/:id',
      authenticate,
      authSessionLimiter,
      validateParams(ContactIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(UpdateContactDto),
      this.controller.updateContact
    );
    this.router.delete(
      '/contacts/:id',
      authenticate,
      authSessionLimiter,
      validateParams(ContactIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.deleteContact
    );
    this.router.get(
      '/stats',
      authenticate,
      authSessionLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.stats
    );
  }
}
