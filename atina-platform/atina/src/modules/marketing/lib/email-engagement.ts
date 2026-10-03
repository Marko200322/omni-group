/**
 * Resend (and generic) email engagement ingest — opens/clicks/unsubs/bounces.
 * Stores hashed email only when raw address present. Never invents opens.
 */
import { createHash, createHmac, timingSafeEqual } from 'crypto';

export type EmailEventType =
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'complained'
  | 'unsubscribed'
  | 'delivery_delayed';

const RESEND_MAP: Record<string, EmailEventType> = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.delivery_delayed': 'delivery_delayed',
};

function hashEmail(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

export function mapResendEventType(type: string): EmailEventType | null {
  return RESEND_MAP[type] ?? null;
}

/** Svix-style Resend signature: whsec_… + svix-id / svix-timestamp / svix-signature. */
export function verifyResendSvixSignature(input: {
  rawBody: string;
  svixId: string;
  svixTimestamp: string;
  svixSignature: string;
  secret: string;
}): boolean {
  try {
    const secret = input.secret.startsWith('whsec_') ? input.secret.slice(6) : input.secret;
    const key = Buffer.from(secret, 'base64');
    const toSign = `${input.svixId}.${input.svixTimestamp}.${input.rawBody}`;
    const expected = createHmac('sha256', key).update(toSign).digest('base64');
    const candidates = input.svixSignature
      .split(' ')
      .map((part) => part.replace(/^v1,/, '').trim())
      .filter(Boolean);
    const expectedBuf = Buffer.from(expected);
    return candidates.some((c) => {
      const got = Buffer.from(c);
      return got.length === expectedBuf.length && timingSafeEqual(got, expectedBuf);
    });
  } catch {
    return false;
  }
}

export function parseResendWebhookPayload(payload: Record<string, unknown>): {
  providerEventId: string;
  eventType: EmailEventType;
  email: string | null;
  messageId: string | null;
  campaignKey: string | null;
  url: string | null;
  occurredAt: string | null;
} | null {
  const type = String(payload.type ?? '');
  const eventType = mapResendEventType(type);
  if (!eventType) return null;

  const data =
    payload.data && typeof payload.data === 'object'
      ? (payload.data as Record<string, unknown>)
      : {};
  const toList = Array.isArray(data.to) ? data.to : [];
  const email =
    (typeof toList[0] === 'string' ? toList[0] : null) ||
    (typeof data.email === 'string' ? data.email : null);
  const tags = Array.isArray(data.tags) ? data.tags : [];
  const campaignTag = tags.find(
    (t) =>
      t &&
      typeof t === 'object' &&
      String((t as { name?: string }).name ?? '') === 'campaign'
  ) as { value?: string } | undefined;
  const click =
    data.click && typeof data.click === 'object'
      ? (data.click as { link?: string })
      : null;

  return {
    providerEventId: String(payload.id ?? data.email_id ?? `${type}:${Date.now()}`),
    eventType,
    email,
    messageId: typeof data.email_id === 'string' ? data.email_id : null,
    campaignKey:
      campaignTag?.value ??
      (typeof data.subject === 'string' ? data.subject.slice(0, 160) : null),
    url: click?.link ?? (typeof data.link === 'string' ? data.link : null),
    occurredAt: typeof payload.created_at === 'string' ? payload.created_at : null,
  };
}

export async function ingestResendWebhookPayload(
  payload: Record<string, unknown>
): Promise<{ ok: boolean; duplicate?: boolean; ignored?: boolean }> {
  const parsed = parseResendWebhookPayload(payload);
  if (!parsed) return { ok: true, ignored: true };
  return ingestEmailProviderEvent({
    provider: 'resend',
    providerEventId: parsed.providerEventId,
    eventType: parsed.eventType,
    email: parsed.email,
    messageId: parsed.messageId,
    campaignKey: parsed.campaignKey,
    url: parsed.url,
    occurredAt: parsed.occurredAt ?? undefined,
    payload,
  });
}

export async function ingestEmailProviderEvent(input: {
  provider: string;
  providerEventId: string;
  eventType: EmailEventType;
  email?: string | null;
  messageId?: string | null;
  campaignKey?: string | null;
  url?: string | null;
  occurredAt?: string;
  payload?: Record<string, unknown>;
}): Promise<{ ok: boolean; duplicate?: boolean }> {
  try {
    const { query } = await import('../../../database/connection');
    let contactId: string | null = null;
    let emailHash: string | null = null;
    if (input.email) {
      emailHash = hashEmail(input.email);
      const { rows } = await query<{ id: string }>(
        `SELECT id FROM crm_contacts WHERE lower(email) = lower($1) ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
        [input.email]
      );
      contactId = rows[0]?.id ?? null;
    }

    const { rowCount } = await query(
      `INSERT INTO marketing_email_events
         (provider, provider_event_id, event_type, email_hash, contact_id, campaign_key, message_id, url, occurred_at, payload)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9::timestamptz, NOW()),$10::jsonb)
       ON CONFLICT (provider, provider_event_id) DO NOTHING`,
      [
        input.provider,
        input.providerEventId,
        input.eventType,
        emailHash,
        contactId,
        input.campaignKey ?? null,
        input.messageId ?? null,
        input.url ?? null,
        input.occurredAt ?? null,
        JSON.stringify(input.payload ?? {}),
      ]
    );

    if (contactId && (input.eventType === 'opened' || input.eventType === 'clicked')) {
      const { MarketingRepository } = await import('../repository/marketing.repository');
      const repo = new MarketingRepository();
      await repo.insertTouchpoint({
        contactId,
        eventType: input.eventType === 'opened' ? 'email_open' : 'email_click',
        channelCode: 'email',
        attribution: {
          campaign_key: input.campaignKey ?? '',
          message_id: input.messageId ?? '',
        },
      });
    }

    return { ok: true, duplicate: rowCount === 0 };
  } catch {
    return { ok: false };
  }
}

export async function summarizeEmailEngagement(): Promise<{
  kind: 'ACTUAL' | 'UNAVAILABLE';
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  openRate: number | null;
  clickRate: number | null;
}> {
  try {
    const { query } = await import('../../../database/connection');
    const { rows } = await query<{ event_type: string; count: string }>(
      `SELECT event_type, COUNT(*)::text AS count
       FROM marketing_email_events
       GROUP BY event_type`
    );
    const map = new Map(rows.map((r) => [r.event_type, Number(r.count) || 0]));
    const sent = map.get('sent') ?? 0;
    const delivered = map.get('delivered') ?? 0;
    const opened = map.get('opened') ?? 0;
    const clicked = map.get('clicked') ?? 0;
    const bounced = map.get('bounced') ?? 0;
    const unsubscribed = map.get('unsubscribed') ?? 0;
    const denom = delivered > 0 ? delivered : sent;
    return {
      kind: rows.length ? 'ACTUAL' : 'UNAVAILABLE',
      sent,
      delivered,
      opened,
      clicked,
      bounced,
      unsubscribed,
      openRate: denom > 0 ? opened / denom : null,
      clickRate: denom > 0 ? clicked / denom : null,
    };
  } catch {
    return {
      kind: 'UNAVAILABLE',
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      unsubscribed: 0,
      openRate: null,
      clickRate: null,
    };
  }
}
