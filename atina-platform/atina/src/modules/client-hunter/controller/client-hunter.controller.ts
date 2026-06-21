import { Request, Response } from 'express';
import { normalizeIdempotencyKeyHeader } from '../../../utils/ecosystem-idempotency';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { getLeadDatabaseService } from '../../../integrations';
import { ClientHunterService } from '../service/client-hunter.service';
import { HuntingStackService } from '../service/hunting-stack.service';
import { generateJobHuntEmail, EXAMPLE_GERMAN_JOB_POSTING } from '../lib/job-hunt-copy';

export class ClientHunterController {
  private readonly service = new ClientHunterService();
  private readonly huntingStack = new HuntingStackService();
  private readonly leadDb = getLeadDatabaseService();

  status = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.service.status();
    sendSuccess(res, data);
  };

  leadDatabaseStatus = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, this.leadDb.getStatus());
  };

  readiness = async (req: Request, res: Response): Promise<void> => {
    const data = await this.huntingStack.getReadiness(req.user!.userId);
    sendSuccess(res, data);
  };

  bootstrap = async (req: Request, res: Response): Promise<void> => {
    const data = await this.huntingStack.bootstrap(req.user!.userId);
    sendSuccess(res, data, 'Hunting workspaces bootstrapped');
  };

  runPipeline = async (req: Request, res: Response): Promise<void> => {
    const data = await this.huntingStack.runPipeline(req.user!.userId, req.body);
    sendSuccess(res, data, 'Hunting pipeline completed');
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.list(req.user!.userId);
    sendSuccess(res, data);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.create(req.user!.userId, req.body);
    sendCreated(res, data, 'Client Hunter workspace created');
  };

  run = async (req: Request, res: Response): Promise<void> => {
    const idempotencyKey = normalizeIdempotencyKeyHeader(req.header('Idempotency-Key'));
    const data = await this.service.run(req.params.id, req.user!.userId, req.body, idempotencyKey || undefined);
    sendSuccess(res, data, 'Client Hunter run completed');
  };

  /** Instant preview: German job posting → Gemini surgical email (see test_pipeline.py). */
  previewGermanJobEmail = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as {
      jobPostingText?: string;
      locale?: string;
      companyName?: string;
      city?: string;
      roleTitle?: string;
      salaryGrossMonthlyEur?: number;
      atinaPriceRatio?: number;
      senderName?: string;
    };
    const email = await generateJobHuntEmail({
      jobPostingText: body.jobPostingText ?? EXAMPLE_GERMAN_JOB_POSTING,
      locale: body.locale ?? 'de',
      companyName: body.companyName,
      city: body.city,
      roleTitle: body.roleTitle,
      salaryGrossMonthlyEur: body.salaryGrossMonthlyEur,
      atinaPriceRatio: body.atinaPriceRatio,
      senderName: body.senderName,
    });
    sendSuccess(res, email, 'Job hunt email generated');
  };

  jobBoards = async (req: Request, res: Response): Promise<void> => {
    const q = req.query as { region?: string; locale?: string; kind?: string };
    const data = await this.service.listJobBoards({
      region: q.region,
      locale: q.locale,
      kind: q.kind,
    });
    sendSuccess(res, data);
  };

  hotClients = async (req: Request, res: Response): Promise<void> => {
    const q = req.query as { limit?: string; minHeat?: string };
    const limit = q.limit ? parseInt(q.limit, 10) : 50;
    const minHeat = q.minHeat ? parseInt(q.minHeat, 10) : undefined;
    const data = await this.service.listHotClients(req.user!.userId, { limit, minHeat });
    sendSuccess(res, data);
  };
}
