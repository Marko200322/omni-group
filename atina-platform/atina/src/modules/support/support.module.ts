import { Router } from 'express';
import { z } from 'zod';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { authSessionLimiter } from '../../api/middleware/rate-limit.middleware';
import { validateBody, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { SupportController } from './controller/support.controller';
import { SupportTicketsService } from './service/support-tickets.service';

const TicketsListQueryDto = z
  .object({
    page: z.coerce.number().int().min(1).catch(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.string().max(50).optional(),
  })
  .strict();

const CreateTicketBodyDto = z
  .object({
    subject: z.string().min(3).max(255),
    message: z.string().min(3).max(4000),
    category: z.string().max(80).optional(),
  })
  .strict();

/** Client support tickets — backed by tasks.type = support_ticket (same queue as kickoff). */
export class SupportModule implements IModule {
  name = 'Support';
  slug = 'support';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  private readonly service = new SupportTicketsService();
  private readonly controller = new SupportController(this.service);

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get(
      '/tickets',
      authenticate,
      authSessionLimiter,
      validateQuery(TicketsListQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listTickets,
    );
    this.router.post(
      '/tickets',
      authenticate,
      authSessionLimiter,
      validateQuery(z.object({}).strict()),
      validateBody(CreateTicketBodyDto),
      this.controller.createTicket,
    );
  }
}
