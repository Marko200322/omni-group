import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import type { CreateAlertDtoType } from '../dto/alert-system.dto';
import { AlertSystemService } from '../service/alert-system.service';

export class AlertSystemController {
  private readonly service = new AlertSystemService();

  list = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.list(req.user!.userId, req.query as never);
    sendSuccess(res, data);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.create(req.user!.userId, req.body as CreateAlertDtoType);
    sendCreated(res, data, 'Alert created');
  };

  acknowledge = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.acknowledge(req.params.id, req.user!.userId);
    sendSuccess(res, data, 'Alert acknowledged');
  };

  resolve = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.resolve(req.params.id, req.user!.userId);
    sendSuccess(res, data, 'Alert resolved');
  };

  summary = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.summary(req.user!.userId);
    sendSuccess(res, data);
  };

  listOpenAdmin = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.service.listOpenAdmin();
    sendSuccess(res, data);
  };
}
