import { query } from '../../../database/connection';

export type FulfillmentJobRow = {
  id: string;
  payment_id: string;
  user_id: string;
  purchase_type: 'deliverable' | 'platform_plan';
  deliverable_id: string | null;
  plan_slug: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  review_status: 'pending_review' | 'approved' | 'rejected';
  review_notes: string | null;
  released_at: Date | null;
  result: Record<string, unknown>;
  error: string | null;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
};

export class DeliverableFulfillmentRepository {
  async createJob(input: {
    paymentId: string;
    userId: string;
    purchaseType: 'deliverable' | 'platform_plan';
    deliverableId?: string | null;
    planSlug?: string | null;
  }): Promise<FulfillmentJobRow | null> {
    const { rows } = await query<FulfillmentJobRow>(
      `INSERT INTO deliverable_fulfillment_jobs
         (payment_id, user_id, purchase_type, deliverable_id, plan_slug, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       ON CONFLICT (payment_id) DO NOTHING
       RETURNING *`,
      [
        input.paymentId,
        input.userId,
        input.purchaseType,
        input.deliverableId ?? null,
        input.planSlug ?? null,
      ]
    );
    return rows[0] ?? null;
  }

  async getByPaymentId(paymentId: string): Promise<FulfillmentJobRow | null> {
    const { rows } = await query<FulfillmentJobRow>(
      `SELECT * FROM deliverable_fulfillment_jobs WHERE payment_id = $1`,
      [paymentId]
    );
    return rows[0] ?? null;
  }

  async listByUserId(userId: string, limit = 50): Promise<FulfillmentJobRow[]> {
    const { rows } = await query<FulfillmentJobRow>(
      `SELECT * FROM deliverable_fulfillment_jobs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return rows;
  }

  async listPendingReview(limit = 50): Promise<FulfillmentJobRow[]> {
    const { rows } = await query<FulfillmentJobRow>(
      `SELECT * FROM deliverable_fulfillment_jobs
       WHERE status = 'completed' AND review_status = 'pending_review'
       ORDER BY created_at DESC
       LIMIT $1`,
      [Math.min(Math.max(limit, 1), 200)]
    );
    return rows;
  }

  async listAdmin(input: { limit?: number; status?: FulfillmentJobRow['status'] }): Promise<FulfillmentJobRow[]> {
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    if (input.status) {
      const { rows } = await query<FulfillmentJobRow>(
        `SELECT * FROM deliverable_fulfillment_jobs
         WHERE status = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [input.status, limit]
      );
      return rows;
    }
    const { rows } = await query<FulfillmentJobRow>(
      `SELECT * FROM deliverable_fulfillment_jobs
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return rows;
  }

  async markRunning(id: string): Promise<void> {
    await query(
      `UPDATE deliverable_fulfillment_jobs
       SET status = 'running', updated_at = NOW()
       WHERE id = $1 AND status IN ('pending', 'failed')`,
      [id]
    );
  }

  async resetForRetry(paymentId: string, notes: string | null): Promise<FulfillmentJobRow | null> {
    const { rows } = await query<FulfillmentJobRow>(
      `UPDATE deliverable_fulfillment_jobs
       SET status = 'pending',
           review_status = 'pending_review',
           review_notes = COALESCE($2, review_notes),
           error = NULL,
           updated_at = NOW()
       WHERE payment_id = $1
         AND status = 'completed'
         AND review_status = 'rejected'
       RETURNING *`,
      [paymentId, notes]
    );
    return rows[0] ?? null;
  }

  async resetForAutomatedRetry(id: string): Promise<void> {
    await query(
      `UPDATE deliverable_fulfillment_jobs
       SET status = 'pending', error = NULL, updated_at = NOW()
       WHERE id = $1 AND status IN ('running', 'failed')`,
      [id]
    );
  }

  static readAttemptNumber(result: Record<string, unknown> | null | undefined): number {
    const meta = result?.fulfillmentMeta;
    if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
      const n = Number((meta as Record<string, unknown>).attemptNumber);
      if (Number.isFinite(n) && n >= 1) return Math.floor(n);
    }
    return 1;
  }

  async markCompleted(
    id: string,
    result: Record<string, unknown>,
    reviewStatus: 'pending_review' | 'approved' = 'pending_review',
  ): Promise<void> {
    await query(
      `UPDATE deliverable_fulfillment_jobs
       SET status = 'completed', result = $2::jsonb, error = NULL,
           review_status = $3::text,
           released_at = CASE WHEN $3::text = 'approved' THEN NOW() ELSE NULL END,
           completed_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [id, JSON.stringify(result), reviewStatus]
    );
  }

  async setReviewStatus(
    paymentId: string,
    reviewStatus: 'approved' | 'rejected',
    notes?: string | null,
  ): Promise<FulfillmentJobRow | null> {
    const { rows } = await query<FulfillmentJobRow>(
      `UPDATE deliverable_fulfillment_jobs
       SET review_status = $2::text,
           review_notes = COALESCE($3, review_notes),
           released_at = CASE WHEN $2::text = 'approved' THEN NOW() ELSE released_at END,
           updated_at = NOW()
       WHERE payment_id = $1 AND status = 'completed'
       RETURNING *`,
      [paymentId, reviewStatus, notes ?? null]
    );
    return rows[0] ?? null;
  }

  async markFailed(id: string, error: string, partial?: Record<string, unknown>): Promise<void> {
    await query(
      `UPDATE deliverable_fulfillment_jobs
       SET status = 'failed', error = $2, result = COALESCE($3::jsonb, result),
           updated_at = NOW()
       WHERE id = $1`,
      [id, error, partial ? JSON.stringify(partial) : null]
    );
  }

  async listCompletedRetainers(deliverableId: string): Promise<FulfillmentJobRow[]> {
    const { rows } = await query<FulfillmentJobRow>(
      `SELECT * FROM deliverable_fulfillment_jobs
       WHERE deliverable_id = $1
         AND status = 'completed'
         AND review_status = 'approved'
       ORDER BY created_at DESC`,
      [deliverableId]
    );
    return rows;
  }

  async patchResultMetadata(paymentId: string, patch: Record<string, unknown>): Promise<void> {
    await query(
      `UPDATE deliverable_fulfillment_jobs
       SET result = COALESCE(result, '{}'::jsonb) || $2::jsonb, updated_at = NOW()
       WHERE payment_id = $1`,
      [paymentId, JSON.stringify(patch)]
    );
  }
}
