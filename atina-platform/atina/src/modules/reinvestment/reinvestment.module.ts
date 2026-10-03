import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { ReinvestmentController } from './controller/reinvestment.controller';
import {
  DecideApprovalBodyDto,
  EngineDryRunYearBodyDto,
  EngineRunBodyDto,
  PatchActivePolicyBodyDto,
  ProposeTransactionBodyDto,
  ReinvestmentAuditQueryDto,
  ReinvestmentIdParamsDto,
  ReinvestmentListQueryDto,
  ScenarioBodyDto,
} from './dto/reinvestment.dto';

export class ReinvestmentModule implements IModule {
  name = 'Reinvestment Engine';
  slug = 'reinvestment';
  version = '1.0.0';
  isCore = true;
  router: Router;
  private readonly controller = new ReinvestmentController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    const auth = [authenticate, requireAdmin];

    this.router.get(
      '/status',
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getStatus
    );

    this.router.get(
      '/opportunities',
      ...auth,
      validateQuery(ReinvestmentListQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listOpportunities
    );

    this.router.get(
      '/opportunities/:id',
      ...auth,
      validateParams(ReinvestmentIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getOpportunity
    );

    this.router.get(
      '/investments',
      ...auth,
      validateQuery(ReinvestmentListQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listInvestments
    );

    this.router.get(
      '/budgets',
      ...auth,
      validateQuery(ReinvestmentListQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listBudgets
    );

    this.router.get(
      '/forecast',
      ...auth,
      validateQuery(ReinvestmentListQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listForecasts
    );

    this.router.post(
      '/scenarios',
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(ScenarioBodyDto),
      this.controller.runScenario
    );

    this.router.get(
      '/approvals',
      ...auth,
      validateQuery(ReinvestmentListQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listApprovals
    );

    this.router.post(
      '/approvals/:id/decide',
      ...auth,
      validateParams(ReinvestmentIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(DecideApprovalBodyDto),
      this.controller.decideApproval
    );

    this.router.get(
      '/transactions',
      ...auth,
      validateQuery(ReinvestmentListQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listTransactions
    );

    this.router.post(
      '/transactions',
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(ProposeTransactionBodyDto),
      this.controller.proposeTransaction
    );

    this.router.get(
      '/audit',
      ...auth,
      validateQuery(ReinvestmentAuditQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listAudit
    );

    this.router.get(
      '/alerts',
      ...auth,
      validateQuery(ReinvestmentListQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listAlerts
    );

    this.router.get(
      '/policies',
      ...auth,
      validateQuery(ReinvestmentListQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listPolicies
    );

    this.router.patch(
      '/policies/active',
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(PatchActivePolicyBodyDto),
      this.controller.patchActivePolicy
    );

    this.router.post(
      '/engine/run',
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(EngineRunBodyDto),
      this.controller.runEngine
    );

    this.router.post(
      '/engine/dry-run-year',
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(EngineDryRunYearBodyDto),
      this.controller.dryRunYear
    );
  }
}
