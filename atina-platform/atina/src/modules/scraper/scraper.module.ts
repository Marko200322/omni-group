import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import logger from '../../utils/logger';
import { ScraperController } from './controller/scraper.controller';
import {
  BulkScrapeDto,
  PreviewUrlDto,
  ScrapeUrlDto,
  ScraperJobIdParamsDto,
  ScraperJobsListQueryDto,
} from './dto/scraper.dto';

export class ScraperModule implements IModule {
  name = 'Web Scraper';
  slug = 'scraper';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  private readonly controller = new ScraperController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.setupWorker();
    this.router.post(
      '/scrape',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(ScrapeUrlDto),
      this.controller.scrape
    );
    this.router.post(
      '/scrape/bulk',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(BulkScrapeDto),
      this.controller.scrapeBulk
    );
    this.router.get(
      '/jobs/:id',
      authenticate,
      validateParams(ScraperJobIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getJob
    );
    this.router.get(
      '/jobs',
      authenticate,
      validateQuery(ScraperJobsListQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listJobs
    );
    this.router.post(
      '/preview',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(PreviewUrlDto),
      this.controller.preview
    );
  }

  private setupWorker(): void {
    try {
      logger.info('Scraper worker initialized');
    } catch (err) {
      logger.warn('Scraper worker init warning', { error: err });
    }
  }
}
