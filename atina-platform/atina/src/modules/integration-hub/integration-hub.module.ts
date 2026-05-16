import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { validateBody, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { IntegrationHubController } from './controller/integration-hub.controller';
import { CreateIntegrationDto, SyncIntegrationDto } from './dto/integration-hub.dto';

export class IntegrationHubModule implements IModule {
  name = 'Integration Hub';
  slug = 'integration-hub';
  version = '1.0.0';
  isCore = true;
  router: Router;
  private readonly controller = new IntegrationHubController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get(
      '/',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.list
    );
    this.router.post('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(CreateIntegrationDto), this.controller.create);
    this.router.post('/sync', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(SyncIntegrationDto), this.controller.sync);
  }
}
