import axios from 'axios';
import type { ScraperJobPayload } from './scrape-types';

export async function scrapeWithAxiosDirect(
  payload: ScraperJobPayload
): Promise<Record<string, unknown>> {
  const response = await axios.get(payload.url, {
    timeout: 20000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ATINA-Bot/1.0)',
      Accept: 'text/html,application/xhtml+xml',
    },
    maxRedirects: 5,
    validateStatus: (status) => status >= 200 && status < 400,
  });

  const html = String(response.data ?? '');
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || '';
  const links = [...html.matchAll(/href=["']([^"']+)["']/gi)]
    .map((m) => m[1])
    .filter((l) => l.startsWith('http'))
    .slice(0, payload.extractLinks ? 50 : 0);

  return {
    url: payload.url,
    title,
    links,
    statusCode: response.status,
    contentLength: html.length,
    delivery: 'axios',
    scrapedAt: new Date().toISOString(),
  };
}
