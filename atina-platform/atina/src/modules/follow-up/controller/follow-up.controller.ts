import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { FollowUpService } from '../service/follow-up.service';

export class FollowUpController {
  private readonly service = new FollowUpService();

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
    sendCreated(res, data, 'Follow-up workspace created');
  };

  run = async (req: Request, res: Response): Promise<void> => {
    const idempotencyKey = req.header('Idempotency-Key');
    const data = await this.service.run(req.params.id, req.user!.userId, req.body, idempotencyKey);
    sendSuccess(res, data, 'Follow-up run completed');
  };
}
