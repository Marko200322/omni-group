import type { z } from 'zod';
import { Request, Response } from 'express';
import { sendSuccess } from '../../../utils/response';
import { ReinvestmentService } from '../service/reinvestment.service';
import type {
  DecideApprovalBodyDto,
  EngineDryRunYearBodyDto,
  EngineRunBodyDto,
  PatchActivePolicyBodyDto,
  ProposeTransactionBodyDto,
  ReinvestmentListQueryDto,
  ReinvestmentAuditQueryDto,
  ScenarioBodyDto,
} from '../dto/reinvestment.dto';

type ListQuery = z.infer<typeof ReinvestmentListQueryDto>;
type AuditQuery = z.infer<typeof ReinvestmentAuditQueryDto>;
type ProposeBody = z.infer<typeof ProposeTransactionBodyDto>;
type DecideBody = z.infer<typeof DecideApprovalBodyDto>;
type PatchPolicyBody = z.infer<typeof PatchActivePolicyBodyDto>;
type ScenarioBody = z.infer<typeof ScenarioBodyDto>;
type EngineRunBody = z.infer<typeof EngineRunBodyDto>;
type DryRunYearBody = z.infer<typeof EngineDryRunYearBodyDto>;

function actor(req: Request) {
  return { userId: req.user!.userId, role: req.user!.role };
}

export class ReinvestmentController {
  private readonly service = new ReinvestmentService();

  getStatus = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.getStatus(actor(req));
    sendSuccess(res, data);
  };

  listOpportunities = async (req: Request, res: Response): Promise<void> => {
    const { limit, status } = req.query as unknown as ListQuery;
    const data = await this.service.listOpportunities(limit, status);
    sendSuccess(res, data);
  };

  getOpportunity = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.getOpportunity(req.params.id);
    sendSuccess(res, data);
  };

  listInvestments = async (req: Request, res: Response): Promise<void> => {
    const { limit } = req.query as unknown as ListQuery;
    const data = await this.service.listInvestments(limit);
    sendSuccess(res, data);
  };

  listBudgets = async (req: Request, res: Response): Promise<void> => {
    const { limit } = req.query as unknown as ListQuery;
    const data = await this.service.listBudgets(limit);
    sendSuccess(res, data);
  };

  listForecasts = async (req: Request, res: Response): Promise<void> => {
    const { limit } = req.query as unknown as ListQuery;
    const data = await this.service.listForecasts(limit);
    sendSuccess(res, data);
  };

  runScenario = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.runScenario(req.body as ScenarioBody, actor(req));
    sendSuccess(res, data);
  };

  listApprovals = async (req: Request, res: Response): Promise<void> => {
    const { limit, status } = req.query as unknown as ListQuery;
    const data = await this.service.listApprovals(limit, status);
    sendSuccess(res, data);
  };

  decideApproval = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.decideApproval(
      req.params.id,
      req.body as DecideBody,
      actor(req)
    );
    sendSuccess(res, data);
  };

  listTransactions = async (req: Request, res: Response): Promise<void> => {
    const { limit, status } = req.query as unknown as ListQuery;
    const data = await this.service.listTransactions(limit, status);
    sendSuccess(res, data);
  };

  proposeTransaction = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.proposeTransaction(req.body as ProposeBody, actor(req));
    sendSuccess(res, data);
  };

  listAudit = async (req: Request, res: Response): Promise<void> => {
    const { limit } = req.query as unknown as AuditQuery;
    const data = await this.service.listAudit(limit);
    sendSuccess(res, data);
  };

  listAlerts = async (req: Request, res: Response): Promise<void> => {
    const { limit } = req.query as unknown as ListQuery;
    const data = await this.service.listAlerts(limit);
    sendSuccess(res, data);
  };

  listPolicies = async (req: Request, res: Response): Promise<void> => {
    const { limit } = req.query as unknown as ListQuery;
    const data = await this.service.listPolicies(limit);
    sendSuccess(res, data);
  };

  patchActivePolicy = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.patchActivePolicy(req.body as PatchPolicyBody, actor(req));
    sendSuccess(res, data);
  };

  runEngine = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.runEngine(req.body as EngineRunBody, actor(req));
    sendSuccess(res, data);
  };

  dryRunYear = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.dryRunYear(req.body as DryRunYearBody, actor(req));
    sendSuccess(res, data);
  };
}
