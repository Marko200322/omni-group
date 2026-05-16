import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { ValidatorController } from './controller/validator.controller';
import { CreateValidatorDto, RunValidatorDto, ValidatorRunParamsDto } from './dto/validator.dto';

export class ValidatorModule implements IModule {
  name = 'Validator';
  slug = 'validator';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  private readonly controller = new ValidatorController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get('/status', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.status);
    this.router.get('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.list);
    this.router.post('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(CreateValidatorDto), this.controller.create);
    this.router.post(
      '/:id/run',
      authenticate,
      validateParams(ValidatorRunParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(RunValidatorDto),
      this.controller.run
    );
  }
}
