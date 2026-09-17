import { Request, Response } from 'express';
import { sendSuccess } from '../../../utils/response';
import { ProblemHunterService } from '../service/problem-hunter.service';

export class ProblemHunterController {
  private readonly service = new ProblemHunterService();

  status = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.status());
  };

  listSignals = async (req: Request, res: Response): Promise<void> => {
    const q = req.query as { minScore?: string; industryCategory?: string; limit?: string };
    const data = await this.service.listSignals(req.user!.userId, {
      minScore: q.minScore != null ? Number(q.minScore) : undefined,
      industry: q.industryCategory,
      limit: q.limit != null ? Number(q.limit) : undefined,
    });
    sendSuccess(res, data);
  };

  runSearch = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.runSearch(req.user!.userId, req.body);
    sendSuccess(res, data, 'Problem search completed');
  };
}
