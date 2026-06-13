import { Request, Response } from 'express';
import { BillingService } from '../service/billing.service';
import { sendSuccess, paginate } from '../../../utils/response';
import type { StrictPaginationQuery } from '../../../api/dto/pagination-query.dto';
import type { QuoteInput, PaymentProviderId } from '../lib/dynamic-pricing.engine';

export class BillingController {
  private service: BillingService;

  constructor() {
    this.service = new BillingService();
  }

  getPlans = async (req: Request, res: Response): Promise<void> => {
    const industryCategory =
      typeof req.query?.industryCategory === 'string' ? req.query.industryCategory : undefined;
    const plans = await this.service.getPlans(industryCategory);
    sendSuccess(res, plans);
  };

  getPlan = async (req: Request, res: Response): Promise<void> => {
    const industryCategory =
      typeof req.query?.industryCategory === 'string' ? req.query.industryCategory : undefined;
    const plan = await this.service.getPlanBySlug(req.params.slug, industryCategory);
    sendSuccess(res, plan);
  };

  getIndustryCatalog = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, this.service.getIndustryCatalog());
  };

  getCategoryPricing = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, this.service.getCategoryPricingCatalog());
  };

  getDeliverables = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, this.service.getDeliverableCatalog());
  };

  getQuoteCatalog = async (req: Request, res: Response): Promise<void> => {
    const q = req.query as {
      industryCategory?: string;
      verticalSlug?: string;
      paymentProvider?: PaymentProviderId;
      tamEstimateUsd?: number;
      competitionScore?: number;
      marketIntensity?: number;
    };
    const quotes = this.service.quoteCatalog({
      industryCategory: q.industryCategory,
      verticalSlug: q.verticalSlug,
      paymentProvider: q.paymentProvider,
      tamEstimateUsd: q.tamEstimateUsd,
      competitionScore: q.competitionScore,
      marketIntensity: q.marketIntensity,
    });
    sendSuccess(res, { quotes, deliverables: this.service.getDeliverableCatalog() });
  };

  postQuote = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as QuoteInput;
    const quote = this.service.quoteDeliverable(body);
    sendSuccess(res, quote);
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
