import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { authSessionLimiter } from '../../api/middleware/rate-limit.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { DigitalSignatureController } from './controller/digital-signature.controller';
import {
  CreateDigitalSignatureDto,
  DigitalSignatureRunParamsDto,
  RunDigitalSignatureDto,
} from './dto/digital-signature.dto';

export class DigitalSignatureModule implements IModule {
  name = 'Digital Signature';
  slug = 'digital-signature';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  private readonly controller = new DigitalSignatureController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.list);
    this.router.post('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(CreateDigitalSignatureDto), this.controller.create);
    this.router.post(
      '/:id/run',
      authenticate,
      authSessionLimiter,
      validateParams(DigitalSignatureRunParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(RunDigitalSignatureDto),
      this.controller.run
    );
  }
}
