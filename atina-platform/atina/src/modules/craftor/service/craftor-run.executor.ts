import { config } from '../../../config';
import { getScraperClient, getStorageClient } from '../../../integrations';
import type { CraftorNiche, CraftorV7Mode } from '../craftor.constants';
import { scrapeWithAxios } from '../../scraper/service/scraper-engine';
import { deployCraftorArtifactLocal } from './craftor-deploy';
import { MODE_YIELDS, type ModeYield } from './craftor-mode-yields';

export type CraftorDeliverySource = 'simulated' | 'scraper' | 'storage' | 'local_fs';

export type CraftorYieldResult = ModeYield & {
  delivery_source: CraftorDeliverySource;
  scrape_preview?: Record<string, unknown>;
  artifact_uri?: string | null;
};

function defaultHuntUrl(niche: CraftorNiche, platform: string): string {
  const q = encodeURIComponent(niche);
  if (platform === 'fiverr') return `https://www.fiverr.com/search/gigs?query=${q}`;
  if (platform === 'linkedin') return `https://www.linkedin.com/jobs/search/?keywords=${q}`;
  return `https://www.upwork.com/nx/search/jobs/?q=${q}`;
}

async function scrapeForHunting(url: string): Promise<Record<string, unknown> | null> {
  const scraper = getScraperClient();
  if (scraper.isConfigured()) {
    return scraper.scrape({ url, extractLinks: true, javascript: true });
  }
  if (config.craftor.useRealScraper) {
    return scrapeWithAxios(url);
  }
  return null;
}

async function deployProposalArtifact(
  systemId: string,
  v7Mode: CraftorV7Mode,
  payload: Record<string, unknown>
): Promise<{ uri: string | null; source: CraftorDeliverySource }> {
  const storage = getStorageClient();
  if (storage.isConfigured()) {
    const uploaded = await storage.uploadArtifact({
      path: `craftor/${systemId}/${v7Mode}.json`,
      contentBase64: Buffer.from(JSON.stringify(payload)).toString('base64'),
      contentType: 'application/json',
      metadata: { module: 'craftor', mode: v7Mode },
    });
    const uri = typeof uploaded?.uri === 'string' ? uploaded.uri : null;
    if (uri) return { uri, source: 'storage' };
  }

  const localUri = await deployCraftorArtifactLocal(systemId, v7Mode, payload);
  if (localUri) return { uri: localUri, source: 'local_fs' };

  return { uri: null, source: 'simulated' };
}

export async function resolveCraftorYield(params: {
  systemId: string;
  v7Mode: CraftorV7Mode;
  niche: CraftorNiche;
  platform: string;
  input?: Record<string, unknown>;
}): Promise<CraftorYieldResult> {
  const base = { ...MODE_YIELDS[params.v7Mode] };
  let delivery_source: CraftorDeliverySource = 'simulated';

  if (params.v7Mode === 'hunting') {
    const useReal = config.craftor.useRealScraper || getScraperClient().isConfigured();
    if (useReal) {
      const url =
        typeof params.input?.url === 'string' && params.input.url.trim()
          ? params.input.url.trim()
          : defaultHuntUrl(params.niche, params.platform);
      try {
        const data = await scrapeForHunting(url);
        if (data) {
          const links = Array.isArray(data.links) ? data.links.length : 0;
          const leads = Math.min(50, Math.max(links, 5));
          delivery_source = 'scraper';
          return {
            ...base,
            leads,
            delivery_source,
            scrape_preview: {
              url,
              title: data.title ?? null,
              links_found: links,
            },
          };
        }
      } catch {
        /* fallback to simulated yields */
      }
    }
  }

  if (params.v7Mode === 'proposal' || params.v7Mode === 'outreach') {
    const artifactPayload = {
      mode: params.v7Mode,
      niche: params.niche,
      platform: params.platform,
      generated_at: new Date().toISOString(),
      lines: params.input?.proposal_lines ?? ['Craftor proposal draft'],
    };
    const deployed = await deployProposalArtifact(params.systemId, params.v7Mode, artifactPayload);
    if (deployed.uri) {
      return {
        ...base,
        delivery_source: deployed.source,
        artifact_uri: deployed.uri,
        proposals: base.proposals ?? 1,
      };
    }
  }

  return { ...base, delivery_source };
}
