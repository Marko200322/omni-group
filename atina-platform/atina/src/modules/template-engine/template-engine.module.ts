import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { validateBody, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { TemplateEngineController } from './controller/template-engine.controller';
import { RenderTemplateDto } from './dto/template-engine.dto';

export class TemplateEngineModule implements IModule {
  name = 'Template Engine';
  slug = 'template-engine';
  version = '1.0.0';
  isCore = false;
  router: Router;
  private readonly controller = new TemplateEngineController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get(
      '/status',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.status
    );
    this.router.post('/render', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(RenderTemplateDto), this.controller.render);
  }
}
