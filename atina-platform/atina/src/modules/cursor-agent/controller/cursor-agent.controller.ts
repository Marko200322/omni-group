import { Request, Response } from 'express';
import { sendSuccess } from '../../../utils/response';
import { CursorAgentService } from '../service/cursor-agent.service';

export class CursorAgentController {
  private readonly service = new CursorAgentService();

  status = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, this.service.getStatus());
  };

  listRuns = async (req: Request, res: Response): Promise<void> => {
    const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 50);
    sendSuccess(res, await this.service.listRuns(limit));
  };

  run = async (req: Request, res: Response): Promise<void> => {
    const prompt = String(req.body?.prompt ?? '').trim();
    const source = req.body?.source === 'mobile' ? 'mobile' : 'manual';
    if (!prompt || prompt.length < 8) {
      res.status(400).json({ success: false, message: 'prompt must be at least 8 characters' });
      return;
    }
    if (prompt.length > 12_000) {
      res.status(400).json({ success: false, message: 'prompt too long' });
      return;
    }
    const data = await this.service.runPrompt(req.user!.userId, prompt, source);
    sendSuccess(res, data, data.started ? 'Cursor agent started' : 'Cursor agent not configured');
  };
}
