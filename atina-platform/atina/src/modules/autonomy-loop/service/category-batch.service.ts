import { NotFoundError } from '../../../utils/errors';
import { normalizeCategorySlug } from '../../../shared/industry/industry-catalog';
import type { GenerateVerticalDtoType, ResearchVerticalDtoType, VerticalStatus } from '../dto/autonomy-loop.dto';
import { getCategoryDeliveryProfile } from '../lib/vertical-delivery-profiles';
import { AutonomyLoopRepository } from '../repository/autonomy-loop.repository';
import { MarketResearchService } from './market-research.service';
import { ModuleGeneratorService } from './module-generator.service';
import { AutonomyVerticalRagService } from './autonomy-vertical-rag.service';

export type CategoryBatchMode = 'research' | 'generate' | 'full';

function statusesForMode(mode: CategoryBatchMode): VerticalStatus[] | undefined {
  switch (mode) {
    case 'research':
      return ['seed'];
    case 'generate':
      return ['researching'];
    case 'full':
      return ['seed', 'researching'];
    default:
      return undefined;
  }
}

export class CategoryBatchService {
  private readonly repo = new AutonomyLoopRepository();
  private readonly research = new MarketResearchService();
  private readonly generator = new ModuleGeneratorService();
  private readonly verticalRag = new AutonomyVerticalRagService();

  async processCategory(
    userId: string | null,
    category: string,
    mode: CategoryBatchMode,
    limit: number,
    offset = 0
  ) {
    const catKey = normalizeCategorySlug(category);
    const profile = getCategoryDeliveryProfile(catKey);
    const statusFilter = statusesForMode(mode);

    const { rows } = await this.repo.pickVerticalsByCategory(catKey, limit, offset, statusFilter);
    if (!rows.length) {
      if (offset === 0) {
        const totalResult = await this.repo.countVerticals({ category: catKey });
        const totalInCategory = parseInt(totalResult.rows[0]?.count ?? '0', 10);
        if (totalInCategory === 0) {
          throw new NotFoundError(`No verticals for category: ${catKey}`);
        }
        return {
          category: catKey,
          categoryName: profile.nameSr,
          mode,
          processed: 0,
          succeeded: 0,
          failed: 0,
          results: [],
          offset: 0,
          hasMore: false,
          complete: true,
          message: 'All verticals in category already processed for this mode',
        };
      }
      return {
        category: catKey,
        categoryName: profile.nameSr,
        mode,
        processed: 0,
        succeeded: 0,
        failed: 0,
        results: [],
        offset,
        hasMore: false,
      };
    }

    const results: Array<Record<string, unknown>> = [];

    for (const vertical of rows) {
      const slug = String(vertical.slug);
      const entry: Record<string, unknown> = { verticalSlug: slug, mode };

      try {
        if (mode === 'research' || mode === 'full') {
          const intensity = profile.marketIntensityDefault;
          const researchResult = await this.research.research(slug, { intensity });
          entry.research = { tam: researchResult.research.tam_estimate_usd, status: 'ok' };
        }

        if (mode === 'generate' || mode === 'full') {
          const genDto: GenerateVerticalDtoType = {
            includePage: true,
            includeWorkflow: true,
            includeOutreach: true,
            includeQualityPack: true,
            includeDeliverablePack: true,
            queueOutbound: true,
          };
          const genResult = await this.generator.generate(slug, genDto, userId);
          entry.generate = { artifacts: genResult.artifacts.length, status: 'ok' };
          if (genResult.outboundDraft) {
            entry.outboundDraftId = genResult.outboundDraft.id;
            entry.outboundStatus = genResult.outboundDraft.status;
          }
          const rag = await this.verticalRag.ingestVertical(userId, slug);
          if (rag.ingested) {
            entry.ragChunks = rag.chunks ?? 0;
          }
        }

        entry.status = 'ok';
      } catch (err) {
        entry.status = 'failed';
        entry.error = err instanceof Error ? err.message : String(err);
      }

      results.push(entry);
    }

    const ok = results.filter((r) => r.status === 'ok').length;
    return {
      category: catKey,
      categoryName: profile.nameSr,
      mode,
      processed: results.length,
      succeeded: ok,
      failed: results.length - ok,
      results,
      offset,
      hasMore: rows.length === limit,
    };
  }

  async processCategoryAll(
    userId: string | null,
    category: string,
    mode: CategoryBatchMode,
    pageSize: number
  ) {
    const batchSize = Math.min(Math.max(pageSize, 1), 100);
    const allResults: Array<Record<string, unknown>> = [];
    let pages = 0;

    // Always offset 0: processed verticals leave the status filter, so incrementing
    // offset would skip rows when the pending set shrinks between pages.
    while (pages < 200) {
      const page = await this.processCategory(userId, category, mode, batchSize, 0);
      pages += 1;
      if (!page.processed) break;
      allResults.push(...page.results);
    }

    const ok = allResults.filter((r) => r.status === 'ok').length;
    const catKey = normalizeCategorySlug(category);
    const profile = getCategoryDeliveryProfile(catKey);

    return {
      category: catKey,
      categoryName: profile.nameSr,
      mode,
      processed: allResults.length,
      succeeded: ok,
      failed: allResults.length - ok,
      results: allResults,
      pages,
      complete: true,
    };
  }
}
