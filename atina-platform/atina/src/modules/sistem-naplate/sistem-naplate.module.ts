import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { SistemNaplateController } from './controller/sistem-naplate.controller';
import {
  CreateSistemNaplateWorkspaceDto,
  RunSistemNaplateDto,
  SistemNaplateRunParamsDto,
} from './dto/sistem-naplate.dto';

export class SistemNaplateModule implements IModule {
  name = 'Sistem Naplate Engine';
  slug = 'sistem-naplate';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  private readonly controller = new SistemNaplateController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.list);
    this.router.post('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(CreateSistemNaplateWorkspaceDto), this.controller.create);
    this.router.post(
      '/:id/run',
      authenticate,
      validateParams(SistemNaplateRunParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(RunSistemNaplateDto),
      this.controller.run
    );
  }
}
