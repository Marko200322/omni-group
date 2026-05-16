import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { LoadBalancerService } from '../service/load-balancer.service';

export class LoadBalancerController {
  private readonly service = new LoadBalancerService();

  register = async (req: Request, res: Response): Promise<void> => {
    const d = req.body;
    const row = await this.service.register(d.nodeName, d.zone, d.capacityScore, d.metadata);
    sendCreated(res, row, 'Node registered');
  };

  list = async (_req: Request, res: Response): Promise<void> => {
    const rows = await this.service.list();
    sendSuccess(res, rows);
  };

  dispatch = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.dispatch(req.body.workloadKey);
    sendSuccess(res, data, 'Workload dispatched');
  };
}
