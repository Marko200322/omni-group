import { query } from '../../../database/connection';
import { getAiClient } from '../../../integrations';
import type { FeedbackSyncDtoType } from '../dto/autonomy-loop.dto';
import { AutonomyLoopRepository } from '../repository/autonomy-loop.repository';

export class RevenueFeedbackService {
  private readonly repo = new AutonomyLoopRepository();
  private readonly ai = getAiClient();

  async sync(userId: string | null, dto: FeedbackSyncDtoType) {
    const { rows: aggregates } = await this.repo.sumPaymentsByVerticalMetadata(dto.lookbackDays);
    const updates: Array<Record<string, unknown>> = [];

    for (const row of aggregates) {
      const slug = row.vertical_slug;
      if (!slug) continue;
      const total = parseFloat(row.total ?? '0');
      const count = parseInt(row.count ?? '0', 10);
      const conversionScore = Math.min(100, count * 5 + total / 50);

      const { rows: updated } = await this.repo.applyRevenueFeedback(slug, total, conversionScore);
      if (updated[0]) {
        updates.push({
          slug,
          revenueApplied: total,
          paymentCount: count,
          conversionScore,
          vertical: updated[0],
        });
      }

      if (this.ai.isConfigured() && total > 0) {
        void this.ai
          .remember({
            namespace: 'autonomy-revenue',
            key: slug,
            value: { total, count, lookbackDays: dto.lookbackDays, syncedAt: new Date().toISOString() },
            userId: userId ?? undefined,
          })
          .catch(() => undefined);
      }
    }

    await query(
      `INSERT INTO audit_events
       (actor_user_id, event_type, entity_type, entity_id, severity, payload)
       VALUES ($1, 'autonomy_revenue_feedback_sync', 'autonomy_loop', 'feedback', 'info', $2)`,
      [userId, JSON.stringify({ updated: updates.length, lookbackDays: dto.lookbackDays })]
    );

    return {
      lookbackDays: dto.lookbackDays,
      verticalsUpdated: updates.length,
      updates,
    };
  }

  /** Re-rank vertical priority from global payment signals (no vertical_slug metadata). */
  async boostActiveVerticals(_userId: string | null) {
    const { rows } = await query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM payments
       WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '30 days'`
    );
    const mrrSignal = parseFloat(rows[0]?.total ?? '0');
    const { rows: topVerticals } = await this.repo.listVerticals(5, 0, { status: 'active' });
    for (const v of topVerticals) {
      await this.repo.applyRevenueFeedback(
        v.slug,
        0,
        Math.min(100, parseFloat(v.conversion_score) + mrrSignal / 10000)
      );
    }
    return { mrrSignal30d: mrrSignal, boosted: topVerticals.length };
  }
}
