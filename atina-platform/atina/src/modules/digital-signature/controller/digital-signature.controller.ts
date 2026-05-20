import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { DigitalSignatureService } from '../service/digital-signature.service';

export class DigitalSignatureController {
  private readonly service = new DigitalSignatureService();

  list = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.list(req.user!.userId));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const row = await this.service.create(req.user!.userId, req.body);
    sendCreated(res, row, 'Digital signature workspace created');
  };

  run = async (req: Request, res: Response): Promise<void> => {
    const row = await this.service.run(req.params.id, req.user!.userId, req.body);
    sendSuccess(res, row, 'Digital signature cycle completed');
  };
}
