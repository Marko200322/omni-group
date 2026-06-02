import { Request, Response, NextFunction } from 'express';
import { AiRagService } from '../service/ai-rag.service';
import type { IngestRagDtoType, SearchRagQueryDtoType } from '../dto/ai-rag.dto';

export class AiRagController {
  constructor(private readonly service: AiRagService) {}

  ingest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const body = req.body as IngestRagDtoType;
      const result = await this.service.ingest(userId, body);
      res.status(201).json(result);
    } catch (e) {
      next(e);
    }
  };

  search = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const query = req.query as unknown as SearchRagQueryDtoType;
      const result = await this.service.search(userId, query);
      res.json(result);
    } catch (e) {
      next(e);
    }
  };
}
