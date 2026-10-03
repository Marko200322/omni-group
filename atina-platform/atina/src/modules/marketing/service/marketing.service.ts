import { config } from '../../../config';
import { MARKETING_ENGINE_VERSION } from '../lib/constants';
import { computeChannelEconomics } from '../lib/economics';
import { attributeTouchpoints } from '../lib/attribution';
import { reconcileMarketing } from '../lib/reconcile';
import { recommendNextEur } from '../lib/budget-optimizer';
import { runWhatIf } from '../lib/scenario';
import { computeMarketingHealth } from '../lib/health';
import { defaultAdapters, ManualCsvAdapter } from '../lib/adapters';
import { MarketingRepository } from '../repository/marketing.repository';

type Actor = { userId: string; role: string };

export class MarketingService {
  private readonly repo = new MarketingRepository();

  async getOverview() {
    try {
      const [
        channels,
        spendByChannel,
        spendCount,
        touchCount,
        crm,
        payments,
        openAlerts,
        readyOps,
        recommendations,
      ] = await Promise.all([
        this.repo.listChannels(),
        this.repo.sumSpendByChannel(),
        this.repo.countSpendEntries(),
        this.repo.countTouchpoints(),
        this.repo.countCrmContacts(),
        this.repo.observeCollectedPayments(),
        this.repo.countOpenAlerts(),
        this.repo.countReinvestmentReady(),
        this.repo.listRecommendations(5),
      ]);

      const spendMap = new Map(
        spendByChannel.rows.map((r) => [r.channel_code, Number(r.spend_cents) || 0])
      );
      const totalSpendCents = [...spendMap.values()].reduce((a, b) => a + b, 0);
      const leads = Number(crm.rows[0]?.count ?? 0) || 0;
      const customers = Number(payments.rows[0]?.payment_count ?? 0) || 0;
      const revenueEur = Number(payments.rows[0]?.revenue ?? 0) || 0;
      const spendEur = totalSpendCents / 100;

      // Leads/customers are global first-party until per-channel attribution is populated.
      const economics = computeChannelEconomics({
        spend: spendEur,
        leads,
        qualifiedLeads: 0, // unknown without qualification labels — not invented rate
        opportunities: 0,
        offers: 0,
        customers,
        revenue: revenueEur,
      });

      // Use null for unknown qualified funnel stages
      const economicsSafe = {
        ...economics,
        cpql: null as number | null,
        leadToQualified: null as number | null,
        qualifiedToOpportunity: null as number | null,
        opportunityToOffer: null as number | null,
        offerToCustomer: null as number | null,
      };

      const [touchByChannel, attrByChannel] = await Promise.all([
        this.repo.countTouchpointsByChannel(),
        this.repo.countAttributionsByChannel(),
      ]);
      const leadByChannel = new Map(
        touchByChannel.rows.map((r) => [r.channel_code, Number(r.count) || 0])
      );
      const custByChannel = new Map(
        attrByChannel.rows.map((r) => [r.channel_code, Number(r.count) || 0])
      );

      let topChannelCode: string | null = null;
      let topSpend = -1;
      for (const [code, cents] of spendMap) {
        if (cents > topSpend) {
          topSpend = cents;
          topChannelCode = code;
        }
      }

      const channelRows = channels.rows.map((c) => {
        const chSpend = (spendMap.get(c.code) ?? 0) / 100;
        const chLeads = leadByChannel.get(c.code) ?? 0;
        const chCustomers = custByChannel.get(c.code) ?? 0;
        // Revenue by channel only when attribution exists — otherwise 0 not invented share
        const chRevenue =
          customers > 0 && chCustomers > 0 ? (revenueEur * chCustomers) / customers : 0;
        const econ = computeChannelEconomics({
          spend: chSpend,
          leads: chLeads,
          qualifiedLeads: 0,
          opportunities: 0,
          offers: 0,
          customers: chCustomers,
          revenue: chRevenue,
        });
        return {
          code: c.code,
          name: c.name,
          type: c.channel_type,
          active: c.is_active,
          spendEur: chSpend,
          leads: chLeads,
          customers: chCustomers,
          revenueEur: chRevenue || null,
          cpl: econ.cpl,
          cac: econ.cac,
          contribution: econ.contribution,
          marketingContribution: econ.marketingContribution,
          roi: econ.roi,
          kind: chSpend > 0 || chLeads > 0 || chCustomers > 0 ? 'ACTUAL' : 'UNAVAILABLE',
        };
      });

      return {
        engineVersion: MARKETING_ENGINE_VERSION,
        enabled: config.marketing?.enabled !== false,
        autonomyLevel: config.marketing?.autonomyLevel ?? 1,
        kind: channels.rows.length > 0 ? ('ACTUAL' as const) : ('UNAVAILABLE' as const),
        totals: {
          spendCents: totalSpendCents,
          spendEur,
          leads,
          qualifiedLeads: null as number | null,
          customers,
          revenueEur,
          contributionEur: economics.contribution,
          cac: economics.cac,
          cpl: economics.cpl,
          roi: economics.roi,
          roas: economics.roas,
        },
        economics: economicsSafe,
        channels: channelRows,
        topChannelCode,
        touchpoints: Number(touchCount.rows[0]?.count ?? 0) || 0,
        spendEntries: Number(spendCount.rows[0]?.count ?? 0) || 0,
        openAlerts: Number(openAlerts.rows[0]?.count ?? 0) || 0,
        openRecommendations: recommendations.rows.filter(
          (r: { status?: string }) => r.status === 'open'
        ).length,
        reinvestmentReadyOpportunities: Number(readyOps.rows[0]?.count ?? 0) || 0,
        note: 'Qualified-lead rates shown N/A until lead qualification labels exist. Revenue = collected payments only.',
      };
    } catch {
      return {
        engineVersion: MARKETING_ENGINE_VERSION,
        enabled: config.marketing?.enabled !== false,
        autonomyLevel: config.marketing?.autonomyLevel ?? 1,
        kind: 'UNAVAILABLE' as const,
        totals: {
          spendCents: null,
          spendEur: null,
          leads: null,
          qualifiedLeads: null,
          customers: null,
          revenueEur: null,
          contributionEur: null,
          cac: null,
          cpl: null,
          roi: null,
          roas: null,
        },
        economics: null,
        channels: [],
        topChannelCode: null,
        touchpoints: 0,
        spendEntries: 0,
        openAlerts: 0,
        openRecommendations: 0,
        reinvestmentReadyOpportunities: 0,
        note: 'Marketing tables unavailable — run migration 046',
      };
    }
  }

  async getHealth() {
    const [overview, experiments, budgets] = await Promise.all([
      this.getOverview(),
      this.repo.listExperiments(5),
      this.repo.listBudgets(1),
    ]);
    const recon = await this.getReconciliation();
    return computeMarketingHealth({
      hasTracking: (overview.touchpoints ?? 0) > 0,
      touchpointCount: overview.touchpoints ?? 0,
      spendEntries: overview.spendEntries ?? 0,
      channelCount: overview.channels?.length ?? 0,
      openAlerts: overview.openAlerts ?? 0,
      hasDiscrepancy: recon.hasDiscrepancy,
      budgetConfigured: (budgets.rows?.length ?? 0) > 0,
      experimentCount: experiments.rows?.length ?? 0,
      leads: overview.totals.leads ?? 0,
      customers: overview.totals.customers ?? 0,
    });
  }

  async getChannels() {
    const overview = await this.getOverview();
    return { kind: overview.kind, channels: overview.channels };
  }

  async getCampaigns(limit = 50) {
    const { rows } = await this.repo.listCampaigns(limit);
    return { kind: rows.length ? 'ACTUAL' : 'UNAVAILABLE', campaigns: rows };
  }

  async getFunnel() {
    const overview = await this.getOverview();
    return {
      kind: overview.kind,
      stages: [
        { name: 'lead', count: overview.totals.leads, kind: 'ACTUAL' },
        { name: 'qualified_lead', count: null, kind: 'UNAVAILABLE' },
        { name: 'opportunity', count: null, kind: 'UNAVAILABLE' },
        { name: 'offer', count: null, kind: 'UNAVAILABLE' },
        { name: 'customer', count: overview.totals.customers, kind: 'ACTUAL' },
        { name: 'revenue_collected', count: overview.totals.revenueEur, kind: 'ACTUAL' },
      ],
      note: 'Missing stages labeled UNAVAILABLE — not invented',
    };
  }

  async getAttribution() {
    const { rows } = await this.repo.listRecentTouchpoints(100);
    if (!rows.length) {
      const empty = attributeTouchpoints([], 'last_touch');
      return {
        kind: 'UNAVAILABLE' as const,
        ...empty,
        touchpoints: [],
        note: 'ATTRIBUTION_UNCERTAIN until touchpoints link visitor→lead→payment',
      };
    }
    const byContact = new Map<string, typeof rows>();
    for (const tp of rows) {
      const key = tp.contact_id ?? `anon:${tp.id}`;
      const list = byContact.get(key) ?? [];
      list.push(tp);
      byContact.set(key, list);
    }
    const journeys = [...byContact.entries()].slice(0, 20).map(([contactId, tps]) => {
      const result = attributeTouchpoints(
        tps.map((t) => ({
          id: t.id,
          channelCode: t.channel_code,
          occurredAt: t.occurred_at,
        })),
        'last_touch'
      );
      return { contactId, touchCount: tps.length, ...result };
    });
    const certain = journeys.filter((j) => !j.labeledUncertain).length;
    return {
      kind: certain > 0 ? ('ACTUAL' as const) : ('UNAVAILABLE' as const),
      model: 'last_touch' as const,
      journeys,
      touchpoints: rows.slice(0, 30),
      note:
        certain > 0
          ? 'Last-touch attribution from recorded touchpoints (OBSERVED). Payment link still partial.'
          : 'ATTRIBUTION_UNCERTAIN',
    };
  }

  async getEconomics() {
    const overview = await this.getOverview();
    return {
      kind: overview.kind,
      totals: overview.totals,
      economics: overview.economics,
      nextEur100: recommendNextEur(
        (overview.channels ?? []).map((c: { code: string; spendEur: number; contribution: number; cac: number | null }) => ({
          channelCode: c.code,
          spend: c.spendEur,
          customers: 0,
          contribution: c.contribution,
          cac: c.cac,
          confidence: 'low' as const,
        })),
        100
      ),
    };
  }

  async getBudgets() {
    const { rows } = await this.repo.listBudgets();
    return { kind: rows.length ? 'ACTUAL' : 'UNAVAILABLE', budgets: rows };
  }

  async getExperiments(limit = 50) {
    const { rows } = await this.repo.listExperiments(limit);
    return { kind: rows.length ? 'ACTUAL' : 'UNAVAILABLE', experiments: rows };
  }

  async getRecommendations(limit = 50) {
    const { rows } = await this.repo.listRecommendations(limit);
    return { kind: rows.length ? 'ACTUAL' : 'UNAVAILABLE', recommendations: rows };
  }

  async getOpportunities(limit = 50) {
    const { rows } = await this.repo.listOpportunities(limit);
    return { kind: rows.length ? 'ACTUAL' : 'UNAVAILABLE', opportunities: rows };
  }

  async getAlerts(limit = 50) {
    const { rows } = await this.repo.listAlerts(limit);
    return rows;
  }

  async runWhatIf(body: {
    spendMultiplier?: number;
    leadMultiplier?: number;
    customerMultiplier?: number;
    cacIncreasePct?: number;
    conversionFallPct?: number;
  }) {
    const overview = await this.getOverview();
    return runWhatIf({
      spend: overview.totals.spendEur ?? 0,
      leads: overview.totals.leads ?? 0,
      qualifiedLeads: 0,
      opportunities: 0,
      offers: 0,
      customers: overview.totals.customers ?? 0,
      revenue: overview.totals.revenueEur ?? 0,
      ...body,
    });
  }

  async ingestSpendManual(
    actor: Actor,
    body: {
      channelCode: string;
      amountCents: number;
      spentOn?: string;
      impressions?: number;
      clicks?: number;
      idempotencyKey: string;
    }
  ) {
    await this.repo.insertSpend({
      channelCode: body.channelCode,
      amountCents: body.amountCents,
      spentOn: body.spentOn ?? new Date().toISOString().slice(0, 10),
      source: 'manual',
      kind: 'ACTUAL',
      impressions: body.impressions,
      clicks: body.clicks,
      idempotencyKey: body.idempotencyKey,
    });
    await this.repo.appendAudit({
      action: 'spend.ingest',
      actorUserId: actor.userId,
      decision: 'ok',
      reason: 'manual_ingest',
      inputRefs: { channelCode: body.channelCode, amountCents: body.amountCents },
    });
    return { ok: true, kind: 'ACTUAL' };
  }

  async ingestCsv(actor: Actor, csvText: string) {
    const adapter = new ManualCsvAdapter(csvText);
    const result = await adapter.sync();
    let inserted = 0;
    for (const row of result.rows ?? []) {
      await this.repo.insertSpend({
        channelCode: row.channelCode,
        amountCents: row.amountCents,
        spentOn: row.spentOn,
        source: 'csv',
        impressions: row.impressions,
        clicks: row.clicks,
        idempotencyKey: row.idempotencyKey,
      });
      inserted += 1;
    }
    await this.repo.appendAudit({
      action: 'spend.csv',
      actorUserId: actor.userId,
      decision: 'ok',
      inputRefs: { inserted },
    });
    return { ...result, inserted };
  }

  async syncAdapters(actor: Actor) {
    const results = [];
    let inserted = 0;
    for (const adapter of defaultAdapters()) {
      const r = await adapter.sync();
      await this.repo.insertSyncRun(r.adapter, r.status, r.message, {
        kind: r.kind,
        rowCount: r.rows?.length ?? 0,
      });
      if (r.status === 'success' && r.rows?.length) {
        const source =
          r.adapter === 'google_ads' ? 'google' : r.adapter === 'meta_ads' ? 'meta' : 'manual';
        for (const row of r.rows) {
          if (row.campaignExternalId) {
            await this.repo.upsertCampaignFromExternal({
              channelCode: row.channelCode,
              externalId: row.campaignExternalId,
              name: row.campaignName ?? row.campaignExternalId,
              packageSku: row.packageSku ?? null,
            });
          }
          await this.repo.insertSpend({
            channelCode: row.channelCode,
            amountCents: row.amountCents,
            spentOn: row.spentOn,
            source,
            kind: 'ACTUAL',
            impressions: row.impressions,
            clicks: row.clicks,
            platformConversions: row.platformConversions,
            idempotencyKey: row.idempotencyKey,
          });
          inserted += 1;
        }
      }
      results.push({
        adapter: r.adapter,
        kind: r.kind,
        status: r.status,
        message: r.message,
        rows: r.rows?.length ?? 0,
      });
    }
    await this.repo.appendAudit({
      action: 'adapters.sync',
      actorUserId: actor.userId,
      decision: 'ok',
      inputRefs: { count: results.length, inserted },
    });
    return { kind: 'ACTUAL' as const, inserted, results };
  }

  async getEmailEngagement() {
    const { summarizeEmailEngagement } = await import('../lib/email-engagement');
    return summarizeEmailEngagement();
  }

  async getPackageMatrix() {
    const { buildPackageChannelMatrix } = await import('../lib/package-channel-matrix');
    return buildPackageChannelMatrix();
  }

  async ingestResendWebhook(payload: Record<string, unknown>) {
    const { ingestResendWebhookPayload } = await import('../lib/email-engagement');
    return ingestResendWebhookPayload(payload);
  }

  async runEngine(actor: Actor) {
    const overview = await this.getOverview();
    const health = await this.getHealth();
    const next = (await this.getEconomics()).nextEur100;

    // Anomaly: spend with zero leads
    for (const ch of overview.channels ?? []) {
      if ((ch.spendEur ?? 0) > 0 && (ch.leads ?? 0) === 0 && (ch.customers ?? 0) === 0) {
        await this.repo.insertAlert({
          code: 'spend_without_leads',
          severity: 'warning',
          message: `${ch.code} has spend €${ch.spendEur} but 0 attributed leads/customers`,
          evidence: { channel: ch.code, spendEur: ch.spendEur },
        });
      }
    }

    // Persist next-€ recommendation + optional reinvestment opportunity (no spend)
    if (next?.allocations?.length) {
      const primary = next.allocations[0];
      const { rows: recRows } = await this.repo.insertRecommendation({
        recommendation: `Allocate €${primary.amountEur} to ${primary.channelCode} (${primary.bucket})`,
        reason: primary.reason,
        confidence: primary.confidence,
        risk: primary.risk,
        requiredBudgetCents: Math.round(primary.amountEur * 100),
        expectedImpact: 'FORECAST only — recommendation, not a transaction',
        supportingData: next as unknown as Record<string, unknown>,
      });
      const recId = (recRows[0] as { id?: string } | undefined)?.id;
      if (recId && primary.confidence === 'high') {
        await this.repo.insertOpportunity({
          title: `Marketing: increase ${primary.channelCode} test budget`,
          recommendationId: recId,
          validationStatus: 'forecast',
          forecast: { kind: 'FORECAST', allocation: primary },
          reinvestmentReady: true,
        });
      }
    }

    await this.repo.appendAudit({
      action: 'engine.run',
      actorUserId: actor.userId,
      decision: 'ok',
      reason: 'admin_refresh',
      inputRefs: { overallHealth: health.overall },
    });
    return {
      engineVersion: MARKETING_ENGINE_VERSION,
      overview,
      health,
      autonomyLevel: config.marketing?.autonomyLevel ?? 1,
      note: 'Observe + recommend only (LEVEL 1). No spend executed.',
    };
  }

  async answerOmi(question: string) {
    const { answerMarketingAdminQuestion } = await import('../lib/omi-marketing');
    return answerMarketingAdminQuestion(question);
  }

  async createExperiment(
    actor: Actor,
    body: {
      hypothesis: string;
      channelCode?: string;
      budgetCents?: number;
      kpi?: string;
      minSample?: number;
      successCriteria?: string;
      failureCriteria?: string;
    }
  ) {
    const { rows } = await this.repo.insertExperiment(body);
    await this.repo.appendAudit({
      action: 'experiment.create',
      actorUserId: actor.userId,
      decision: 'ok',
      inputRefs: { id: (rows[0] as { id?: string })?.id },
    });
    return rows[0];
  }

  async attributeContact(
    actor: Actor,
    body: { contactId: string; paymentId?: string; model?: 'first_touch' | 'last_touch' | 'linear' }
  ) {
    const { rows } = await this.repo.listTouchpointsForContact(body.contactId);
    const result = attributeTouchpoints(
      rows.map((t) => ({
        id: t.id,
        channelCode: t.channel_code,
        campaignId: t.campaign_id,
        occurredAt: t.occurred_at,
      })),
      body.model ?? 'last_touch'
    );
    for (const share of result.shares) {
      await this.repo.insertAttribution({
        contactId: body.contactId,
        paymentId: body.paymentId ?? null,
        model: result.model,
        channelCode: share.channelCode,
        campaignId: share.campaignId,
        confidence: result.confidence,
        weight: share.weight,
        labeledUncertain: result.labeledUncertain,
        evidence: { label: result.label },
      });
    }
    await this.repo.appendAudit({
      action: 'attribution.write',
      actorUserId: actor.userId,
      decision: result.labeledUncertain ? 'uncertain' : 'ok',
      inputRefs: { contactId: body.contactId, paymentId: body.paymentId },
    });
    return result;
  }

  async getReinvestmentSignals() {
    const { fetchMarketingSignalsForReinvestment } = await import('../lib/reinvestment-bridge');
    return fetchMarketingSignalsForReinvestment();
  }

  async getMonitoringSignals() {
    const { fetchMarketingAnomaliesForMonitoring } = await import('../lib/monitoring-bridge');
    return fetchMarketingAnomaliesForMonitoring();
  }

  async getReconciliation() {
    const overview = await this.getOverview();
    return reconcileMarketing(
      { conversions: null, conversionValue: null, spend: overview.totals.spendEur },
      {
        leads: overview.totals.leads ?? 0,
        qualifiedLeads: 0,
        customers: overview.totals.customers ?? 0,
        revenueCollected: overview.totals.revenueEur ?? 0,
      }
    );
  }
}
