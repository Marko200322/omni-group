import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { AiMemoryService } from '../service/ai-memory.service';

export class AiMemoryController {
  private readonly service = new AiMemoryService();

  remember = async (req: Request, res: Response): Promise<void> => {
    const row = await this.service.remember(req.user!.userId, req.body);
    sendCreated(res, row, 'Memory stored');
  };

  recall = async (req: Request, res: Response): Promise<void> => {
    const rows = await this.service.recall(req.user!.userId, req.query as never);
    sendSuccess(res, rows);
  };
}
