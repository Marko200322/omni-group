import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { PackagePricingService } from '../service/package-pricing.service';

export class PackagePricingController {
  private readonly service = new PackagePricingService();

  list = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.list(req.user!.userId));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const row = await this.service.create(req.user!.userId, req.body);
    sendCreated(res, row, 'Package pricing workspace created');
  };

  run = async (req: Request, res: Response): Promise<void> => {
    const row = await this.service.run(req.params.id, req.user!.userId, req.body);
    sendSuccess(res, row, 'Package pricing run completed');
  };
}
