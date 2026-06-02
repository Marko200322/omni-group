import axios from 'axios';
import type { ScraperJobPayload } from './scrape-types';

const CHEERIO_ACTOR = 'apify~cheerio-scraper';

export async function scrapeWithApify(
  token: string,
  payload: ScraperJobPayload
): Promise<Record<string, unknown> | null> {
  const base = 'https://api.apify.com/v2';
  const url = `${base}/acts/${CHEERIO_ACTOR}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`;

  const pageFunction = `async function pageFunction(context) {
    const $ = context.jQuery;
    const title = $('title').first().text().trim();
    const links = [];
    $('a[href]').each((i, el) => {
      if (i >= 30) return;
      const href = $(el).attr('href');
      if (href && href.startsWith('http')) links.push(href);
    });
    return { url: context.request.url, title, links };
  }`;

  try {
    const { data } = await axios.post<unknown[]>(
      url,
      {
        startUrls: [{ url: payload.url }],
        maxRequestsPerCrawl: 1,
        pageFunction,
      },
      { timeout: 120000, headers: { 'Content-Type': 'application/json' } }
    );

    const first = Array.isArray(data) ? (data[0] as Record<string, unknown>) : null;
    if (!first) return null;

    return {
      url: payload.url,
      title: first.title ?? null,
      links: Array.isArray(first.links) ? first.links : [],
      delivery: 'apify',
      scrapedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
