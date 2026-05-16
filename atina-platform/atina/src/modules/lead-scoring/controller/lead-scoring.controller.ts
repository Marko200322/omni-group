import { Request, Response } from 'express';
import { normalizeIdempotencyKeyHeader } from '../../../utils/ecosystem-idempotency';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { LeadScoringService } from '../service/lead-scoring.service';

export class LeadScoringController {
  private readonly service = new LeadScoringService();

  status = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.service.status();
    sendSuccess(res, data);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.list(req.user!.userId);
    sendSuccess(res, data);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.create(req.user!.userId, req.body);
    sendCreated(res, data, 'Lead Scoring workspace created');
  };

  run = async (req: Request, res: Response): Promise<void> => {
    const idempotencyKey = normalizeIdempotencyKeyHeader(req.header('Idempotency-Key'));
    const data = await this.service.run(req.params.id, req.user!.userId, req.body, idempotencyKey || undefined);
    sendSuccess(res, data, 'Lead Scoring run completed');
  };
}
