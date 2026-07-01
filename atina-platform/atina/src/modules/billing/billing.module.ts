import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { BillingController } from './controller/billing.controller';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { config } from '../../config';
import logger from '../../utils/logger';
import { getRetainerScheduler, stopRetainerScheduler } from './service/retainer-scheduler.service';
import {
  BillingInvoicesListQueryDto,
  BillingInvoiceIdParamsDto,
  BillingLimitKeyParamsDto,
  BillingPlanSlugParamsDto,
  BillingPlansQueryDto,
  BillingQuoteCatalogQueryDto,
  BillingQuoteBodyDto,
  BillingPaymentIdParamsDto,
  BillingFulfillmentJobsQueryDto,
  BillingFulfillmentArtifactParamsDto,
  BillingFulfillmentRejectBodyDto,
} from './dto/billing.dto';

export class BillingModule implements IModule {
  name = 'Billing';
  slug = 'billing';
  version = '1.0.0';
  isCore = true;
  router: Router;
  private controller: BillingController;

  constructor() {
    this.router = Router();
    this.controller = new BillingController();
  }

  async initialize(): Promise<void> {
    this.setupRoutes();
    if (config.retainerScheduler.enabled) {
      logger.info('Billing: starting retainer scheduler');
      getRetainerScheduler().start();
    }
  }

  async shutdown(): Promise<void> {
    stopRetainerScheduler();
  }

  private setupRoutes(): void {
    this.router.get(
      '/deliverables',
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getDeliverables
    );
    this.router.get(
      '/quotes',
      validateQuery(BillingQuoteCatalogQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getQuoteCatalog
    );
    this.router.post(
      '/quote',
      validateQuery(StrictEmptyQueryDto),
      validateBody(BillingQuoteBodyDto),
      this.controller.postQuote
    );
    this.router.get(
      '/industry-catalog',
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getIndustryCatalog
    );
    this.router.get(
      '/category-pricing',
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getCategoryPricing
    );
    this.router.get(
      '/plans',
      validateQuery(BillingPlansQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getPlans
    );
    this.router.get(
      '/plans/:slug',
      validateParams(BillingPlanSlugParamsDto),
      validateQuery(BillingPlansQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getPlan
    );
    this.router.get(
      '/subscription',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getCurrentSubscription
    );
    this.router.get(
      '/invoices',
      authenticate,
      validateQuery(BillingInvoicesListQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getInvoices
    );
    this.router.get(
      '/invoices/:id',
      authenticate,
      validateParams(BillingInvoiceIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getInvoice
    );
    this.router.get(
      '/limit/:key',
      authenticate,
      validateParams(BillingLimitKeyParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.checkLimit
    );
    this.router.get(
      '/revenue-allocation/summary',
      authenticate,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getRevenueAllocationSummary
    );
    this.router.get(
      '/revenue-allocation/:paymentId',
      authenticate,
      requireAdmin,
      validateParams(BillingPaymentIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getRevenueAllocationByPayment
    );
    this.router.get(
      '/fulfillment/jobs/admin',
      authenticate,
      requireAdmin,
      validateQuery(BillingFulfillmentJobsQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listFulfillmentJobsAdmin
    );
    this.router.get(
      '/fulfillment/jobs',
      authenticate,
      validateQuery(BillingFulfillmentJobsQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listFulfillmentJobs
    );
    this.router.get(
      '/fulfillment/jobs/:paymentId',
      authenticate,
      validateParams(BillingPaymentIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getFulfillmentJob
    );
    this.router.get(
      '/fulfillment/jobs/:paymentId/artifacts/:filename',
      authenticate,
      validateParams(BillingFulfillmentArtifactParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.downloadFulfillmentArtifact
    );
    this.router.post(
      '/fulfillment/jobs/:paymentId/approve',
      authenticate,
      requireAdmin,
      validateParams(BillingPaymentIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.approveFulfillmentJob
    );
    this.router.post(
      '/fulfillment/jobs/:paymentId/reject',
      authenticate,
      requireAdmin,
      validateParams(BillingPaymentIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(BillingFulfillmentRejectBodyDto),
      this.controller.rejectFulfillmentJob
    );
  }
}
