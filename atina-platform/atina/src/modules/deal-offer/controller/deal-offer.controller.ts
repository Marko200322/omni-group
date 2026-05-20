import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { DealOfferService } from '../service/deal-offer.service';

export class DealOfferController {
  private readonly service = new DealOfferService();

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
    sendCreated(res, data, 'Deal Offer workspace created');
  };

  run = async (req: Request, res: Response): Promise<void> => {
    const idempotencyKey = req.header('Idempotency-Key');
    const data = await this.service.run(req.params.id, req.user!.userId, req.body, idempotencyKey);
    sendSuccess(res, data, 'Deal Offer run completed');
  };
}
