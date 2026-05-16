import { Request, Response } from 'express';
import { normalizeIdempotencyKeyHeader } from '../../../utils/ecosystem-idempotency';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { ClientHunterService } from '../service/client-hunter.service';

export class ClientHunterController {
  private readonly service = new ClientHunterService();

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
    sendCreated(res, data, 'Client Hunter workspace created');
  };

  run = async (req: Request, res: Response): Promise<void> => {
    const idempotencyKey = normalizeIdempotencyKeyHeader(req.header('Idempotency-Key'));
    const data = await this.service.run(req.params.id, req.user!.userId, req.body, idempotencyKey || undefined);
    sendSuccess(res, data, 'Client Hunter run completed');
  };
}
