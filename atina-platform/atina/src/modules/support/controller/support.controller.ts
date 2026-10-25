import { Request, Response } from 'express';
import { paginate, sendCreated, sendSuccess } from '../../../utils/response';
import { SupportTicketsService } from '../service/support-tickets.service';

export class SupportController {
  constructor(private readonly service: SupportTicketsService) {}

  listTickets = async (req: Request, res: Response): Promise<void> => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const { tickets, total } = await this.service.listTickets(req.user!.userId, {
      page,
      limit,
      status,
    });
    paginate(res, tickets, total, page, limit);
  };

  createTicket = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as { subject: string; message: string; category?: string };
    const ticket = await this.service.createTicket(req.user!.userId, body);
    sendCreated(res, ticket, 'Support ticket created');
  };
}
