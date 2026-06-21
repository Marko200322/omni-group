import { Request, Response } from 'express';
import { normalizeIdempotencyKeyHeader } from '../../../utils/ecosystem-idempotency';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { getLeadDatabaseService } from '../../../integrations';
import { ClientHunterService } from '../service/client-hunter.service';
import { HuntingStackService } from '../service/hunting-stack.service';

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
}
