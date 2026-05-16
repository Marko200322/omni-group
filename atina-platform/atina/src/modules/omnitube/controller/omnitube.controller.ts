import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { OmniTubeService } from '../service/omnitube.service';

export class OmniTubeController {
  private readonly service = new OmniTubeService();

  list = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.list(req.user!.userId);
    sendSuccess(res, data);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.create(req.user!.userId, req.body);
    sendCreated(res, data, 'OmniTube channel created');
  };

  run = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.run(req.params.id, req.user!.userId, req.body);
    sendSuccess(res, data, 'OmniTube cycle completed');
  };
}
