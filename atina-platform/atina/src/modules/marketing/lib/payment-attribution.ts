/**
 * Fail-soft: after payment completes, attribute to marketing touchpoints.
 * Never blocks checkout / confirm. Never invents attribution.
 */
import { createHash } from 'crypto';
import { attributeTouchpoints } from './attribution';
import { inferChannelFromAttribution } from './channel-infer';

export type PaymentAttributionInput = {
  paymentId: string;
  userId: string;
  amountEur: number;
  metadata: Record<string, unknown>;
};

async function findContactIdForUser(userId: string): Promise<{
  contactId: string | null;
  email: string | null;
  attribution: Record<string, string>;
}> {
  const { query } = await import('../../../database/connection');
  const { rows: users } = await query<{ email: string | null }>(
    `SELECT email FROM users WHERE id = $1`,
    [userId]
  );
  const email = users[0]?.email ?? null;
  if (!email) return { contactId: null, email: null, attribution: {} };

  const { rows: contacts } = await query<{
    id: string;
    custom_fields: Record<string, unknown> | string;
  }>(
    `SELECT id, custom_fields FROM crm_contacts
     WHERE lower(email) = lower($1)
     ORDER BY updated_at DESC NULLS LAST
     LIMIT 1`,
    [email]
  );
  const contact = contacts[0];
  if (!contact) return { contactId: null, email, attribution: {} };

  const fields =
    typeof contact.custom_fields === 'string'
      ? (JSON.parse(contact.custom_fields || '{}') as Record<string, unknown>)
      : (contact.custom_fields ?? {});
  const attr =
    fields.attribution && typeof fields.attribution === 'object'
      ? (fields.attribution as Record<string, string>)
      : {};
  return { contactId: contact.id, email, attribution: attr };
}

export async function attributeCompletedPayment(
  input: PaymentAttributionInput
): Promise<{ ok: boolean; labeledUncertain: boolean; shares: number }> {
  try {
    const { MarketingRepository } = await import('../repository/marketing.repository');
    const repo = new MarketingRepository();
    const { contactId, attribution } = await findContactIdForUser(input.userId);

    const packageSku = String(
      input.metadata.deliverableId ?? input.metadata.planSlug ?? input.metadata.packageSku ?? ''
    ).trim();

    let touchRows: Array<{
      id: string;
      channel_code: string | null;
      campaign_id: string | null;
      occurred_at: string;
    }> = [];

    if (contactId) {
      const { rows } = await repo.listTouchpointsForContact(contactId);
      touchRows = rows;
    }

    // If no touchpoints but UTM on CRM attribution, synthesize a single observed touch
    if (!touchRows.length && Object.keys(attribution).length) {
      const channelCode = inferChannelFromAttribution(attribution);
      if (contactId) {
        await repo.insertTouchpoint({
          contactId,
          utmSource: attribution.utm_source,
          utmMedium: attribution.utm_medium,
          utmCampaign: attribution.utm_campaign,
          utmContent: attribution.utm_content,
          utmTerm: attribution.utm_term,
          eventType: 'purchase',
          channelCode,
          attribution: { ...attribution, paymentId: input.paymentId },
        });
        const refreshed = await repo.listTouchpointsForContact(contactId);
        touchRows = refreshed.rows;
      }
    }

    const result = attributeTouchpoints(
      touchRows.map((t) => ({
        id: t.id,
        channelCode: t.channel_code,
        campaignId: t.campaign_id,
        occurredAt: t.occurred_at,
      })),
      'last_touch'
    );

    for (const share of result.shares) {
      await repo.insertAttribution({
        contactId,
        paymentId: input.paymentId,
        model: result.model,
        channelCode: share.channelCode,
        campaignId: share.campaignId,
        confidence: result.confidence,
        weight: share.weight,
        labeledUncertain: result.labeledUncertain,
        evidence: {
          label: result.label,
          packageSku: packageSku || null,
          amountEur: input.amountEur,
          userIdHash: createHash('sha256').update(input.userId).digest('hex').slice(0, 16),
        },
      });
    }

    if (result.labeledUncertain || !result.shares.length) {
      await repo.insertAttribution({
        contactId,
        paymentId: input.paymentId,
        model: 'last_touch',
        channelCode: inferChannelFromAttribution(attribution),
        confidence: 'uncertain',
        weight: 1,
        labeledUncertain: true,
        evidence: {
          label: 'ATTRIBUTION_UNCERTAIN',
          packageSku: packageSku || null,
          amountEur: input.amountEur,
          reason: 'no_touchpoints',
        },
      });
    }

    // Upsert package×channel ACTUAL row when we have a certain channel + sku
    if (packageSku && !result.labeledUncertain) {
      for (const share of result.shares) {
        if (!share.channelCode) continue;
        const revenueCents = Math.round(input.amountEur * 100 * share.weight);
        await repo.upsertPackageChannelStat({
          packageSku,
          channelCode: share.channelCode,
          customersDelta: share.weight >= 0.5 ? 1 : 0,
          revenueCentsDelta: revenueCents,
        });
      }
    }

    await repo.appendAudit({
      action: 'payment.attribute',
      decision: result.labeledUncertain ? 'uncertain' : 'ok',
      reason: 'auto_on_payment_complete',
      inputRefs: { paymentId: input.paymentId, shares: result.shares.length, packageSku },
    });

    return {
      ok: true,
      labeledUncertain: result.labeledUncertain || result.shares.length === 0,
      shares: result.shares.length,
    };
  } catch {
    return { ok: false, labeledUncertain: true, shares: 0 };
  }
}

export function dispatchPaymentAttribution(input: PaymentAttributionInput): void {
  void attributeCompletedPayment(input).catch(() => undefined);
}
