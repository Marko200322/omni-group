import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { validateBody, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { webhookLimiter } from '../../api/middleware/rate-limit.middleware';
import { MarketingController } from './controller/marketing.controller';
import {
  EngineRunBodyDto,
  MarketingListQueryDto,
  SpendIngestBodyDto,
  WhatIfBodyDto,
  OmiQuestionQueryDto,
  CreateExperimentBodyDto,
  AttributeContactBodyDto,
} from './dto/marketing.dto';
import { MARKETING_ENGINE_VERSION } from './lib/constants';

export class MarketingModule implements IModule {
  name = 'Omni Marketing Intelligence & Lead Engine';
  slug = 'marketing';
  version = MARKETING_ENGINE_VERSION;
  isCore = true;
  router: Router;
  private readonly controller = new MarketingController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    const auth = [authenticate, requireAdmin];

    const get = (
      path: string,
      handler: typeof this.controller.getOverview,
      queryDto: typeof StrictEmptyQueryDto | typeof MarketingListQueryDto = StrictEmptyQueryDto
    ) => {
      this.router.get(path, ...auth, validateQuery(queryDto), validateBody(StrictEmptyBodyDto), handler);
    };

    get('/overview', this.controller.getOverview);
    get('/health', this.controller.getHealth);
    get('/channels', this.controller.getChannels);
    get('/campaigns', this.controller.getCampaigns);
    get('/funnel', this.controller.getFunnel);
    get('/attribution', this.controller.getAttribution);
    get('/economics', this.controller.getEconomics);
    get('/budgets', this.controller.getBudgets);
    get('/experiments', this.controller.getExperiments);
    get('/recommendations', this.controller.getRecommendations);
    get('/opportunities', this.controller.getOpportunities);
    get('/alerts', this.controller.getAlerts, MarketingListQueryDto);
    get('/reinvestment-signals', this.controller.getReinvestmentSignals);
    get('/monitoring-signals', this.controller.getMonitoringSignals);
    get('/reconciliation', this.controller.getReconciliation);
    get('/email-engagement', this.controller.getEmailEngagement);
    get('/package-matrix', this.controller.getPackageMatrix);

    this.router.get(
      '/omi-answer',
      ...auth,
      validateQuery(OmiQuestionQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.answerOmi
    );

    this.router.post(
      '/spend/ingest',
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(SpendIngestBodyDto),
      this.controller.ingestSpend
    );
    this.router.post(
      '/adapters/sync',
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.syncAdapters
    );
    this.router.post(
      '/scenarios/what-if',
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(WhatIfBodyDto),
      this.controller.whatIf
    );
    this.router.post(
      '/engine/run',
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(EngineRunBodyDto),
      this.controller.runEngine
    );
    this.router.post(
      '/experiments',
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(CreateExperimentBodyDto),
      this.controller.createExperiment
    );
    this.router.post(
      '/attribution/contact',
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(AttributeContactBodyDto),
      this.controller.attributeContact
    );

    // Resend email open/click engine — unauthenticated; signature verified in controller
    this.router.post(
      '/webhooks/resend',
      webhookLimiter,
      validateQuery(StrictEmptyQueryDto),
      this.controller.resendWebhook
    );
  }
}
