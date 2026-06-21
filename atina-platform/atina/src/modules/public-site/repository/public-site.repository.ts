import { query } from '../../../database/connection';

export type ClientPublicSiteRow = {
  id: string;
  owner_user_id: string;
  project_id: string | null;
  slug: string;
  custom_domain: string | null;
  title: string;
  tagline: string | null;
  site_type: string;
  branding: Record<string, unknown>;
  pages: unknown[];
  status: string;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export class PublicSiteRepository {
  async listPublishedSolutions(input: {
    page: number;
    limit: number;
    category?: string;
    q?: string;
  }) {
    const offset = (input.page - 1) * input.limit;
    const params: unknown[] = [];
    let where = `WHERE EXISTS (
      SELECT 1 FROM generated_artifacts ga
      WHERE ga.vertical_slug = iv.slug AND ga.artifact_type = 'page_tsx'
    )`;
    if (input.category?.trim()) {
      params.push(input.category.trim().toLowerCase());
      where += ` AND iv.category = $${params.length}`;
    }
    if (input.q?.trim()) {
      params.push(`%${input.q.trim().toLowerCase()}%`);
      where += ` AND (LOWER(iv.name) LIKE $${params.length} OR LOWER(iv.slug) LIKE $${params.length})`;
    }

    const countSql = `SELECT COUNT(*)::int AS total FROM industry_verticals iv ${where}`;
    const { rows: countRows } = await query<{ total: number }>(countSql, params);
    const total = countRows[0]?.total ?? 0;

    params.push(input.limit, offset);
    const listSql = `
      SELECT iv.slug, iv.category, iv.name, iv.status, iv.research_data, iv.updated_at
      FROM industry_verticals iv
      ${where}
      ORDER BY iv.priority_score DESC, iv.name ASC
      LIMIT $${params.length - 1} OFFSET $${params.length}`;
    const { rows } = await query<{
      slug: string;
      category: string;
      name: string;
      status: string;
      research_data: Record<string, unknown>;
      updated_at: Date;
    }>(listSql, params);

    return { rows, total, page: input.page, limit: input.limit };
  }

  async getVerticalBySlug(slug: string) {
    const { rows } = await query<{
      slug: string;
      category: string;
      name: string;
      status: string;
      research_data: Record<string, unknown>;
    }>(`SELECT slug, category, name, status, research_data FROM industry_verticals WHERE slug = $1 LIMIT 1`, [
      slug,
    ]);
    return rows[0] ?? null;
  }

  async getClientSiteByProject(projectId: string) {
    const { rows } = await query<ClientPublicSiteRow>(
      `SELECT * FROM client_public_sites WHERE project_id = $1 LIMIT 1`,
      [projectId],
    );
    return rows[0] ?? null;
  }

  async getPublishedClientSite(slug: string) {
    const { rows } = await query<ClientPublicSiteRow>(
      `SELECT * FROM client_public_sites WHERE slug = $1 AND status = 'published' LIMIT 1`,
      [slug],
    );
    return rows[0] ?? null;
  }

  async createClientSite(input: {
    ownerUserId: string;
    projectId?: string | null;
    slug: string;
    title: string;
    tagline?: string | null;
    siteType: string;
    branding?: Record<string, unknown>;
    pages?: unknown[];
    publish?: boolean;
  }) {
    const publishedAt = input.publish ? new Date() : null;
    const status = input.publish ? 'published' : 'draft';
    const { rows } = await query<ClientPublicSiteRow>(
      `INSERT INTO client_public_sites
        (owner_user_id, project_id, slug, title, tagline, site_type, branding, pages, status, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10)
       RETURNING *`,
      [
        input.ownerUserId,
        input.projectId ?? null,
        input.slug,
        input.title,
        input.tagline ?? null,
        input.siteType,
        JSON.stringify(input.branding ?? {}),
        JSON.stringify(input.pages ?? []),
        status,
        publishedAt,
      ],
    );
    return rows[0];
  }

  async setClientSiteStatus(slug: string, ownerUserId: string, publish: boolean) {
    const status = publish ? 'published' : 'draft';
    const { rows } = await query<ClientPublicSiteRow>(
      `UPDATE client_public_sites
       SET status = $3, published_at = CASE WHEN $3 = 'published' THEN COALESCE(published_at, NOW()) ELSE NULL END, updated_at = NOW()
       WHERE slug = $1 AND owner_user_id = $2
       RETURNING *`,
      [slug, ownerUserId, status],
    );
    return rows[0] ?? null;
  }
}
