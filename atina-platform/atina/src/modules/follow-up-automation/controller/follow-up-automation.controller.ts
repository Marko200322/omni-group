import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { FollowUpAutomationService } from '../service/follow-up-automation.service';

export class FollowUpAutomationController {
  private readonly service = new FollowUpAutomationService();

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
    sendCreated(res, data, 'Follow-up Automation workspace created');
  };

  run = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.run(req.params.id, req.user!.userId, req.body);
    sendSuccess(res, data, 'Follow-up Automation run completed');
  };
}
