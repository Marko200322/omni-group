import { query } from '../../../database/connection';
import type { VerticalStatus } from '../dto/autonomy-loop.dto';

export type VerticalRow = {
  id: string;
  slug: string;
  category: string;
  name: string;
  status: VerticalStatus;
  priority_score: string;
  conversion_score: string;
  revenue_total: string;
  research_data: Record<string, unknown>;
  config: Record<string, unknown>;
  last_cycle_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export class AutonomyLoopRepository {
  async countVerticals(filter?: { category?: string; status?: VerticalStatus }) {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (filter?.category) {
      params.push(filter.category);
      clauses.push(`category = $${params.length}`);
    }
    if (filter?.status) {
      params.push(filter.status);
      clauses.push(`status = $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    return query<{ count: string }>(`SELECT COUNT(*) AS count FROM industry_verticals ${where}`, params);
  }

  async listVerticals(
    limit: number,
    offset: number,
    filter?: { category?: string; status?: VerticalStatus }
  ) {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (filter?.category) {
      params.push(filter.category);
      clauses.push(`category = $${params.length}`);
    }
    if (filter?.status) {
      params.push(filter.status);
      clauses.push(`status = $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    params.push(limit, offset);
    return query<VerticalRow>(
      `SELECT * FROM industry_verticals ${where}
       ORDER BY priority_score DESC, slug ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
  }

  async getVerticalBySlug(slug: string) {
    return query<VerticalRow>(`SELECT * FROM industry_verticals WHERE slug = $1 LIMIT 1`, [slug]);
  }

  async upsertVertical(
    slug: string,
    category: string,
    name: string,
    status: VerticalStatus = 'seed'
  ) {
    return query<VerticalRow>(
      `INSERT INTO industry_verticals (slug, category, name, status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (slug) DO UPDATE SET
         category = EXCLUDED.category,
         name = EXCLUDED.name,
         updated_at = NOW()
       RETURNING *`,
      [slug, category, name, status]
    );
  }

  async updateVerticalResearch(slug: string, research: Record<string, unknown>, status: VerticalStatus) {
    return query<VerticalRow>(
      `UPDATE industry_verticals
       SET research_data = $2, status = $3, last_cycle_at = NOW(), updated_at = NOW()
       WHERE slug = $1
       RETURNING *`,
      [slug, JSON.stringify(research), status]
    );
  }

  async updateVerticalStatus(slug: string, status: VerticalStatus, configPatch?: Record<string, unknown>) {
    if (configPatch) {
      return query<VerticalRow>(
        `UPDATE industry_verticals
         SET status = $2, config = config || $3::jsonb, last_cycle_at = NOW(), updated_at = NOW()
         WHERE slug = $1
         RETURNING *`,
        [slug, status, JSON.stringify(configPatch)]
      );
    }
    return query<VerticalRow>(
      `UPDATE industry_verticals
       SET status = $2, last_cycle_at = NOW(), updated_at = NOW()
       WHERE slug = $1
       RETURNING *`,
      [slug, status]
    );
  }

  async applyRevenueFeedback(slug: string, revenueDelta: number, conversionScore: number) {
    return query<VerticalRow>(
      `UPDATE industry_verticals
       SET revenue_total = revenue_total + $2,
           conversion_score = $3,
           priority_score = LEAST(100, priority_score + ($2 / 100)),
           status = CASE WHEN status = 'deployed' AND $2 > 0 THEN 'active' ELSE status END,
           updated_at = NOW()
       WHERE slug = $1
       RETURNING *`,
      [slug, revenueDelta, conversionScore]
    );
  }

  async pickVerticalsForCycle(limit: number) {
    return query<VerticalRow>(
      `SELECT * FROM industry_verticals
       WHERE status IN ('seed', 'researching', 'ready', 'deployed')
       ORDER BY
         CASE status
           WHEN 'ready' THEN 1
           WHEN 'researching' THEN 2
           WHEN 'seed' THEN 3
           WHEN 'deployed' THEN 4
           ELSE 5
         END,
         priority_score DESC,
         RANDOM()
       LIMIT $1`,
      [limit]
    );
  }

  async insertArtifact(
    verticalSlug: string,
    artifactType: string,
    filePath: string,
    contentHash: string,
    metadata: Record<string, unknown>
  ) {
    return query(
      `INSERT INTO generated_artifacts (vertical_slug, artifact_type, file_path, content_hash, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [verticalSlug, artifactType, filePath, contentHash, JSON.stringify(metadata)]
    );
  }

  async listArtifacts(verticalSlug: string) {
    return query(
      `SELECT * FROM generated_artifacts WHERE vertical_slug = $1 ORDER BY created_at DESC`,
      [verticalSlug]
    );
  }

  async createCycle(userId: string | null, cycleType: string, verticalSlug: string | null) {
    return query<{ id: string }>(
      `INSERT INTO autonomy_cycles (user_id, cycle_type, vertical_slug, status, steps)
       VALUES ($1, $2, $3, 'running', '[]')
       RETURNING id`,
      [userId, cycleType, verticalSlug]
    );
  }

  async finishCycle(
    cycleId: string,
    status: string,
    steps: unknown[],
    result: Record<string, unknown>,
    errorMessage?: string
  ) {
    return query(
      `UPDATE autonomy_cycles
       SET status = $2, steps = $3, result = $4, error_message = $5, finished_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [cycleId, status, JSON.stringify(steps), JSON.stringify(result), errorMessage ?? null]
    );
  }

  async createDeployJob(verticalSlug: string, deployPayload: Record<string, unknown>) {
    return query<{ id: string }>(
      `INSERT INTO autonomy_deploy_jobs (vertical_slug, status, deploy_payload)
       VALUES ($1, 'queued', $2)
       RETURNING id`,
      [verticalSlug, JSON.stringify(deployPayload)]
    );
  }

  async finishDeployJob(
    jobId: string,
    status: string,
    gitCommitSha: string | null,
    errorMessage?: string
  ) {
    return query(
      `UPDATE autonomy_deploy_jobs
       SET status = $2, git_commit_sha = $3, error_message = $4, finished_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [jobId, status, gitCommitSha, errorMessage ?? null]
    );
  }

  async getLatestCycle() {
    return query(
      `SELECT * FROM autonomy_cycles ORDER BY created_at DESC LIMIT 1`
    );
  }

  async sumPaymentsByVerticalMetadata(lookbackDays: number) {
    return query<{ vertical_slug: string; total: string; count: string }>(
      `SELECT
         metadata->>'vertical_slug' AS vertical_slug,
         COALESCE(SUM(amount), 0) AS total,
         COUNT(*) AS count
       FROM payments
       WHERE status = 'completed'
         AND metadata->>'vertical_slug' IS NOT NULL
         AND metadata->>'vertical_slug' <> ''
         AND created_at >= NOW() - ($1::text || ' days')::interval
       GROUP BY metadata->>'vertical_slug'`,
      [String(lookbackDays)]
    );
  }
}
