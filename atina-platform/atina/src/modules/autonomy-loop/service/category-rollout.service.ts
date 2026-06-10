import type { CategoryBatchDtoType } from '../dto/autonomy-loop.dto';
import { config } from '../../../config';
import { getIndustryCategory } from '../../billing/lib/category-pricing';
import {
  FREELANCE_CATEGORY_ROLLOUT_ORDER,
  LEGACY_SMB_CATEGORY_ROLLOUT_ORDER,
  getCategoryDeliveryProfile,
  parseRolloutSegment,
  resolveRolloutOrder,
} from '../lib/vertical-delivery-profiles';
import { normalizeCategorySlug } from '../../../shared/industry/industry-catalog';
import { AutonomyLoopRepository } from '../repository/autonomy-loop.repository';
import { CategoryBatchService, type CategoryBatchMode } from './category-batch.service';

function activeRolloutOrder() {
  return resolveRolloutOrder(parseRolloutSegment(config.autonomy.rolloutSegment));
}

export type CategoryRolloutPhase = 'pending' | 'in_progress' | 'ready' | 'empty';

export type CategoryRolloutStatusRow = {
  order: number;
  category: string;
  categoryName: string;
  phase: CategoryRolloutPhase;
  total: number;
  byStatus: Record<string, number>;
  readyCount: number;
  seedCount: number;
  outboundDrafts: number;
  outboundQueued: number;
  completionPct: number;
  segment: 'freelance' | 'legacy_smb';
};

export type CategoryRolloutSummary = {
  totalCategories: number;
  freelanceCategories: number;
  legacyCategories: number;
  freelanceReadyCount: number;
  completedCategories: number;
  inProgressCategories: number;
  pendingCategories: number;
  emptyCategories: number;
  overallCompletionPct: number;
  nextCategory: string | null;
  nextCategoryName: string | null;
  categories: CategoryRolloutStatusRow[];
};

function buildStatusMap(rows: Array<{ category: string; status: string; count: string }>) {
  const map = new Map<string, Record<string, number>>();
  for (const row of rows) {
    const cat = row.category;
    const bucket = map.get(cat) ?? {};
    bucket[row.status] = parseInt(row.count, 10);
    map.set(cat, bucket);
  }
  return map;
}

function resolvePhase(total: number, readyCount: number, seedCount: number): CategoryRolloutPhase {
  if (total === 0) return 'empty';
  if (readyCount >= total) return 'ready';
  if (readyCount > 0 || seedCount < total) return 'in_progress';
  return 'pending';
}

export class CategoryRolloutService {
  private readonly repo = new AutonomyLoopRepository();
  private readonly batch = new CategoryBatchService();

  async getStatus(): Promise<CategoryRolloutSummary> {
    const [verticalRows, outboundRows] = await Promise.all([
      this.repo.countVerticalsGroupedByCategory(),
      this.repo.countOutboundGroupedByCategory(),
    ]);

    const verticalMap = buildStatusMap(verticalRows.rows);
    const outboundMap = buildStatusMap(outboundRows.rows);

    const rolloutOrder = activeRolloutOrder();
    const categories: CategoryRolloutStatusRow[] = rolloutOrder.map((slug, idx) => {
      const catKey = normalizeCategorySlug(slug);
      const byStatus = verticalMap.get(catKey) ?? verticalMap.get(slug) ?? {};
      const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0);
      const readyCount = byStatus.ready ?? 0;
      const seedCount = byStatus.seed ?? 0;
      const outboundByStatus = outboundMap.get(catKey) ?? outboundMap.get(slug) ?? {};
      const profile = getCategoryDeliveryProfile(catKey);
      const meta = getIndustryCategory(catKey);
      const isFreelance = (FREELANCE_CATEGORY_ROLLOUT_ORDER as readonly string[]).includes(catKey);

      return {
        order: idx + 1,
        category: catKey,
        categoryName: meta?.nameSr ?? profile.nameSr,
        phase: resolvePhase(total, readyCount, seedCount),
        total,
        byStatus,
        readyCount,
        seedCount,
        outboundDrafts: outboundByStatus.draft ?? 0,
        outboundQueued: outboundByStatus.queued ?? 0,
        completionPct: total > 0 ? Math.round((readyCount / total) * 100) : 0,
        segment: isFreelance ? 'freelance' : 'legacy_smb',
      };
    });

    const completedCategories = categories.filter((c) => c.phase === 'ready').length;
    const freelanceReadyCount = categories.filter(
      (c) => c.segment === 'freelance' && c.phase === 'ready'
    ).length;
    const inProgressCategories = categories.filter((c) => c.phase === 'in_progress').length;
    const pendingCategories = categories.filter((c) => c.phase === 'pending').length;
    const emptyCategories = categories.filter((c) => c.phase === 'empty').length;
    const totalVerticals = categories.reduce((sum, c) => sum + c.total, 0);
    const totalReady = categories.reduce((sum, c) => sum + c.readyCount, 0);
    const nextCategories = this.findNextCategories(
      {
        totalCategories: rolloutOrder.length,
        freelanceCategories: FREELANCE_CATEGORY_ROLLOUT_ORDER.length,
        legacyCategories: LEGACY_SMB_CATEGORY_ROLLOUT_ORDER.length,
        freelanceReadyCount,
        completedCategories,
        inProgressCategories,
        pendingCategories,
        emptyCategories,
        overallCompletionPct: totalVerticals > 0 ? Math.round((totalReady / totalVerticals) * 100) : 0,
        nextCategory: null,
        nextCategoryName: null,
        categories,
      },
      1
    );
    const nextRow = nextCategories[0]
      ? categories.find((c) => c.category === nextCategories[0])
      : undefined;

    return {
      totalCategories: rolloutOrder.length,
      freelanceCategories: FREELANCE_CATEGORY_ROLLOUT_ORDER.length,
      legacyCategories: LEGACY_SMB_CATEGORY_ROLLOUT_ORDER.length,
      freelanceReadyCount,
      completedCategories,
      inProgressCategories,
      pendingCategories,
      emptyCategories,
      overallCompletionPct:
        totalVerticals > 0 ? Math.round((totalReady / totalVerticals) * 100) : 0,
      nextCategory: nextRow?.category ?? null,
      nextCategoryName: nextRow?.categoryName ?? null,
      categories,
    };
  }

  findNextCategories(
    status: CategoryRolloutSummary,
    maxCategories: number,
    startFromCategory?: string
  ): string[] {
    const normalized = startFromCategory ? normalizeCategorySlug(startFromCategory) : undefined;
    const startIdx = normalized
      ? activeRolloutOrder().findIndex((slug) => normalizeCategorySlug(slug) === normalized)
      : 0;
    const slice = startIdx >= 0 ? status.categories.slice(startIdx) : status.categories;

    const picks: string[] = [];
    for (const row of slice) {
      if (row.phase === 'ready' || row.phase === 'empty') continue;
      picks.push(row.category);
      if (picks.length >= maxCategories) break;
    }
    return picks;
  }

  async processRollout(
    userId: string | null,
    dto: CategoryBatchDtoType & {
      maxCategories?: number;
      startFromCategory?: string;
      processAllVerticals?: boolean;
    }
  ) {
    const maxCategories = dto.maxCategories ?? 1;
    const status = await this.getStatus();
    const categories = this.findNextCategories(status, maxCategories, dto.startFromCategory);

    if (!categories.length) {
      return {
        mode: dto.mode,
        processedCategories: 0,
        categories: [],
        summary: status,
        message: 'Sve industrije su spremne ili nema vertikala za obradu. Pokreni seed ako je baza prazna.',
      };
    }

    const results: Array<Record<string, unknown>> = [];
    for (const category of categories) {
      const batchResult = dto.processAllVerticals
        ? await this.batch.processCategoryAll(userId, category, dto.mode, dto.limit)
        : await this.batch.processCategory(userId, category, dto.mode, dto.limit);
      results.push(batchResult);
    }

    const freshStatus = await this.getStatus();
    const totalProcessed = results.reduce(
      (sum, r) => sum + (typeof r.processed === 'number' ? r.processed : 0),
      0
    );
    const totalSucceeded = results.reduce(
      (sum, r) => sum + (typeof r.succeeded === 'number' ? r.succeeded : 0),
      0
    );

    return {
      mode: dto.mode,
      processedCategories: results.length,
      totalVerticalsProcessed: totalProcessed,
      totalVerticalsSucceeded: totalSucceeded,
      categories: results,
      summary: freshStatus,
    };
  }

  async processSingleCategory(
    userId: string | null,
    category: string,
    mode: CategoryBatchMode,
    limit: number,
    processAllVerticals = true
  ) {
    if (processAllVerticals) {
      return this.batch.processCategoryAll(userId, category, mode, limit);
    }
    return this.batch.processCategory(userId, category, mode, limit);
  }
}
