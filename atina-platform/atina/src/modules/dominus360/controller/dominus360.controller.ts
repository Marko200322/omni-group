import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { Dominus360Service } from '../service/dominus360.service';

export class Dominus360Controller {
  private readonly service = new Dominus360Service();

  submodules = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, this.service.getSubmodules(), 'Dominus360 submodule registry');
  };

  list = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.list(req.user!.userId));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const row = await this.service.create(req.user!.userId, req.body);
    sendCreated(res, row, 'Dominus360 workspace created');
  };

  run = async (req: Request, res: Response): Promise<void> => {
    const row = await this.service.run(req.params.id, req.user!.userId, req.body);
    sendSuccess(res, row, 'Dominus360 run completed');
  };
}
