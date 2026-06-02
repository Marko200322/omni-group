import { z } from 'zod';
import {
  scraperApiUrlZod,
  scraperSelectorsOptionalZod,
  ScraperJobIdParamsDto,
  ScraperJobsListQueryDto,
} from '../queue-scrape-url';

export { ScraperJobIdParamsDto, ScraperJobsListQueryDto };

export const ScrapeUrlDto = z
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

export const BulkScrapeDto = z
  .object({
    urls: z.array(scraperApiUrlZod).min(1).max(50),
    selectors: scraperSelectorsOptionalZod,
  })
  .strict();

export const PreviewUrlDto = z.object({ url: scraperApiUrlZod }).strict();

export type ScrapeUrlDtoType = z.infer<typeof ScrapeUrlDto>;
export type BulkScrapeDtoType = z.infer<typeof BulkScrapeDto>;
export type ScraperJobsListQueryType = z.infer<typeof ScraperJobsListQueryDto>;
