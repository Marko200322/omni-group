import { Request, Response } from 'express';
import { sendSuccess } from '../../../utils/response';
import { DocumentsService } from '../service/documents.service';

export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const data = await this.service.listForUser(req.user!.userId, page, limit);
    sendSuccess(res, data, 'Success', 200, {
      page,
      limit,
      total: data.total,
      totalPages: Math.max(1, Math.ceil(data.total / limit)),
    });
  };
}
