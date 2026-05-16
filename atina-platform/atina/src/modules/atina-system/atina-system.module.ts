import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { AtinaSystemController } from './controller/atina-system.controller';
import { AtinaSystemRunParamsDto, CreateAtinaSystemDto, RunAtinaSystemDto } from './dto/atina-system.dto';

export class AtinaSystemModule implements IModule {
  name = 'Atina System';
  slug = 'atina-system';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  private readonly controller = new AtinaSystemController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get('/status', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.status);
    this.router.get('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.list);
    this.router.post('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(CreateAtinaSystemDto), this.controller.create);
    this.router.post(
      '/:id/run',
      authenticate,
      validateParams(AtinaSystemRunParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(RunAtinaSystemDto),
      this.controller.run
    );
  }
}
