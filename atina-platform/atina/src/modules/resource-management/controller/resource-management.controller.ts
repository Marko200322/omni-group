import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { ResourceManagementService } from '../service/resource-management.service';

export class ResourceManagementController {
  private readonly service = new ResourceManagementService();

  overview = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.service.getOverview();
    sendSuccess(res, data);
  };

  allocate = async (req: Request, res: Response): Promise<void> => {
    const d = req.body;
    const userId = req.user!.userId;
    const result = await this.service.allocateBudget(userId, d);
    sendCreated(res, result, 'Budget allocation applied');
  };
}
