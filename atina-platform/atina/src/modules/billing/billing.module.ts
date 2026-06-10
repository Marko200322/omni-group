import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { BillingController } from './controller/billing.controller';
import { authenticate } from '../../api/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import {
  BillingInvoicesListQueryDto,
  BillingInvoiceIdParamsDto,
  BillingLimitKeyParamsDto,
  BillingPlanSlugParamsDto,
  BillingPlansQueryDto,
  BillingQuoteCatalogQueryDto,
  BillingQuoteBodyDto,
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
  }
}
