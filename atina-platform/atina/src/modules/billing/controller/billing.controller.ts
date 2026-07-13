import { Request, Response } from 'express';
import fs from 'fs';
import { BillingService } from '../service/billing.service';
import { RevenueAllocationService } from '../service/revenue-allocation.service';
import { DeliverableFulfillmentReadService } from '../service/deliverable-fulfillment-read.service';
import { DeliverableFulfillmentService } from '../service/deliverable-fulfillment.service';
import { sendSuccess, paginate } from '../../../utils/response';
import { NotFoundError } from '../../../utils/errors';
import type { StrictPaginationQuery } from '../../../api/dto/pagination-query.dto';
import type { QuoteInput, PaymentProviderId } from '../lib/dynamic-pricing.engine';
import { buildFactoryPhaseStatus } from '../lib/factory-phase-modules';
import { getFactoryRuntimeSnapshot } from '../lib/factory-phase-runtime';

export class BillingController {
  private service: BillingService;
  private revenueAllocation: RevenueAllocationService;
  private fulfillmentRead: DeliverableFulfillmentReadService;
  private fulfillmentWrite: DeliverableFulfillmentService;

  constructor() {
    this.service = new BillingService();
    this.revenueAllocation = new RevenueAllocationService();
    this.fulfillmentRead = new DeliverableFulfillmentReadService();
    this.fulfillmentWrite = new DeliverableFulfillmentService();
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

  getRevenueAllocationSummary = async (_req: Request, res: Response): Promise<void> => {
    const summary = await this.revenueAllocation.getSummary();
    sendSuccess(res, summary);
  };

  getRevenueAllocationByPayment = async (req: Request, res: Response): Promise<void> => {
    const row = await this.revenueAllocation.getByPaymentId(req.params.paymentId);
    if (!row) throw new NotFoundError('Revenue allocation');
    sendSuccess(res, row);
  };

  listFulfillmentJobs = async (req: Request, res: Response): Promise<void> => {
    const q = req.query as { limit?: number; status?: 'pending' | 'running' | 'completed' | 'failed' };
    const jobs = await this.fulfillmentRead.listForUser(req.user!.userId, q.limit ?? 50);
    sendSuccess(res, { jobs });
  };

  listFulfillmentJobsAdmin = async (req: Request, res: Response): Promise<void> => {
    const q = req.query as { limit?: number; status?: 'pending' | 'running' | 'completed' | 'failed' };
    const jobs = await this.fulfillmentRead.listForAdmin({ limit: q.limit, status: q.status });
    sendSuccess(res, { jobs });
  };

  getFulfillmentJob = async (req: Request, res: Response): Promise<void> => {
    const job = await this.fulfillmentRead.getJob(
      req.params.paymentId,
      req.user!.userId,
      req.user!.role,
    );
    sendSuccess(res, job);
  };

  downloadFulfillmentArtifact = async (req: Request, res: Response): Promise<void> => {
    const file = await this.fulfillmentRead.getArtifactFile({
      paymentId: req.params.paymentId,
      filename: req.params.filename,
      userId: req.user!.userId,
      role: req.user!.role,
    });
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.downloadName.replace(/"/g, '')}"`);
    fs.createReadStream(file.filePath).pipe(res);
  };

  approveFulfillmentJob = async (req: Request, res: Response): Promise<void> => {
    const result = await this.fulfillmentWrite.approveRelease(req.params.paymentId);
    if (!result) throw new NotFoundError('Fulfillment job');
    sendSuccess(res, result);
  };

  rejectFulfillmentJob = async (req: Request, res: Response): Promise<void> => {
    const notes = typeof req.body?.notes === 'string' ? req.body.notes : undefined;
    const ok = await this.fulfillmentWrite.rejectRelease(req.params.paymentId, notes);
    if (!ok) throw new NotFoundError('Fulfillment job');
    sendSuccess(res, { rejected: true });
  };

  getFactoryPhaseStatus = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, {
      ...buildFactoryPhaseStatus(),
      runtime: getFactoryRuntimeSnapshot(),
    });
  };
}
