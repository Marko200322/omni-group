import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { query } from '../../database/connection';
import { sendSuccess, sendCreated } from '../../utils/response';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { z } from 'zod';
import { NotFoundError, PaymentError } from '../../utils/errors';
import axios from 'axios';
import { getScraperClient } from '../../integrations';
import logger from '../../utils/logger';
import {
  scraperApiUrlZod,
  scraperSelectorsOptionalZod,
  ScraperJobIdParamsDto,
  ScraperJobsListQueryDto,
} from './queue-scrape-url';

const ScrapeUrlDto = z
  .object({
    url: scraperApiUrlZod,
    selectors: scraperSelectorsOptionalZod,
    waitForSelector: z.string().optional(),
    javascript: z.boolean().default(false),
    extractLinks: z.boolean().default(false),
    extractImages: z.boolean().default(false),
    maxDepth: z.number().min(1).max(5).default(1),
  })
  .strict();

const BulkScrapeDto = z
  .object({
    urls: z.array(scraperApiUrlZod).min(1).max(50),
    selectors: scraperSelectorsOptionalZod,
  })
  .strict();

const PreviewUrlDto = z
  .object({
    url: scraperApiUrlZod,
  })
  .strict();

export class ScraperModule implements IModule {
  name = 'Web Scraper';
  slug = 'scraper';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.setupRoutes();
    this.setupWorker();
  }

  private setupWorker(): void {
    try {
      logger.info('Scraper worker initialized');
    } catch (err) {
      logger.warn('Scraper worker init warning', { error: err });
    }
  }

  private async scrapeWithAxios(url: string, selectors?: Record<string, string>): Promise<Record<string, unknown>> {
    const scraper = getScraperClient();
    if (scraper.isConfigured()) {
      const remote = await scraper.scrape({ url, selectors });
      if (remote) return remote;
    }

    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ATINA-Bot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      maxRedirects: 5,
    });

    const html = response.data as string;

    // Basic extraction using regex (production would use cheerio/playwright)
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || '';
    const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
    const h1Tags = [...html.matchAll(/<h1[^>]*>([^<]+)<\/h1>/gi)].map(m => m[1].trim());
    const links = [...html.matchAll(/href=["']([^"']+)["']/gi)]
      .map(m => m[1])
      .filter(l => l.startsWith('http'))
      .slice(0, 20);

    const result: Record<string, unknown> = {
      url,
      statusCode: response.status,
      title,
      description,
      h1: h1Tags,
      links,
      contentLength: html.length,
      scrapedAt: new Date(),
    };

    // Apply custom selectors if provided (simplified)
    if (selectors) {
      for (const [key, pattern] of Object.entries(selectors)) {
        const regex = new RegExp(pattern, 'i');
        const match = html.match(regex);
        result[key] = match ? match[1] || match[0] : null;
      }
    }

    return result;
  }

  private setupRoutes(): void {
    // Scrape single URL
    this.router.post('/scrape', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(ScrapeUrlDto), async (req, res) => {
      const { url, selectors, maxDepth } = req.body;
      const userId = req.user!.userId;

      // Check plan
      const { rows: planRows } = await query(
        `SELECT p.limits FROM users u JOIN plans p ON u.plan_id = p.id WHERE u.id = $1`, [userId]
      );
      const limits = (planRows[0] as any)?.limits || {};
      if (!limits.modules?.includes?.('scraper') && limits.modules !== 'all') {
        throw new PaymentError('Web scraping requires Pro plan or higher');
      }

      // Create task record
      const { rows } = await query(
        `INSERT INTO tasks (user_id, type, name, status, payload)
         VALUES ($1, 'scrape_url', $2, 'running', $3)
         RETURNING id`,
        [userId, `Scrape: ${url}`, JSON.stringify({ url, selectors, maxDepth })]
      );
      const taskId = rows[0].id;

      try {
        const result = await this.scrapeWithAxios(url, selectors);

        await query(
          `UPDATE tasks SET status = 'completed', result = $2, completed_at = NOW()
           WHERE id = $1`,
          [taskId, JSON.stringify(result)]
        );

        sendSuccess(res, { taskId, result });
      } catch (err: any) {
        await query(
          `UPDATE tasks SET status = 'failed', error_message = $2 WHERE id = $1`,
          [taskId, err.message]
        );
        throw err;
      }
    });

    // Bulk scrape (async)
    this.router.post('/scrape/bulk', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(BulkScrapeDto), async (req, res) => {
      const { urls, selectors } = req.body;
      const userId = req.user!.userId;

      // Create parent task
      const { rows } = await query(
        `INSERT INTO tasks (user_id, type, name, status, payload)
         VALUES ($1, 'bulk_scrape', $2, 'queued', $3)
         RETURNING id`,
        [userId, `Bulk scrape: ${urls.length} URLs`, JSON.stringify({ urls, selectors })]
      );
      const taskId = rows[0].id;

      // Process asynchronously
      (async () => {
        const results: Record<string, unknown>[] = [];
        await query(`UPDATE tasks SET status = 'running', started_at = NOW() WHERE id = $1`, [taskId]);

        for (const url of urls) {
          try {
            const result = await this.scrapeWithAxios(url, selectors);
            results.push(result);
          } catch (err: any) {
            results.push({ url, error: err.message });
          }
          // Rate limiting between requests
          await new Promise(r => setTimeout(r, 1000));
        }

        await query(
          `UPDATE tasks SET status = 'completed', result = $2, completed_at = NOW() WHERE id = $1`,
          [taskId, JSON.stringify({ results, total: urls.length, successful: results.filter(r => !r.error).length })]
        );
      })().catch(async (err) => {
        await query(
          `UPDATE tasks SET status = 'failed', error_message = $2 WHERE id = $1`,
          [taskId, err.message]
        );
      });

      sendCreated(res, { taskId, status: 'queued', urlCount: urls.length }, 'Bulk scrape queued');
    });

    // Get scrape task result
    this.router.get(
      '/jobs/:id',
      authenticate,
      validateParams(ScraperJobIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (req, res) => {
        const { rows } = await query(
          `SELECT * FROM tasks WHERE id = $1 AND user_id = $2 AND type IN ('scrape_url', 'bulk_scrape')`,
          [req.params.id, req.user!.userId]
        );
        if (!rows[0]) throw new NotFoundError('Scrape job');
        sendSuccess(res, rows[0]);
      }
    );

    // List scrape history
    this.router.get(
      '/jobs',
      authenticate,
      validateQuery(ScraperJobsListQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (req, res) => {
        const { page, limit } = req.query as unknown as z.infer<typeof ScraperJobsListQueryDto>;
        const offset = (page - 1) * limit;

        const { rows } = await query(
          `SELECT id, name, status, created_at, completed_at,
                  (payload->>'url') AS url
           FROM tasks
           WHERE user_id = $1 AND type IN ('scrape_url', 'bulk_scrape')
           ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
          [req.user!.userId, limit, offset]
        );
        sendSuccess(res, rows);
      }
    );

    // Extract metadata preview
    this.router.post('/preview', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(PreviewUrlDto), async (req, res) => {
      const { url } = req.body;

      try {
        const response = await axios.get(url, {
          timeout: 8000,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ATINA-Bot/1.0)' },
        });
        const html = response.data as string;

        sendSuccess(res, {
          url,
          title: html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim(),
          description: html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1],
          statusCode: response.status,
          contentType: response.headers['content-type'],
          contentLength: html.length,
        });
      } catch (err: any) {
        sendSuccess(res, { url, error: err.message, accessible: false });
      }
    });
  }
}
