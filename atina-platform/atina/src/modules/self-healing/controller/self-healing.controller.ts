import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { SelfHealingService } from '../service/self-healing.service';

export class SelfHealingController {
  private readonly service = new SelfHealingService();

  report = async (req: Request, res: Response): Promise<void> => {
    const d = req.body;
    const row = await this.service.report(d.subsystem, d.issueKey, d.details);
    sendCreated(res, row, 'Issue reported');
  };

  heal = async (req: Request, res: Response): Promise<void> => {
    const row = await this.service.heal(req.params.id, req.body.remediationAction, req.user!.userId);
    sendSuccess(res, row, 'Issue healed');
  };

  list = async (_req: Request, res: Response): Promise<void> => {
    const rows = await this.service.list();
    sendSuccess(res, rows);
  };

  autoScan = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.autoScan(req.user!.userId, req.body);
    sendSuccess(res, data, 'Auto-scan complete');
  };

  autoHeal = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.autoHeal(req.user!.userId, req.body.maxEvents);
    sendSuccess(res, data, 'Auto-heal complete');
  };
}
