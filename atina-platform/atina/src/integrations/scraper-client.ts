import { config } from '../config';
import { AggregatorHttpClient } from './aggregator-http-client';
import { scrapeWithApify } from './apify-direct';
import { isAggregatorGatewayProvider, isApifyProvider } from './provider-detect';
import type { ScraperJobPayload } from './scrape-types';
import { scrapeWithAxiosDirect } from './scrape-direct';

export type { ScraperJobPayload } from './scrape-types';

function scraperCreds(): { url: string; key: string } {
  return config?.aggregators?.scraper ?? { url: '', key: '' };
}

export class ScraperClient extends AggregatorHttpClient {
  constructor(creds?: { url: string; key: string }) {
    super(creds ?? scraperCreds(), 'scraper');
  }

  async scrape(payload: ScraperJobPayload): Promise<Record<string, unknown> | null> {
    if (!this.isConfigured()) return null;

    const creds = this.getCredentials();

    if (isApifyProvider(creds)) {
      const apify = await scrapeWithApify(creds.key.trim(), payload);
      if (apify) return apify;
    }

    if (isAggregatorGatewayProvider(creds)) {
      const gateway = await this.request<Record<string, unknown>>('POST', '/v1/scrape', payload);
      if (gateway) return { ...gateway, delivery: gateway.delivery ?? 'gateway' };
    }

    try {
      return await scrapeWithAxiosDirect(payload);
    } catch {
      return null;
    }
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
