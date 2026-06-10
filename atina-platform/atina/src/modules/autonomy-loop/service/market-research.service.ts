import { getAiClient, getScraperClient } from '../../../integrations';
import { NotFoundError } from '../../../utils/errors';
import type { ResearchVerticalDtoType } from '../dto/autonomy-loop.dto';
import { buildResearchQuery, buildResearchSeedCandidates, pickResearchSeedUrl } from '../lib/research-seed';
import { getCategoryDeliveryProfile } from '../lib/vertical-delivery-profiles';
import { resolveVerticalDeliveryPack } from '../lib/vertical-delivery-resolver';
import { AutonomyLoopRepository } from '../repository/autonomy-loop.repository';

export class MarketResearchService {
  private readonly repo = new AutonomyLoopRepository();
  private readonly ai = getAiClient();

  async research(slug: string, dto: ResearchVerticalDtoType) {
    const { rows } = await this.repo.getVerticalBySlug(slug);
    const vertical = rows[0];
    if (!vertical) throw new NotFoundError('Industry vertical');

    await this.repo.updateVerticalStatus(slug, 'researching');

    const category = String(vertical.category);
    const name = String(vertical.name);
    const profile = getCategoryDeliveryProfile(category);
    const intensity = dto.intensity ?? profile.marketIntensityDefault;
    const queryBase = buildResearchQuery(category, name, slug);

    const seedCandidates = dto.seedUrl
      ? [dto.seedUrl]
      : buildResearchSeedCandidates(category, name, slug);
    const seedUrl = pickResearchSeedUrl(category, name, slug, dto.seedUrl);

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
      try {
        const rec = await this.ai.fetchRecommendations({
          mode: 'market-research',
          verticalSlug: slug,
          category,
          query: queryBase,
          intensity,
        });
        aiAnalysis = rec?.recommendations ?? [];
        aiEnriched = aiAnalysis.length > 0;
      } catch {
        aiEnriched = false;
      }
    }

    const tamEstimate = Math.round(50_000 + intensity * 1200 + category.length * 800);
    const competitionScore = Math.min(100, 30 + Math.round(intensity / 2));

    const draftPack = resolveVerticalDeliveryPack({
      slug,
      category,
      name,
      researchData: {
        tam_estimate_usd: tamEstimate,
        competition_score: competitionScore,
      },
    });

    const research = {
      researched_at: new Date().toISOString(),
      query: queryBase,
      seed_url: seedUrl,
      intensity,
      tam_estimate_usd: tamEstimate,
      competition_score: competitionScore,
      keywords: draftPack.keywords,
      value_proposition: aiAnalysis[0] ?? draftPack.valueProp,
      opportunities: aiAnalysis.length
        ? aiAnalysis
        : profile.outreachHooks.map((h) => `${h} (${name})`),
      research_focus: profile.researchFocus,
      recommended_deliverables: draftPack.recommendedDeliverables.map((d) => d.id),
      core_modules: profile.coreModules,
      vertical_package_quote_eur: draftPack.verticalPackageQuoteEur,
      scrape: scrapePreview,
      scraper_configured: scraper.isConfigured(),
      ai_enriched: aiEnriched,
    };

    const priorityBoost = Math.min(25, intensity / 4 + (scraper.isConfigured() ? 5 : 0));
    const { rows: updated } = await this.repo.updateVerticalResearch(slug, research, 'researching');
    if (updated[0]) {
      await this.repo.applyRevenueFeedback(slug, 0, priorityBoost);
    }

    return {
      vertical: updated[0] ?? null,
      research,
      deliveryPreview: resolveVerticalDeliveryPack({
        slug,
        category,
        name,
        researchData: research,
      }),
    };
  }
}
