import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { ProxyRotationController } from './controller/proxy-rotation.controller';
import { CreateProxyRotationDto, ProxyRotationRunParamsDto, RunProxyRotationDto } from './dto/proxy-rotation.dto';

export class ProxyRotationModule implements IModule {
  name = 'Proxy & Rotation';
  slug = 'proxy-rotation';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  private readonly controller = new ProxyRotationController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get('/status', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.status);
    this.router.get('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.list);
    this.router.post('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(CreateProxyRotationDto), this.controller.create);
    this.router.post(
      '/:id/run',
      authenticate,
      validateParams(ProxyRotationRunParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(RunProxyRotationDto),
      this.controller.run
    );
  }
}
