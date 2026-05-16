import { config } from '../config';
import { AggregatorHttpClient } from './aggregator-http-client';

export type ScraperJobPayload = {
  url: string;
  selectors?: Record<string, string>;
  waitForSelector?: string;
  javascript?: boolean;
  extractLinks?: boolean;
  extractImages?: boolean;
  maxDepth?: number;
};

function scraperCreds(): { url: string; key: string } {
  return config?.aggregators?.scraper ?? { url: '', key: '' };
}

export class ScraperClient extends AggregatorHttpClient {
  constructor(creds?: { url: string; key: string }) {
    super(creds ?? scraperCreds(), 'scraper');
  }

  scrape(payload: ScraperJobPayload): Promise<Record<string, unknown> | null> {
    return this.request<Record<string, unknown>>('POST', '/v1/scrape', payload);
  }

  fetchProxy(endpoint = '/v1/proxies/next'): Promise<Record<string, unknown> | null> {
    return this.request<Record<string, unknown>>('GET', endpoint);
  }
}

let defaultScraperClient: ScraperClient | undefined;

export function getScraperClient(override?: ScraperClient): ScraperClient {
  if (override) return override;
  if (!defaultScraperClient) defaultScraperClient = new ScraperClient();
  return defaultScraperClient;
}

export function resetScraperClientForTests(): void {
  defaultScraperClient = undefined;
}
