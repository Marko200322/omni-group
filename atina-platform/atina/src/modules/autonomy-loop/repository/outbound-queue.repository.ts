import { query } from '../../../database/connection';

export type OutboundStatus = 'draft' | 'queued' | 'sent' | 'failed' | 'blocked_warmup';

export type OutboundMessageRow = {
  id: string;
  user_id: string | null;
  vertical_slug: string | null;
  category: string | null;
  lead_email: string | null;
  lead_name: string | null;
  lead_company: string | null;
  subject: string;
  body_html: string;
  body_text: string | null;
  status: OutboundStatus;
  source: string;
  metadata: Record<string, unknown>;
  scheduled_at: Date | null;
  sent_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export class OutboundQueueRepository {
  insert(input: {
    userId?: string | null;
    verticalSlug?: string | null;
    category?: string | null;
    leadEmail?: string | null;
    leadName?: string | null;
    leadCompany?: string | null;
    subject: string;
    bodyHtml: string;
    bodyText?: string | null;
    status?: OutboundStatus;
    source?: string;
    metadata?: Record<string, unknown>;
  }) {
    return query<OutboundMessageRow>(
      `INSERT INTO outbound_messages (
         user_id, vertical_slug, category, lead_email, lead_name, lead_company,
         subject, body_html, body_text, status, source, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        input.userId ?? null,
        input.verticalSlug ?? null,
        input.category ?? null,
        input.leadEmail ?? null,
        input.leadName ?? null,
        input.leadCompany ?? null,
        input.subject,
        input.bodyHtml,
        input.bodyText ?? null,
        input.status ?? 'draft',
        input.source ?? 'autonomy_generate',
        JSON.stringify(input.metadata ?? {}),
      ]
    );
  }

  countSentToday() {
    return query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM outbound_messages
       WHERE status = 'sent' AND sent_at >= date_trunc('day', NOW())`
    );
  }

  countByStatus(status?: OutboundStatus) {
    if (status) {
      return query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM outbound_messages WHERE status = $1`,
        [status]
      );
    }
    return query<{ status: string; count: string }>(
      `SELECT status, COUNT(*) AS count FROM outbound_messages GROUP BY status`
    );
  }

  listQueued(limit: number) {
    return query<OutboundMessageRow>(
      `SELECT * FROM outbound_messages
       WHERE status = 'queued'
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit]
    );
  }

  listDrafts(limit: number) {
    return query<OutboundMessageRow>(
      `SELECT * FROM outbound_messages
       WHERE status = 'draft'
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit]
    );
  }

  updateStatus(id: string, status: OutboundStatus, patch?: { sentAt?: Date; metadata?: Record<string, unknown> }) {
    if (patch?.metadata) {
      return query<OutboundMessageRow>(
        `UPDATE outbound_messages
         SET status = $2,
             sent_at = COALESCE($3, sent_at),
             metadata = metadata || $4::jsonb,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, status, patch.sentAt ?? null, JSON.stringify(patch.metadata)]
      );
    }
    return query<OutboundMessageRow>(
      `UPDATE outbound_messages
       SET status = $2, sent_at = COALESCE($3, sent_at), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status, patch?.sentAt ?? null]
    );
  }

  listByVertical(verticalSlug: string, limit = 20) {
    return query<OutboundMessageRow>(
      `SELECT * FROM outbound_messages WHERE vertical_slug = $1
       ORDER BY created_at DESC LIMIT $2`,
      [verticalSlug, limit]
    );
  }

  promoteDraftsToQueued(limit = 100) {
    return query<{ id: string }>(
      `UPDATE outbound_messages
       SET status = 'queued', updated_at = NOW()
       WHERE id IN (
         SELECT id FROM outbound_messages
         WHERE status = 'draft'
         ORDER BY created_at ASC
         LIMIT $1
       )
       RETURNING id`,
      [limit]
    );
  }
}
