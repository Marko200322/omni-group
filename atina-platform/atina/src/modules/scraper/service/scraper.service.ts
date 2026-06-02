import { PaymentError } from '../../../utils/errors';
import type { BulkScrapeDtoType, ScrapeUrlDtoType } from '../dto/scraper.dto';
import { ScraperRepository } from '../repository/scraper.repository';
import { previewUrl, scrapeWithAxios } from './scraper-engine';

export class ScraperService {
  private readonly repo = new ScraperRepository();

  assertScraperPlanAccess(userId: string) {
    return this.repo.getUserPlanLimits(userId).then(({ rows }) => {
      const limits = (rows[0] as { limits?: { modules?: string | string[] } })?.limits || {};
      const modules = limits.modules;
      if (modules !== 'all' && !modules?.includes?.('scraper')) {
        throw new PaymentError('Web scraping requires Pro plan or higher');
      }
    });
  }

  async scrapeUrl(userId: string, dto: ScrapeUrlDtoType) {
    await this.assertScraperPlanAccess(userId);
    const { rows } = await this.repo.createScrapeTask(userId, dto.url, {
      url: dto.url,
      selectors: dto.selectors,
      maxDepth: dto.maxDepth,
    });
    const taskId = rows[0].id;
    try {
      const result = await scrapeWithAxios(dto.url, dto.selectors);
      await this.repo.completeTask(taskId, result);
      return { taskId, result };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await this.repo.failTask(taskId, message);
      throw err;
    }
  }

  async scrapeBulk(userId: string, dto: BulkScrapeDtoType) {
    await this.assertScraperPlanAccess(userId);
    const { rows } = await this.repo.createBulkTask(userId, dto.urls.length, {
      urls: dto.urls,
      selectors: dto.selectors,
    });
    const taskId = rows[0].id;

    void (async () => {
      const results: Record<string, unknown>[] = [];
      await this.repo.markTaskRunning(taskId);
      for (const url of dto.urls) {
        try {
          results.push(await scrapeWithAxios(url, dto.selectors));
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          results.push({ url, error: message });
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      await this.repo.completeBulkTask(taskId, {
        results,
        total: dto.urls.length,
        successful: results.filter((r) => !('error' in r && r.error)).length,
      });
    })().catch(async (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      await this.repo.failTask(taskId, message);
    });

    return { taskId, status: 'queued' as const, urlCount: dto.urls.length };
  }

  async getJob(id: string, userId: string) {
    const { rows } = await this.repo.getJob(id, userId);
    return rows[0] ?? null;
  }

  async listJobs(userId: string, page: number, limit: number) {
    const offset = (page - 1) * limit;
    const { rows } = await this.repo.listJobs(userId, limit, offset);
    return rows;
  }

  preview(url: string) {
    return previewUrl(url);
  }
}
