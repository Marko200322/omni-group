import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requirePermission } from '../../api/middleware/auth.middleware';
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
    const read = [...auth, requirePermission('documents.read')];
    const write = [...auth, requirePermission('documents.write')];
    this.router.get(
      '/stats/overview',
      ...read,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.statsOverview
    );
    this.router.get(
      '/',
      ...read,
      validateQuery(ContractsListQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.list
    );
    this.router.get(
      '/:id',
      ...read,
      validateParams(ContractIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getById
    );
    this.router.post('/', ...write, validateQuery(StrictEmptyQueryDto), validateBody(CreateContractDto), this.controller.create);
    this.router.patch(
      '/:id',
      ...write,
      validateParams(ContractIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(UpdateContractDto),
      this.controller.update
    );
    this.router.post(
      '/:id/sign',
      ...write,
      validateParams(ContractIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(SignContractDto),
      this.controller.sign
    );
    this.router.post(
      '/:id/send',
      ...write,
      validateParams(ContractIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.send
    );
    this.router.post(
      '/:id/cancel',
      ...write,
      validateParams(ContractIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.cancel
    );
    this.router.delete(
      '/:id',
      ...write,
      validateParams(ContractIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.deleteDraft
    );
  }
}
