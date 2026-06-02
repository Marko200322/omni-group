import { getAiClient, getScraperClient } from '../../../integrations';
import { NotFoundError } from '../../../utils/errors';
import type { ResearchVerticalDtoType } from '../dto/autonomy-loop.dto';
import { buildResearchSeedCandidates, pickResearchSeedUrl } from '../lib/research-seed';
import { AutonomyLoopRepository } from '../repository/autonomy-loop.repository';

export class MarketResearchService {
  private readonly repo = new AutonomyLoopRepository();
  private readonly ai = getAiClient();

  async research(slug: string, dto: ResearchVerticalDtoType) {
    const { rows } = await this.repo.getVerticalBySlug(slug);
    const vertical = rows[0];
    if (!vertical) throw new NotFoundError('Industry vertical');

    await this.repo.updateVerticalStatus(slug, 'researching');

    const queryBase = `${vertical.category} ${vertical.name} software market`;
    const seedCandidates = dto.seedUrl
      ? [dto.seedUrl]
      : buildResearchSeedCandidates(String(vertical.category), String(vertical.name), slug);
    const seedUrl = pickResearchSeedUrl(
      String(vertical.category),
      String(vertical.name),
      slug,
      dto.seedUrl
    );

    const scrapePreview: Record<string, unknown> = {};
    const scraper = getScraperClient();
    let scrapeDelivery: string | null = null;
    if (scraper.isConfigured()) {
      for (const candidateUrl of seedCandidates) {
        try {
          const data = await scraper.scrape({ url: candidateUrl, extractLinks: true, javascript: false });
          if (data && (data.title || (Array.isArray(data.links) && data.links.length > 0))) {
            scrapeDelivery = typeof data.delivery === 'string' ? data.delivery : 'unknown';
            scrapePreview.title = data.title ?? null;
            scrapePreview.links_found = Array.isArray(data.links) ? data.links.length : 0;
            scrapePreview.sample_links = Array.isArray(data.links) ? data.links.slice(0, 5) : [];
            scrapePreview.delivery = scrapeDelivery;
            scrapePreview.seed_url_used = candidateUrl;
            break;
          }
        } catch {
          /* try next candidate */
        }
      }
      if (!scrapeDelivery) {
        scrapePreview.error = 'scrape_failed';
        scrapePreview.tried_urls = seedCandidates.slice(0, 4);
      }
    } else {
      scrapePreview.simulated = true;
    }

    let aiAnalysis: string[] = [];
    let aiEnriched = false;
    if (this.ai.isConfigured()) {
      const rec = await this.ai.fetchRecommendations({
        mode: 'market-research',
        verticalSlug: slug,
        category: vertical.category,
        query: queryBase,
        intensity: dto.intensity,
      });
      aiAnalysis = rec?.recommendations ?? [];
      aiEnriched = aiAnalysis.length > 0;
    }

    const tamEstimate = Math.round(50000 + dto.intensity * 1200 + (vertical.category.length * 800));
    const competitionScore = Math.min(100, 30 + Math.round(dto.intensity / 2));

    const research = {
      researched_at: new Date().toISOString(),
      query: queryBase,
      seed_url: seedUrl,
      intensity: dto.intensity,
      tam_estimate_usd: tamEstimate,
      competition_score: competitionScore,
      keywords: [vertical.category, slug.replace(/-/g, ' '), 'saas', 'automation', 'crm'],
      value_proposition: aiAnalysis[0] ?? `All-in-one ops panel for ${vertical.name}`,
      opportunities: aiAnalysis.length
        ? aiAnalysis
        : [
            'CRM + scheduling for vertical workflows',
            'Automated follow-up and invoicing',
            'AI support trained on vertical FAQs',
          ],
      scrape: scrapePreview,
      scraper_configured: scraper.isConfigured(),
      ai_enriched: aiEnriched,
    };

    const priorityBoost = Math.min(25, dto.intensity / 4 + (scraper.isConfigured() ? 5 : 0));
    const { rows: updated } = await this.repo.updateVerticalResearch(slug, research, 'ready');
    if (updated[0]) {
      await this.repo.applyRevenueFeedback(slug, 0, priorityBoost);
    }

    return { vertical: updated[0] ?? null, research };
  }
}
