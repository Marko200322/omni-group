import { Request, Response } from 'express';
import { sendSuccess } from '../../../utils/response';
import { PhaseLaunchService } from '../service/phase-launch.service';

export class PhaseLaunchController {
  private readonly service = new PhaseLaunchService();

  get = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.service.getCurrentPhase();
    sendSuccess(res, data);
  };

  set = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.setCurrentPhaseWithAudit(req.user!.userId, req.body);
    sendSuccess(res, data, 'Phase updated');
  };
}
