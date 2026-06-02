import type { IndustrySeedEntry } from '../data/industry-seed';
import { buildIndustrySeedEntries, INDUSTRY_SEED_COUNT } from '../data/industry-seed';
import type { ListVerticalsQueryDtoType, VerticalStatus } from '../dto/autonomy-loop.dto';
import { AutonomyLoopRepository } from '../repository/autonomy-loop.repository';

export class IndustryRegistryService {
  private readonly repo = new AutonomyLoopRepository();

  getSeedCatalog(): { count: number; entries: IndustrySeedEntry[] } {
    const entries = buildIndustrySeedEntries();
    return { count: entries.length, entries };
  }

  async seedAll(): Promise<{ inserted: number; total: number }> {
    const entries = buildIndustrySeedEntries();
    let inserted = 0;
    for (const entry of entries) {
      const { rows } = await this.repo.upsertVertical(entry.slug, entry.category, entry.name, 'seed');
      if (rows[0]) inserted += 1;
    }
    return { inserted, total: INDUSTRY_SEED_COUNT };
  }

  async list(query: ListVerticalsQueryDtoType) {
    const offset = (query.page - 1) * query.limit;
    const filter = {
      category: query.category,
      status: query.status as VerticalStatus | undefined,
    };
    const [countResult, listResult] = await Promise.all([
      this.repo.countVerticals(filter),
      this.repo.listVerticals(query.limit, offset, filter),
    ]);
    return {
      rows: listResult.rows,
      total: parseInt(countResult.rows[0]?.count ?? '0', 10),
      page: query.page,
      limit: query.limit,
    };
  }

  async getBySlug(slug: string) {
    const { rows } = await this.repo.getVerticalBySlug(slug);
    return rows[0] ?? null;
  }

  async updateStatus(slug: string, status: VerticalStatus, configPatch?: Record<string, unknown>) {
    const { rows } = await this.repo.updateVerticalStatus(slug, status, configPatch);
    return rows[0] ?? null;
  }
}
