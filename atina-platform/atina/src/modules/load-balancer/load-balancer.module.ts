import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { validateBody, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { LoadBalancerController } from './controller/load-balancer.controller';
import { DispatchDto, RegisterNodeDto } from './dto/load-balancer.dto';

export class LoadBalancerModule implements IModule {
  name = 'Load Balancer';
  slug = 'load-balancer';
  version = '1.0.0';
  isCore = true;
  router: Router;
  private readonly controller = new LoadBalancerController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get(
      '/nodes',
      authenticate,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.list
    );
    this.router.post('/nodes', authenticate, requireAdmin, validateQuery(StrictEmptyQueryDto), validateBody(RegisterNodeDto), this.controller.register);
    this.router.post('/dispatch', authenticate, requireAdmin, validateQuery(StrictEmptyQueryDto), validateBody(DispatchDto), this.controller.dispatch);
  }
}
