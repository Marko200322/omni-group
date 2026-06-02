import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { authSessionLimiter } from '../../api/middleware/rate-limit.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { ContractsController } from './controller/contracts.controller';
import {
  ContractIdParamsDto,
  ContractsListQueryDto,
  CreateContractDto,
  SignContractDto,
  UpdateContractDto,
} from './dto/contracts.dto';

/** @deprecated Import from `./dto/contracts.dto` */
export {
  ContractIdParamsDto,
  ContractsListQueryDto,
  CreateContractDto,
  SignContractDto,
  UpdateContractDto,
} from './dto/contracts.dto';

export class ContractsModule implements IModule {
  name = 'Contracts';
  slug = 'contracts';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  private readonly controller = new ContractsController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    const auth = [authenticate, authSessionLimiter];
    this.router.get(
      '/stats/overview',
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.statsOverview
    );
    this.router.get(
      '/',
      ...auth,
      validateQuery(ContractsListQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.list
    );
    this.router.get(
      '/:id',
      ...auth,
      validateParams(ContractIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getById
    );
    this.router.post('/', ...auth, validateQuery(StrictEmptyQueryDto), validateBody(CreateContractDto), this.controller.create);
    this.router.patch(
      '/:id',
      ...auth,
      validateParams(ContractIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(UpdateContractDto),
      this.controller.update
    );
    this.router.post(
      '/:id/sign',
      ...auth,
      validateParams(ContractIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(SignContractDto),
      this.controller.sign
    );
    this.router.post(
      '/:id/send',
      ...auth,
      validateParams(ContractIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.send
    );
    this.router.post(
      '/:id/cancel',
      ...auth,
      validateParams(ContractIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.cancel
    );
    this.router.delete(
      '/:id',
      ...auth,
      validateParams(ContractIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.deleteDraft
    );
  }
}
