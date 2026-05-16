import { Request, Response } from 'express';
import { BillingService } from '../service/billing.service';
import { sendSuccess, paginate } from '../../../utils/response';
import type { StrictPaginationQuery } from '../../../api/dto/pagination-query.dto';

export class BillingController {
  private service: BillingService;

  constructor() {
    this.service = new BillingService();
  }

  getPlans = async (_req: Request, res: Response): Promise<void> => {
    const plans = await this.service.getPlans();
    sendSuccess(res, plans);
  };

  getPlan = async (req: Request, res: Response): Promise<void> => {
    const plan = await this.service.getPlanBySlug(req.params.slug);
    sendSuccess(res, plan);
  };

  getCurrentSubscription = async (req: Request, res: Response): Promise<void> => {
    const sub = await this.service.getUserCurrentSubscription(req.user!.userId);
    sendSuccess(res, sub);
  };

  getInvoices = async (req: Request, res: Response): Promise<void> => {
    const { page, limit } = req.query as unknown as StrictPaginationQuery;
    const { invoices, total } = await this.service.getUserInvoices(req.user!.userId, page, limit);
    paginate(res, invoices, total, page, limit);
  };

  getInvoice = async (req: Request, res: Response): Promise<void> => {
    const invoice = await this.service.getInvoiceById(req.params.id, req.user!.userId);
    sendSuccess(res, invoice);
  };

  checkLimit = async (req: Request, res: Response): Promise<void> => {
    const ok = await this.service.checkPlanLimit(req.user!.userId, req.params.key);
    sendSuccess(res, { allowed: ok });
  };
}
