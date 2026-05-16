import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { validateBody, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { ApiGatewayController } from './controller/api-gateway.controller';
import { ProxyRouteDto, RegisterGatewayRouteDto } from './dto/api-gateway.dto';

export class ApiGatewayModule implements IModule {
  name = 'API Gateway';
  slug = 'api-gateway';
  version = '1.0.0';
  isCore = true;
  router: Router;
  private readonly controller = new ApiGatewayController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get(
      '/routes',
      authenticate,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.list
    );
    this.router.post('/routes', authenticate, requireAdmin, validateQuery(StrictEmptyQueryDto), validateBody(RegisterGatewayRouteDto), this.controller.register);
    this.router.post('/proxy', authenticate, requireAdmin, validateQuery(StrictEmptyQueryDto), validateBody(ProxyRouteDto), this.controller.proxy);
  }
}
