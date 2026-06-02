import axios from 'axios';
import { getScraperClient } from '../../../integrations';

export async function scrapeWithAxios(
  url: string,
  selectors?: Record<string, string>
): Promise<Record<string, unknown>> {
  const scraper = getScraperClient();
  if (scraper.isConfigured()) {
    const remote = await scraper.scrape({ url, selectors });
    if (remote) return remote;
  }

  const response = await axios.get(url, {
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ATINA-Bot/1.0)',
      Accept: 'text/html,application/xhtml+xml',
    },
    maxRedirects: 5,
  });

  const html = response.data as string;
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || '';
  const description =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
  const h1Tags = [...html.matchAll(/<h1[^>]*>([^<]+)<\/h1>/gi)].map((m) => m[1].trim());
  const links = [...html.matchAll(/href=["']([^"']+)["']/gi)]
    .map((m) => m[1])
    .filter((l) => l.startsWith('http'))
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

  if (selectors) {
    for (const [key, pattern] of Object.entries(selectors)) {
      const regex = new RegExp(pattern, 'i');
      const match = html.match(regex);
      result[key] = match ? match[1] || match[0] : null;
    }
  }

  return result;
}

export async function previewUrl(url: string): Promise<Record<string, unknown>> {
  try {
    const response = await axios.get(url, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ATINA-Bot/1.0)' },
    });
    const html = response.data as string;
    return {
      url,
      title: html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim(),
      description: html.match(
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
      )?.[1],
      statusCode: response.status,
      contentType: response.headers['content-type'],
      contentLength: html.length,
      accessible: true,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { url, error: message, accessible: false };
  }
}
