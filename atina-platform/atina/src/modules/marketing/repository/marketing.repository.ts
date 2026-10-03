import { query } from '../../../database/connection';

export type MarketingChannelRow = {
  code: string;
  name: string;
  channel_type: string;
  is_active: boolean;
  monthly_budget_cents: string | number;
  daily_budget_cents: string | number;
};

export class MarketingRepository {
  async listChannels() {
    return query<MarketingChannelRow>(
      `SELECT code, name, channel_type, is_active, monthly_budget_cents, daily_budget_cents
       FROM marketing_channels ORDER BY code`
    ).catch(() => ({ rows: [] as MarketingChannelRow[], rowCount: 0 }));
  }

  async listCampaigns(limit = 50) {
    return query<{
      id: string;
      channel_code: string;
      name: string;
      status: string;
      package_sku: string | null;
    }>(
      `SELECT id, channel_code, name, status, package_sku
       FROM marketing_campaigns ORDER BY updated_at DESC NULLS LAST LIMIT $1`,
      [limit]
    ).catch(() => ({ rows: [], rowCount: 0 }));
  }

  async sumSpendByChannel() {
    return query<{ channel_code: string; spend_cents: string; impressions: string; clicks: string }>(
      `SELECT channel_code,
              COALESCE(SUM(amount_cents),0)::text AS spend_cents,
              COALESCE(SUM(impressions),0)::text AS impressions,
              COALESCE(SUM(clicks),0)::text AS clicks
       FROM marketing_spend_entries
       WHERE kind = 'ACTUAL'
       GROUP BY channel_code`
    ).catch(() => ({ rows: [], rowCount: 0 }));
  }

  async countSpendEntries() {
    return query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM marketing_spend_entries`).catch(
      () => ({ rows: [{ count: '0' }], rowCount: 1 })
    );
  }

  async countTouchpoints() {
    return query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM marketing_touchpoints`).catch(
      () => ({ rows: [{ count: '0' }], rowCount: 1 })
    );
  }

  async insertSpend(entry: {
    channelCode: string;
    campaignId?: string | null;
    amountCents: number;
    currency?: string;
    spentOn: string;
    source: string;
    kind?: string;
    impressions?: number | null;
    clicks?: number | null;
    platformConversions?: number | null;
    idempotencyKey: string;
  }) {
    return query(
      `INSERT INTO marketing_spend_entries
         (channel_code, campaign_id, amount_cents, currency, spent_on, source, kind,
          impressions, clicks, platform_conversions, idempotency_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (idempotency_key) DO NOTHING
       RETURNING id`,
      [
        entry.channelCode,
        entry.campaignId ?? null,
        entry.amountCents,
        entry.currency ?? 'EUR',
        entry.spentOn,
        entry.source,
        entry.kind ?? 'ACTUAL',
        entry.impressions ?? null,
        entry.clicks ?? null,
        entry.platformConversions ?? null,
        entry.idempotencyKey,
      ]
    );
  }

  async insertTouchpoint(tp: {
    visitorKey?: string | null;
    sessionKey?: string | null;
    contactId?: string | null;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    utmContent?: string | null;
    utmTerm?: string | null;
    landingPage?: string | null;
    referrer?: string | null;
    eventType?: string;
    channelCode?: string | null;
    attribution?: Record<string, unknown>;
  }) {
    return query(
      `INSERT INTO marketing_touchpoints
         (visitor_key, session_key, contact_id, utm_source, utm_medium, utm_campaign,
          utm_content, utm_term, landing_page, referrer, event_type, channel_code, attribution)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)
       RETURNING id`,
      [
        tp.visitorKey ?? null,
        tp.sessionKey ?? null,
        tp.contactId ?? null,
        tp.utmSource ?? null,
        tp.utmMedium ?? null,
        tp.utmCampaign ?? null,
        tp.utmContent ?? null,
        tp.utmTerm ?? null,
        tp.landingPage ?? null,
        tp.referrer ?? null,
        tp.eventType ?? 'lead',
        tp.channelCode ?? null,
        JSON.stringify(tp.attribution ?? {}),
      ]
    );
  }

  async listRecommendations(limit = 50) {
    return query(
      `SELECT * FROM marketing_recommendations ORDER BY created_at DESC LIMIT $1`,
      [limit]
    ).catch(() => ({ rows: [], rowCount: 0 }));
  }

  async listOpportunities(limit = 50) {
    return query(
      `SELECT * FROM marketing_opportunities ORDER BY created_at DESC LIMIT $1`,
      [limit]
    ).catch(() => ({ rows: [], rowCount: 0 }));
  }

  async listAlerts(limit = 50) {
    return query(
      `SELECT * FROM marketing_alerts ORDER BY created_at DESC LIMIT $1`,
      [limit]
    ).catch(() => ({ rows: [], rowCount: 0 }));
  }

  async listExperiments(limit = 50) {
    return query(
      `SELECT * FROM marketing_experiments ORDER BY created_at DESC LIMIT $1`,
      [limit]
    ).catch(() => ({ rows: [], rowCount: 0 }));
  }

  async listBudgets(limit = 20) {
    return query(
      `SELECT * FROM marketing_budgets ORDER BY period_start DESC LIMIT $1`,
      [limit]
    ).catch(() => ({ rows: [], rowCount: 0 }));
  }

  async countOpenAlerts() {
    return query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM marketing_alerts WHERE status = 'open'`
    ).catch(() => ({ rows: [{ count: '0' }], rowCount: 1 }));
  }

  async countReinvestmentReady() {
    return query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM marketing_opportunities WHERE reinvestment_ready = TRUE`
    ).catch(() => ({ rows: [{ count: '0' }], rowCount: 1 }));
  }

  async appendAudit(entry: {
    action: string;
    actorUserId?: string;
    decision?: string;
    reason?: string;
    inputRefs?: Record<string, unknown>;
  }) {
    return query(
      `INSERT INTO marketing_audit_logs (action, actor_user_id, decision, reason, input_refs)
       VALUES ($1,$2,$3,$4,$5::jsonb)`,
      [
        entry.action,
        entry.actorUserId ?? null,
        entry.decision ?? null,
        entry.reason ?? null,
        JSON.stringify(entry.inputRefs ?? {}),
      ]
    ).catch(() => ({ rows: [], rowCount: 0 }));
  }

  async insertSyncRun(adapter: string, status: string, error?: string, stats?: Record<string, unknown>) {
    return query(
      `INSERT INTO marketing_sync_runs (adapter, status, finished_at, error, stats)
       VALUES ($1,$2,NOW(),$3,$4::jsonb)`,
      [adapter, status, error ?? null, JSON.stringify(stats ?? {})]
    ).catch(() => ({ rows: [], rowCount: 0 }));
  }

  /** First-party CRM lead count — fail-soft. */
  async countTouchpointsByChannel() {
    return query<{ channel_code: string; count: string }>(
      `SELECT COALESCE(channel_code, 'unknown') AS channel_code, COUNT(*)::text AS count
       FROM marketing_touchpoints
       GROUP BY COALESCE(channel_code, 'unknown')`
    ).catch(() => ({ rows: [], rowCount: 0 }));
  }

  async listRecentTouchpoints(limit = 50) {
    return query<{
      id: string;
      contact_id: string | null;
      channel_code: string | null;
      utm_source: string | null;
      utm_medium: string | null;
      utm_campaign: string | null;
      event_type: string;
      occurred_at: string;
    }>(
      `SELECT id, contact_id, channel_code, utm_source, utm_medium, utm_campaign, event_type, occurred_at
       FROM marketing_touchpoints
       ORDER BY occurred_at DESC
       LIMIT $1`,
      [limit]
    ).catch(() => ({ rows: [], rowCount: 0 }));
  }

  async listTouchpointsForContact(contactId: string) {
    return query<{
      id: string;
      channel_code: string | null;
      campaign_id: string | null;
      occurred_at: string;
    }>(
      `SELECT id, channel_code, campaign_id, occurred_at
       FROM marketing_touchpoints
       WHERE contact_id = $1
       ORDER BY occurred_at ASC`,
      [contactId]
    ).catch(() => ({ rows: [], rowCount: 0 }));
  }

  async insertAttribution(row: {
    contactId?: string | null;
    paymentId?: string | null;
    model: string;
    channelCode?: string | null;
    campaignId?: string | null;
    confidence: string;
    weight: number;
    labeledUncertain: boolean;
    evidence?: Record<string, unknown>;
  }) {
    return query(
      `INSERT INTO marketing_attributions
         (contact_id, payment_id, model, channel_code, campaign_id, confidence, weight, labeled_uncertain, evidence)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
       RETURNING id`,
      [
        row.contactId ?? null,
        row.paymentId ?? null,
        row.model,
        row.channelCode ?? null,
        row.campaignId ?? null,
        row.confidence,
        row.weight,
        row.labeledUncertain,
        JSON.stringify(row.evidence ?? {}),
      ]
    ).catch(() => ({ rows: [], rowCount: 0 }));
  }

  async countAttributionsByChannel() {
    return query<{ channel_code: string; count: string }>(
      `SELECT COALESCE(channel_code, 'unknown') AS channel_code, COUNT(*)::text AS count
       FROM marketing_attributions
       WHERE labeled_uncertain = FALSE
       GROUP BY COALESCE(channel_code, 'unknown')`
    ).catch(() => ({ rows: [], rowCount: 0 }));
  }

  async insertRecommendation(row: {
    recommendation: string;
    reason: string;
    confidence?: string;
    expectedImpact?: string;
    risk?: string;
    requiredBudgetCents?: number;
    supportingData?: Record<string, unknown>;
  }) {
    return query(
      `INSERT INTO marketing_recommendations
         (recommendation, reason, confidence, expected_impact, risk, required_budget_cents, supporting_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
       RETURNING *`,
      [
        row.recommendation,
        row.reason,
        row.confidence ?? 'medium',
        row.expectedImpact ?? null,
        row.risk ?? 'medium',
        row.requiredBudgetCents ?? 0,
        JSON.stringify(row.supportingData ?? {}),
      ]
    );
  }

  async insertExperiment(row: {
    hypothesis: string;
    channelCode?: string | null;
    budgetCents?: number;
    kpi?: string;
    minSample?: number;
    successCriteria?: string;
    failureCriteria?: string;
  }) {
    return query(
      `INSERT INTO marketing_experiments
         (hypothesis, channel_code, budget_cents, kpi, min_sample, success_criteria, failure_criteria, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'draft')
       RETURNING *`,
      [
        row.hypothesis,
        row.channelCode ?? null,
        row.budgetCents ?? 0,
        row.kpi ?? null,
        row.minSample ?? 30,
        row.successCriteria ?? null,
        row.failureCriteria ?? null,
      ]
    );
  }

  async insertAlert(row: {
    code: string;
    severity: string;
    message: string;
    evidence?: Record<string, unknown>;
  }) {
    return query(
      `INSERT INTO marketing_alerts (code, severity, message, evidence)
       VALUES ($1,$2,$3,$4::jsonb)
       RETURNING id`,
      [row.code, row.severity, row.message, JSON.stringify(row.evidence ?? {})]
    ).catch(() => ({ rows: [], rowCount: 0 }));
  }

  async insertOpportunity(row: {
    title: string;
    recommendationId?: string | null;
    validationStatus?: string;
    forecast?: Record<string, unknown>;
    reinvestmentReady?: boolean;
  }) {
    return query(
      `INSERT INTO marketing_opportunities
         (title, recommendation_id, validation_status, forecast, reinvestment_ready)
       VALUES ($1,$2,$3,$4::jsonb,$5)
       RETURNING *`,
      [
        row.title,
        row.recommendationId ?? null,
        row.validationStatus ?? 'draft',
        JSON.stringify(row.forecast ?? {}),
        row.reinvestmentReady ?? false,
      ]
    );
  }

  async upsertPackageChannelStat(row: {
    packageSku: string;
    channelCode: string;
    customersDelta: number;
    revenueCentsDelta: number;
    spendCentsDelta?: number;
  }) {
    return query(
      `INSERT INTO marketing_package_channel_stats
         (package_sku, channel_code, customers, revenue_cents, spend_cents, window_start, window_end, kind, updated_at)
       VALUES ($1,$2,$3,$4,$5, date_trunc('month', CURRENT_DATE)::date,
               (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date,
               'ACTUAL', NOW())
       ON CONFLICT (package_sku, channel_code, window_start, window_end)
       DO UPDATE SET
         customers = marketing_package_channel_stats.customers + EXCLUDED.customers,
         revenue_cents = marketing_package_channel_stats.revenue_cents + EXCLUDED.revenue_cents,
         spend_cents = marketing_package_channel_stats.spend_cents + EXCLUDED.spend_cents,
         updated_at = NOW()`,
      [
        row.packageSku,
        row.channelCode,
        row.customersDelta,
        row.revenueCentsDelta,
        row.spendCentsDelta ?? 0,
      ]
    ).catch(() => ({ rows: [], rowCount: 0 }));
  }

  async upsertCampaignFromExternal(row: {
    channelCode: string;
    externalId: string;
    name: string;
    packageSku?: string | null;
  }) {
    const updated = await query(
      `UPDATE marketing_campaigns
       SET name = $2, package_sku = COALESCE($4, package_sku), status = 'active', updated_at = NOW()
       WHERE channel_code = $1 AND external_id = $3
       RETURNING id`,
      [row.channelCode, row.name, row.externalId, row.packageSku ?? null]
    ).catch(() => ({ rows: [] as Array<{ id: string }>, rowCount: 0 }));
    if (updated.rows.length) return updated;
    return query(
      `INSERT INTO marketing_campaigns (channel_code, name, external_id, status, package_sku)
       VALUES ($1,$2,$3,'active',$4)
       RETURNING id`,
      [row.channelCode, row.name, row.externalId, row.packageSku ?? null]
    ).catch(() => ({ rows: [], rowCount: 0 }));
  }

  async countCrmContacts() {
    return query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM crm_contacts`).catch(() => ({
      rows: [{ count: '0' }],
      rowCount: 1,
    }));
  }

  /** Collected payments only (confirmed) — fail-soft. */
  async observeCollectedPayments() {
    return query<{ payment_count: string; revenue: string }>(
      `SELECT COUNT(*)::text AS payment_count,
              COALESCE(SUM(amount),0)::text AS revenue
       FROM payments
       WHERE status = 'completed'`
    ).catch(() => ({ rows: [{ payment_count: '0', revenue: '0' }], rowCount: 1 }));
  }
}
