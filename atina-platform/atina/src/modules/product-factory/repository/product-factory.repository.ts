import { query } from '../../../database/connection';

export type ProductFactoryProjectRow = {
  id: string;
  owner_user_id: string;
  lane: 'client_order' | 'internal_saas';
  slug: string;
  name: string;
  description: string | null;
  client_name: string | null;
  client_email: string | null;
  deliverable_id: string | null;
  status: string;
  isolation_key: string;
  output_dir: string | null;
  test_status: string;
  deploy_status: string;
  metadata: Record<string, unknown>;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
};

export class ProductFactoryRepository {
  async createProject(input: {
    ownerUserId: string;
    lane: 'client_order' | 'internal_saas';
    slug: string;
    name: string;
    description?: string | null;
    clientName?: string | null;
    clientEmail?: string | null;
    deliverableId?: string | null;
    isolationKey: string;
    metadata?: Record<string, unknown>;
  }) {
    const { rows } = await query<ProductFactoryProjectRow>(
      `INSERT INTO product_factory_projects
         (owner_user_id, lane, slug, name, description, client_name, client_email,
          deliverable_id, isolation_key, metadata, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,'draft')
       RETURNING *`,
      [
        input.ownerUserId,
        input.lane,
        input.slug,
        input.name,
        input.description ?? null,
        input.clientName ?? null,
        input.clientEmail ?? null,
        input.deliverableId ?? null,
        input.isolationKey,
        JSON.stringify(input.metadata ?? {}),
      ]
    );
    return rows[0];
  }

  async listProjects(
    ownerUserId: string,
    filters: { lane?: string; status?: string; page: number; limit: number }
  ) {
    const offset = (filters.page - 1) * filters.limit;
    const params: unknown[] = [ownerUserId];
    let where = 'WHERE owner_user_id = $1';

    if (filters.lane) {
      params.push(filters.lane);
      where += ` AND lane = $${params.length}`;
    }
    if (filters.status) {
      params.push(filters.status);
      where += ` AND status = $${params.length}`;
    }

    const count = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM product_factory_projects ${where}`,
      params
    );

    params.push(filters.limit, offset);
    const { rows } = await query<ProductFactoryProjectRow>(
      `SELECT * FROM product_factory_projects ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return {
      rows,
      total: parseInt(count.rows[0]?.count ?? '0', 10),
      page: filters.page,
      limit: filters.limit,
    };
  }

  async getById(id: string, ownerUserId: string) {
    const { rows } = await query<ProductFactoryProjectRow>(
      `SELECT * FROM product_factory_projects WHERE id = $1 AND owner_user_id = $2`,
      [id, ownerUserId]
    );
    return rows[0] ?? null;
  }

  async getByIdAny(id: string) {
    const { rows } = await query<ProductFactoryProjectRow>(
      `SELECT * FROM product_factory_projects WHERE id = $1`,
      [id]
    );
    return rows[0] ?? null;
  }

  async updateProject(
    id: string,
    patch: Partial<{
      status: string;
      output_dir: string | null;
      test_status: string;
      deploy_status: string;
      metadata: Record<string, unknown>;
      last_error: string | null;
      description: string | null;
    }>
  ) {
    const sets: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [id];
    const add = (col: string, val: unknown) => {
      params.push(val);
      sets.push(`${col} = $${params.length}`);
    };

    if (patch.status !== undefined) add('status', patch.status);
    if (patch.output_dir !== undefined) add('output_dir', patch.output_dir);
    if (patch.test_status !== undefined) add('test_status', patch.test_status);
    if (patch.deploy_status !== undefined) add('deploy_status', patch.deploy_status);
    if (patch.last_error !== undefined) add('last_error', patch.last_error);
    if (patch.description !== undefined) add('description', patch.description);
    if (patch.metadata !== undefined) {
      params.push(JSON.stringify(patch.metadata));
      sets.push(`metadata = $${params.length}::jsonb`);
    }

    const { rows } = await query<ProductFactoryProjectRow>(
      `UPDATE product_factory_projects SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );
    return rows[0] ?? null;
  }

  async pickInternalForTick(ownerUserId: string, limit: number) {
    const { rows } = await query<ProductFactoryProjectRow>(
      `SELECT * FROM product_factory_projects
       WHERE lane = 'internal_saas'
         AND owner_user_id = $1
         AND status IN ('draft', 'research')
       ORDER BY created_at ASC
       LIMIT $2`,
      [ownerUserId, limit]
    );
    return rows;
  }

  async insertBuildRun(projectId: string, runType: string) {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO product_factory_build_runs (project_id, run_type, status)
       VALUES ($1, $2, 'running')
       RETURNING id`,
      [projectId, runType]
    );
    return rows[0]?.id;
  }

  async completeBuildRun(
    runId: string,
    status: 'completed' | 'failed',
    result?: Record<string, unknown> | null,
    error?: string | null
  ) {
    await query(
      `UPDATE product_factory_build_runs
       SET status = $2, result = $3::jsonb, error = $4, completed_at = NOW()
       WHERE id = $1`,
      [runId, status, result ? JSON.stringify(result) : null, error ?? null]
    );
  }

  async stats(ownerUserId: string) {
    const { rows } = await query<{
      lane: string;
      status: string;
      count: string;
    }>(
      `SELECT lane, status, COUNT(*)::text AS count
       FROM product_factory_projects
       WHERE owner_user_id = $1
       GROUP BY lane, status`,
      [ownerUserId]
    );
    return rows;
  }
}
