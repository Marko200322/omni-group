/**
 * Fail-soft touchpoint recorder — Marketing must never break CRM/checkout.
 */
import { inferChannelFromAttribution } from './channel-infer';

export type AttributionPayload = Record<string, string | undefined> | null | undefined;

export async function recordLeadTouchpoint(opts: {
  contactId?: string | null;
  attribution?: AttributionPayload;
  eventType?: string;
  landingPage?: string | null;
  referrer?: string | null;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  try {
    const attr = (opts.attribution ?? {}) as Record<string, string>;
    const hasUtm = Boolean(
      attr.utm_source || attr.utm_medium || attr.utm_campaign || attr.gclid || attr.fbclid
    );
    if (!hasUtm && !opts.contactId) {
      return { ok: true, skipped: true };
    }

    const { MarketingRepository } = await import('../repository/marketing.repository');
    const repo = new MarketingRepository();
    const channelCode = inferChannelFromAttribution(attr);
    await repo.insertTouchpoint({
      contactId: opts.contactId ?? null,
      utmSource: attr.utm_source ?? null,
      utmMedium: attr.utm_medium ?? null,
      utmCampaign: attr.utm_campaign ?? null,
      utmContent: attr.utm_content ?? null,
      utmTerm: attr.utm_term ?? null,
      landingPage: opts.landingPage ?? attr.landing_page ?? null,
      referrer: opts.referrer ?? attr.referrer ?? null,
      eventType: opts.eventType ?? 'lead',
      channelCode,
      attribution: { ...attr, channelCode },
    });
    return { ok: true };
  } catch {
    return { ok: false, skipped: true };
  }
}
