import { Request, Response } from 'express';
import { NotFoundError } from '../../../utils/errors';
import { sendCreated, sendSuccess } from '../../../utils/response';
import type {
  BulkScrapeDtoType,
  ScrapeUrlDtoType,
  ScraperJobsListQueryType,
} from '../dto/scraper.dto';
import { ScraperService } from '../service/scraper.service';

export class ScraperController {
  private readonly service = new ScraperService();

  scrape = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.scrapeUrl(req.user!.userId, req.body as ScrapeUrlDtoType);
    sendSuccess(res, data);
  };

  scrapeBulk = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.scrapeBulk(req.user!.userId, req.body as BulkScrapeDtoType);
    sendCreated(res, data, 'Bulk scrape queued');
  };

  getJob = async (req: Request, res: Response): Promise<void> => {
    const row = await this.service.getJob(req.params.id, req.user!.userId);
    if (!row) throw new NotFoundError('Scrape job');
    sendSuccess(res, row);
  };

  listJobs = async (req: Request, res: Response): Promise<void> => {
    const q = req.query as unknown as ScraperJobsListQueryType;
    const rows = await this.service.listJobs(req.user!.userId, q.page, q.limit);
    sendSuccess(res, rows);
  };

  preview = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.preview((req.body as { url: string }).url);
    sendSuccess(res, data);
  };
}
