import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { ProxyRotationService } from '../service/proxy-rotation.service';

export class ProxyRotationController {
  private readonly service = new ProxyRotationService();

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
    sendCreated(res, data, 'Proxy Rotation workspace created');
  };

  run = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.run(req.params.id, req.user!.userId, req.body);
    sendSuccess(res, data, 'Proxy Rotation run completed');
  };
}
