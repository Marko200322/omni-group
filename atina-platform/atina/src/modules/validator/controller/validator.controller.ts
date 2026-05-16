import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { ValidatorService } from '../service/validator.service';

export class ValidatorController {
  private readonly service = new ValidatorService();

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
    sendCreated(res, data, 'Validator workspace created');
  };

  run = async (req: Request, res: Response): Promise<void> => {
    const idempotencyKey = req.header('Idempotency-Key');
    const data = await this.service.run(req.params.id, req.user!.userId, req.body, idempotencyKey);
    sendSuccess(res, data, 'Validator run completed');
  };
}
