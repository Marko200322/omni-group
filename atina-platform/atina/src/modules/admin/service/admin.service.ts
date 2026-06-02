import { moduleRegistry } from '../../../core/ModuleRegistry';
import { config } from '../../../config';
import logger from '../../../utils/logger';
import { totalPagesFromCount } from '../../../utils/pagination';
import { parseOnboardingDateRange, parseCreatedAtSort } from '../../../utils/onboarding-query';
import {
  getCurrentPhase,
  getModulePhaseGatingStatus,
  getModulePhaseRequirements,
  getPhaseOrder,
} from '../../phase-launch/middleware/phase-activation.middleware';
import { WorkflowChainService } from '../../workflow-chain/service/workflow-chain.service';
import type {
  AdminOverviewQueryDtoType,
  AdminWorkflowTemplateExecutionStatsQueryDtoType,
  AdminUsersListQueryDtoType,
  AdminPaymentsListQueryDtoType,
  AdminLogsListQueryDtoType,
  AdminOnboardingStatusListQueryDtoType,
  AdminOnboardingUserDetailQueryDtoType,
} from '../dto/admin.dto';
import type { StrictPaginationQuery } from '../../../api/dto/pagination-query.dto';
import {
  ONBOARDING_FEED_EVENT_TYPES,
  UUID_PARAM_RE,
  ONBOARDING_NAME_PREFIX_MAX,
  RETRY_ALL_IDEMPOTENCY_KEY_MAX,
  MONITORING_CONTRACT_VERSION,
  toAlertSeveritySummary,
  toTemplateExecutionMetric,
  summarizeTemplateExecutions,
  deriveSeverityFromGap,
  adjustSeverityByTrend,
  getTrendDirection,
  isCriticalTemplateAlert,
  summarizeWorkflowAlertTotals,
  deriveAlertConsistency,
  summarizePhaseGating,
  type TrendDirection,
} from '../admin.helpers';
import { AdminRepository, type OnboardingSummaryRow } from '../repository/admin.repository';

export class AdminService {
  private readonly repo = new AdminRepository();
  private readonly workflowChainService: WorkflowChainService;

  constructor(workflowChainService?: WorkflowChainService) {
    this.workflowChainService = workflowChainService ?? new WorkflowChainService();
  }

  async getOverview(query: AdminOverviewQueryDtoType) {
      const { templateSuccessRateAlertThreshold: alertThreshold } = query;
      const [
        users,
        subscriptions,
        payments,
        tasks,
        logs,
        workflowTemplates,
        workflowTemplateTrend7d,
        workflowTemplateTrendByKey7d,
        forgeBudgetBurn,
        forgeTopProvider,
        forgeRuns24h,
      ] = await this.repo.fetchOverviewStats();

      const registeredModules = moduleRegistry.getAll();
      const modules = registeredModules.map((m) => ({
        name: m.name,
        slug: m.slug,
        version: m.version,
        isCore: m.isCore,
      }));
      const registeredModuleSlugs = registeredModules.map((m) => m.slug);
      const workflowTemplatesExecution = workflowTemplates.rows.map(toTemplateExecutionMetric);
      const template7dTotals = new Map<string, { totalRuns: number; completedRuns: number; failedRuns: number }>();
      for (const row of workflowTemplateTrendByKey7d.rows) {
        const current = template7dTotals.get(row.template_key) ?? {
          totalRuns: 0,
          completedRuns: 0,
          failedRuns: 0,
        };
        current.totalRuns += parseInt(row.total_runs, 10);
        current.completedRuns += parseInt(row.completed_runs, 10);
        current.failedRuns += parseInt(row.failed_runs, 10);
        template7dTotals.set(row.template_key, current);
      }
      const templateTrendByKey = new Map<string, TrendDirection>();
      const trendRowsByKey = new Map<
        string,
        Array<{ totalRuns: number; completedRuns: number }>
      >();
      for (const row of workflowTemplateTrendByKey7d.rows) {
        const existing = trendRowsByKey.get(row.template_key) ?? [];
        existing.push({
          totalRuns: parseInt(row.total_runs, 10),
          completedRuns: parseInt(row.completed_runs, 10),
        });
        trendRowsByKey.set(row.template_key, existing);
      }
      for (const [templateKey, points] of trendRowsByKey.entries()) {
        if (points.length < 2) {
          templateTrendByKey.set(templateKey, 'unknown');
          continue;
        }
        const first = points[0];
        const last = points[points.length - 1];
        const firstSuccessRate =
          first.totalRuns > 0
            ? Number(((first.completedRuns / first.totalRuns) * 100).toFixed(2))
            : null;
        const lastSuccessRate =
          last.totalRuns > 0
            ? Number(((last.completedRuns / last.totalRuns) * 100).toFixed(2))
            : null;
        templateTrendByKey.set(templateKey, getTrendDirection(lastSuccessRate, firstSuccessRate));
      }
      const templateAlerts = Array.from(template7dTotals.entries())
        .map(([templateKey, totals]) => {
          const successRate =
            totals.totalRuns > 0
              ? Number(((totals.completedRuns / totals.totalRuns) * 100).toFixed(2))
              : 0;
          const gap = Number((alertThreshold - successRate).toFixed(2));
          const trendDirection = templateTrendByKey.get(templateKey) ?? 'unknown';
          const severity = adjustSeverityByTrend(deriveSeverityFromGap(gap), trendDirection);
          return {
            templateKey,
            periodDays: 7,
            totalRuns: totals.totalRuns,
            completedRuns: totals.completedRuns,
            failedRuns: totals.failedRuns,
            successRate,
            threshold: alertThreshold,
            gapToThreshold: gap > 0 ? gap : 0,
            trendDirection,
            severity,
            alert: successRate < alertThreshold,
          };
        })
        .filter((x) => x.alert)
        .sort((a, b) => {
          const rank = { high: 3, medium: 2, low: 1 };
          if (rank[a.severity] !== rank[b.severity]) return rank[b.severity] - rank[a.severity];
          return a.successRate - b.successRate;
        });
      const alertSeveritySummary = toAlertSeveritySummary(templateAlerts);
      const hasCriticalAlerts = templateAlerts.some((item) =>
        isCriticalTemplateAlert({
          successRate: item.successRate,
          threshold: item.threshold,
          gapToThreshold: item.gapToThreshold,
        })
      );
      const topFailingTemplates = Array.from(template7dTotals.entries())
        .map(([templateKey, totals]) => ({
          templateKey,
          totalRuns: totals.totalRuns,
          completedRuns: totals.completedRuns,
          failedRuns: totals.failedRuns,
          failureRate:
            totals.totalRuns > 0
              ? Number(((totals.failedRuns / totals.totalRuns) * 100).toFixed(2))
              : 0,
        }))
        .filter((item) => item.failedRuns > 0)
        .sort((a, b) => {
          if (b.failedRuns !== a.failedRuns) return b.failedRuns - a.failedRuns;
          if (b.failureRate !== a.failureRate) return b.failureRate - a.failureRate;
          return a.templateKey.localeCompare(b.templateKey);
        })
        .slice(0, 5);
      const trendByKeyTotals = new Map<string, { totalRuns: number; completedRuns: number; failedRuns: number }>();
      for (const row of workflowTemplateTrendByKey7d.rows) {
        const current = trendByKeyTotals.get(row.template_key) ?? {
          totalRuns: 0,
          completedRuns: 0,
          failedRuns: 0,
        };
        current.totalRuns += parseInt(row.total_runs, 10);
        current.completedRuns += parseInt(row.completed_runs, 10);
        current.failedRuns += parseInt(row.failed_runs, 10);
        trendByKeyTotals.set(row.template_key, current);
      }
      const totalsFromDailyTrend = workflowTemplateTrend7d.rows.reduce(
        (acc, row) => {
          acc.totalRuns += parseInt(row.total_runs, 10);
          acc.completedRuns += parseInt(row.completed_runs, 10);
          acc.failedRuns += parseInt(row.failed_runs, 10);
          return acc;
        },
        { totalRuns: 0, completedRuns: 0, failedRuns: 0 }
      );
      const totalsFromTrendByKey = Array.from(trendByKeyTotals.values()).reduce(
        (acc, row) => {
          acc.totalRuns += row.totalRuns;
          acc.completedRuns += row.completedRuns;
          acc.failedRuns += row.failedRuns;
          return acc;
        },
        { totalRuns: 0, completedRuns: 0, failedRuns: 0 }
      );
      const topFailingTemplatesConsistentWithTrend = topFailingTemplates.every((item) => {
        const trendTotals = trendByKeyTotals.get(item.templateKey);
        if (!trendTotals) return false;
        return (
          trendTotals.totalRuns === item.totalRuns &&
          trendTotals.completedRuns === item.completedRuns &&
          trendTotals.failedRuns === item.failedRuns
        );
      });
      const trendCoverageComplete = Array.from(template7dTotals.keys()).every((key) =>
        trendByKeyTotals.has(key)
      );
      const trendTotalsMatchByKey =
        workflowTemplateTrend7d.rows.length === 0 ||
        (
          totalsFromDailyTrend.totalRuns === totalsFromTrendByKey.totalRuns &&
          totalsFromDailyTrend.completedRuns === totalsFromTrendByKey.completedRuns &&
          totalsFromDailyTrend.failedRuns === totalsFromTrendByKey.failedRuns
        );
      const workflowTemplatesExecutionSummary = summarizeTemplateExecutions(workflowTemplatesExecution);
      const alertedRunsSummary = summarizeWorkflowAlertTotals(templateAlerts);
      const alertConsistency = deriveAlertConsistency(
        templateAlerts,
        template7dTotals.size,
        hasCriticalAlerts
      );
      const totalForgeBudgetAllocated = parseFloat(forgeBudgetBurn.rows[0]?.total_budget_allocated || '0');
      const totalForgeSpent = parseFloat(forgeBudgetBurn.rows[0]?.total_spent || '0');
      const budgetBurnPercent =
        totalForgeBudgetAllocated > 0
          ? Number(((totalForgeSpent / totalForgeBudgetAllocated) * 100).toFixed(2))
          : 0;
      const forgeRuns24hCount = parseInt(forgeRuns24h.rows[0]?.count || '0', 10);
      const topProviderRuns = parseInt(forgeTopProvider.rows[0]?.runs || '0', 10);
      const topProviderSharePercent =
        forgeRuns24hCount > 0
          ? Number(((topProviderRuns / forgeRuns24hCount) * 100).toFixed(2))
          : 0;

      return {
        users: {
          total: parseInt(users.rows[0].count, 10),
          active: parseInt(users.rows[0].active || '0', 10),
        },
        subscriptions: {
          total: parseInt(subscriptions.rows[0].count, 10),
          active: parseInt(subscriptions.rows[0].active || '0', 10),
        },
        payments: {
          total: parseInt(payments.rows[0].count, 10),
          totalRevenue: parseFloat(payments.rows[0].total_revenue),
        },
        tasks: {
          total: parseInt(tasks.rows[0].count, 10),
          failed: parseInt(tasks.rows[0].failed || '0', 10),
        },
        logs: {
          last24h: parseInt(logs.rows[0].count, 10),
        },
        workflowTemplatesExecution,
        workflowTemplatesExecutionSummary,
        workflowTemplatesExecutionTrend7d: workflowTemplateTrend7d.rows.map((r) => {
          const totalRuns = parseInt(r.total_runs, 10);
          const completedRuns = parseInt(r.completed_runs, 10);
          const failedRuns = parseInt(r.failed_runs, 10);
          return {
            date: r.run_date,
            totalRuns,
            completedRuns,
            failedRuns,
            successRate: totalRuns > 0 ? Number(((completedRuns / totalRuns) * 100).toFixed(2)) : 0,
          };
        }),
        workflowTemplatesExecutionTrendByKey7d: workflowTemplateTrendByKey7d.rows.map((r) => {
          const totalRuns = parseInt(r.total_runs, 10);
          const completedRuns = parseInt(r.completed_runs, 10);
          const failedRuns = parseInt(r.failed_runs, 10);
          return {
            templateKey: r.template_key,
            date: r.run_date,
            totalRuns,
            completedRuns,
            failedRuns,
            successRate: totalRuns > 0 ? Number(((completedRuns / totalRuns) * 100).toFixed(2)) : 0,
          };
        }),
        workflowTemplateAlerts: {
          contractVersion: MONITORING_CONTRACT_VERSION,
          threshold: alertThreshold,
          periodDays: 7,
          totalTemplatesEvaluated: template7dTotals.size,
          totalAlertedTemplates: templateAlerts.length,
          alertRate: alertConsistency.alertRate,
          ...alertSeveritySummary,
          hasCriticalAlerts,
          severity: {
            hasCriticalAlerts,
            counts: alertSeveritySummary,
          },
          totals: alertedRunsSummary,
          consistency: alertConsistency.checks,
          templates: templateAlerts,
        },
        workflowTemplateTopFailing: topFailingTemplates,
        workflowTemplateMetricsConsistency: {
          contractVersion: MONITORING_CONTRACT_VERSION,
          topFailingTemplatesConsistentWithTrend,
          trendCoverageComplete,
          trendTotalsMatchByKey,
        },
        atinaForgeKpis: {
          forgeRuns24h: forgeRuns24hCount,
          budgetBurn: {
            allocatedRsd: totalForgeBudgetAllocated,
            spentRsd: totalForgeSpent,
            remainingRsd: Number((totalForgeBudgetAllocated - totalForgeSpent).toFixed(2)),
            burnPercent: budgetBurnPercent,
          },
          topProvider: {
            provider: forgeTopProvider.rows[0]?.provider ?? null,
            runs: topProviderRuns,
            sharePercent: topProviderSharePercent,
          },
        },
        modules,
        registeredModuleSlugs,
        registeredModules: {
          slugs: registeredModuleSlugs,
          count: registeredModules.length,
        },
        monitoring: {
          contractVersion: MONITORING_CONTRACT_VERSION,
          generatedAt: new Date().toISOString(),
          checks: {
            workflowTemplateAlertConsistency: Object.values(alertConsistency.checks).every(Boolean),
            workflowTemplateTrendConsistency:
              topFailingTemplatesConsistentWithTrend &&
              trendCoverageComplete &&
              trendTotalsMatchByKey,
          },
        },
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
      };
  }

  async listUsers(query: AdminUsersListQueryDtoType) {
      const { page, limit, search, role, isActive } = query;
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (search) {
        conditions.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx})`);
        values.push(`%${search}%`);
        idx++;
      }
      if (role) { conditions.push(`u.role = $${idx++}`); values.push(role); }
      if (isActive !== undefined) { conditions.push(`u.is_active = $${idx++}`); values.push(isActive); }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const { rows: countRows } = await this.repo.countUsers(where, values);
      const { rows } = await this.repo.listUsers(where, values, limit, offset, idx);
      return { rows, total: parseInt(countRows[0].count, 10), page, limit };
  }

  async patchUser(id: string, body: { role?: string; isActive?: boolean; planId?: string | null }) {
      const { role, isActive, planId } = body;
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (role !== undefined) { fields.push(`role = $${idx++}`); values.push(role); }
      if (isActive !== undefined) { fields.push(`is_active = $${idx++}`); values.push(isActive); }
      if (planId !== undefined) { fields.push(`plan_id = $${idx++}`); values.push(planId); }

      if (!fields.length) return { data: null, message: 'No changes' };

      
      const { rows } = await this.repo.updateUser(fields.join(', '), [...values, id]);
      return { data: rows[0], message: 'User updated' };
  }

  async listPayments(query: AdminPaymentsListQueryDtoType) {
      const { page, limit, status, provider } = query;
      const offset = (page - 1) * limit;
      const conditions: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (status) { conditions.push(`p.status = $${idx++}`); values.push(status); }
      if (provider) { conditions.push(`p.provider = $${idx++}`); values.push(provider); }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const { rows: countRows } = await this.repo.countPayments(where, values);
      const { rows } = await this.repo.listPayments(where, values, limit, offset, idx);
      return { rows, total: parseInt(countRows[0].count, 10), page, limit };
  }

  async listModules() {
      const { rows } = await this.repo.listModules();
      return { data: rows };
  }

  async patchModule(id: string, body: { isActive?: boolean; config?: unknown }) {
      const { isActive, config } = body;
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (isActive !== undefined) { fields.push(`is_active = $${idx++}`); values.push(isActive); }
      if (config !== undefined) { fields.push(`config = $${idx++}`); values.push(JSON.stringify(config)); }

      if (!fields.length) return { data: null, message: 'No changes' };

      
      const { rows } = await this.repo.updateModule(fields.join(', '), [...values, id]);
      return { data: rows[0], message: 'Module updated' };
  }

  async getPhaseGating() {
      const currentPhase = await getCurrentPhase();
      const gating = getModulePhaseGatingStatus(currentPhase);
      const phaseOrder = getPhaseOrder();
      return {
        currentPhase,
        phaseOrder,
        requirements: getModulePhaseRequirements(),
        modules: gating,
        summary: summarizePhaseGating(gating, phaseOrder),
      };
  }

  async listPhaseGatingTimeline(query: StrictPaginationQuery) {
      const { page, limit } = query;
      const offset = (page - 1) * limit;

      const { rows: countRows } = await this.repo.countPhaseGatingTimeline();
      const { rows } = await this.repo.listPhaseGatingTimeline(limit, offset);

      return { rows, total: parseInt(countRows[0].count, 10), page, limit };
  }

  async getWorkflowTemplateExecutionStats(query: AdminWorkflowTemplateExecutionStatsQueryDtoType) {
      const { days, templateKey } = query;
      const daysNum = days;
      const normalizedTemplateKey =
        typeof templateKey === 'string' && templateKey.trim().length > 0
          ? templateKey.trim()
          : null;
      const templateFilterSql = normalizedTemplateKey
        ? `AND COALESCE(t.payload->>'templateKey', 'manual') = $2`
        : '';
      const baseParams = normalizedTemplateKey ? [daysNum, normalizedTemplateKey] : [daysNum];

      const { rows } = await this.repo.fetchWorkflowTemplateExecutionStats(daysNum, templateFilterSql, baseParams);
      const { rows: trendRows } = await this.repo.fetchWorkflowTemplateExecutionTrend(daysNum, templateFilterSql, baseParams);

      const templates = rows.map(toTemplateExecutionMetric);
      const summary = summarizeTemplateExecutions(templates);
      const alertThreshold = Math.max(
        1,
        Math.min(100, Math.floor(config.monitoring.workflowTemplateSuccessAlertThreshold))
      );
      const alerts = templates
        .map((item) => {
          const gap = Number((alertThreshold - item.successRate).toFixed(2));
          const trend = trendRows.filter((r) => r.template_key === item.templateKey);
          const currentRow = trend.find((r) => r.period_bucket === 'current');
          const previousRow = trend.find((r) => r.period_bucket === 'previous');
          const currentSuccessRate =
            currentRow && parseInt(currentRow.total_runs, 10) > 0
              ? Number(
                  (
                    (parseInt(currentRow.completed_runs, 10) /
                      parseInt(currentRow.total_runs, 10)) *
                    100
                  ).toFixed(2)
                )
              : null;
          const previousSuccessRate =
            previousRow && parseInt(previousRow.total_runs, 10) > 0
              ? Number(
                  (
                    (parseInt(previousRow.completed_runs, 10) /
                      parseInt(previousRow.total_runs, 10)) *
                    100
                  ).toFixed(2)
                )
              : null;
          const trendDirection = getTrendDirection(currentSuccessRate, previousSuccessRate);
          const severity = adjustSeverityByTrend(deriveSeverityFromGap(gap), trendDirection);
          return {
            templateKey: item.templateKey,
            periodDays: daysNum,
            totalRuns: item.totalRuns,
            completedRuns: item.completedRuns,
            failedRuns: item.failedRuns,
            successRate: item.successRate,
            threshold: alertThreshold,
            gapToThreshold: gap > 0 ? gap : 0,
            trendDirection,
            severity,
            alert: item.successRate < alertThreshold,
          };
        })
        .filter((x) => x.alert)
        .sort((a, b) => a.successRate - b.successRate);
      const alertSeveritySummary = toAlertSeveritySummary(alerts);
      const hasCriticalAlerts = alerts.some((item) =>
        isCriticalTemplateAlert({
          successRate: item.successRate,
          threshold: item.threshold,
          gapToThreshold: item.gapToThreshold,
        })
      );
      const alertConsistency = deriveAlertConsistency(alerts, templates.length, hasCriticalAlerts);

      return {
        days: daysNum,
        ...(normalizedTemplateKey ? { templateKey: normalizedTemplateKey } : {}),
        templates,
        summary,
        alerts: {
          contractVersion: MONITORING_CONTRACT_VERSION,
          threshold: alertThreshold,
          periodDays: daysNum,
          totalTemplatesEvaluated: templates.length,
          totalAlertedTemplates: alerts.length,
          alertRate: alertConsistency.alertRate,
          ...alertSeveritySummary,
          hasCriticalAlerts,
          severity: {
            hasCriticalAlerts,
            counts: alertSeveritySummary,
          },
          totals: alertConsistency.totals,
          consistency: alertConsistency.checks,
          templates: alerts,
        },
        monitoring: {
          contractVersion: MONITORING_CONTRACT_VERSION,
          generatedAt: new Date().toISOString(),
          checks: {
            workflowTemplateAlertConsistency: Object.values(alertConsistency.checks).every(Boolean),
          },
        },
      };
  }

  async listLogs(query: AdminLogsListQueryDtoType) {
      const { page, limit, level, category } = query;
      const offset = (page - 1) * limit;
      const conditions: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (level) { conditions.push(`level = $${idx++}`); values.push(level); }
      if (category) { conditions.push(`category = $${idx++}`); values.push(category); }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const { rows: countRows } = await this.repo.countLogs(where, values);
      const { rows } = await this.repo.listLogs(where, values, limit, offset, idx);
      return { rows, total: parseInt(countRows[0].count, 10), page, limit };
  }

  async createLog(userId: string, body: { level: string; category: string; message: string; context?: Record<string, unknown> }) {
      const { level, category, message, context } = body;
      const { rows } = await this.repo.insertLog(userId, level, category, message, JSON.stringify(context));
      logger.log(level, message, { category, ...context });
      return { data: rows[0], message: 'Log written' };
  }

  async listPlans() {
      const { rows } = await this.repo.listPlans();
      return { data: rows };
  }

  async patchPlan(id: string, body: Record<string, unknown>) {
      const d = body;
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      const allowed = ['name', 'description', 'price_monthly', 'price_yearly', 'is_active', 'is_popular', 'features', 'limits', 'sort_order'];
      for (const key of allowed) {
        if (d[key] !== undefined) {
          fields.push(`${key} = $${idx++}`);
          values.push(typeof d[key] === 'object' ? JSON.stringify(d[key]) : d[key]);
        }
      }

      if (!fields.length) return { data: null, message: 'No changes' };

      
      const { rows } = await this.repo.updatePlan(fields.join(', '), [...values, id]);
      return { data: rows[0], message: 'Plan updated' };
  }

  async getHealth() {
      const dbStart = Date.now();
      let dbOk = false;
      try {
        await this.repo.pingDatabase();
        dbOk = true;
      } catch { /* */ }

      let forge = {
        vaultPath: null as string | null,
        vaultSignal: 'unavailable' as 'available' | 'unavailable',
        lastForgeEventAgeMs: null as number | null,
        lastForgeEventFresh: null as boolean | null,
      };
      try {
        const probed = await moduleRegistry.runHealthProbe('forge');
        if (probed) {
          forge = {
            vaultPath: (probed.vaultPath as string | null) ?? null,
            vaultSignal: (probed.vaultSignal as 'available' | 'unavailable') ?? 'unavailable',
            lastForgeEventAgeMs: (probed.lastForgeEventAgeMs as number | null) ?? null,
            lastForgeEventFresh: (probed.lastForgeEventFresh as boolean | null) ?? null,
          };
        }
      } catch {
        // Keep admin health resilient even if forge diagnostics fail unexpectedly.
      }

      return {
        contractVersion: MONITORING_CONTRACT_VERSION,
        status: dbOk ? 'healthy' : 'degraded',
        database: { ok: dbOk, latencyMs: Date.now() - dbStart },
        forge,
        checks: {
          databaseReachable: dbOk,
          forgeVaultReachable: forge.vaultSignal === 'available',
          forgeEventsFresh: forge.lastForgeEventFresh === true,
        },
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      };
  }

  async listOnboardingStatus(query: AdminOnboardingStatusListQueryDtoType) {
      const { page: pageNum, limit: limitNum, status, actorUserId, targetUserId, from, to, sort, eventType } = query;
      const offset = (pageNum - 1) * limitNum;
      const statusFilter = String(status || 'all');
      const onboardingEventTypesAll = `(
               'auth_register_bootstrap','auth_first_login_bootstrap',
               'auth_register_bootstrap_failed','auth_first_login_bootstrap_failed',
               'admin_onboarding_bootstrap_retry_all_strict_blocked',
               'admin_onboarding_bootstrap_retry','admin_onboarding_bootstrap_retry_failed',
               'admin_onboarding_bootstrap_retry_all_user'
             )`;
      const statusClause =
        statusFilter === 'failed'
          ? `AND ae.event_type IN ('auth_register_bootstrap_failed','auth_first_login_bootstrap_failed')`
          : statusFilter === 'success'
            ? `AND ae.event_type IN ('auth_register_bootstrap','auth_first_login_bootstrap')`
            : statusFilter === 'strict'
              ? `AND ae.event_type = 'admin_onboarding_bootstrap_retry_all_strict_blocked'`
              : statusFilter === 'admin'
                ? `AND ae.event_type IN (
                     'admin_onboarding_bootstrap_retry',
                     'admin_onboarding_bootstrap_retry_failed',
                     'admin_onboarding_bootstrap_retry_all_user',
                     'admin_onboarding_bootstrap_retry_all_strict_blocked'
                   )`
                : '';
      const metaStatus =
        statusFilter === 'failed' ||
        statusFilter === 'success' ||
        statusFilter === 'strict' ||
        statusFilter === 'admin'
          ? statusFilter
          : 'all';

      const warnings: string[] = [];
      const actorId =
        typeof actorUserId === 'string' && UUID_PARAM_RE.test(actorUserId.trim())
          ? actorUserId.trim()
          : null;
      if (typeof actorUserId === 'string' && actorUserId.trim() && !actorId) {
        warnings.push('actorUserId is invalid UUID and was ignored.');
      }
      const targetId =
        typeof targetUserId === 'string' && UUID_PARAM_RE.test(targetUserId.trim())
          ? targetUserId.trim()
          : null;
      if (typeof targetUserId === 'string' && targetUserId.trim() && !targetId) {
        warnings.push('targetUserId is invalid UUID and was ignored.');
      }
      const { fromIso, toIso, warnings: dateWarnings } = parseOnboardingDateRange(from, to);
      warnings.push(...dateWarnings);
      const sortOrder = parseCreatedAtSort(sort);
      if (sortOrder.warning) {
        warnings.push(sortOrder.warning);
      }
      const rawEventType = typeof eventType === 'string' ? eventType.trim() : '';
      let eventTypeExact: string | null = null;
      if (rawEventType) {
        if (ONBOARDING_FEED_EVENT_TYPES.has(rawEventType)) {
          eventTypeExact = rawEventType;
        } else {
          warnings.push('eventType is invalid and was ignored.');
        }
      }
      if (eventTypeExact && statusFilter !== 'all') {
        warnings.push('status filter ignored because eventType is set.');
      }
      const filterParams: unknown[] = [];
      let feedFilterClause = '';
      if (actorId) {
        filterParams.push(actorId);
        feedFilterClause += ` AND ae.actor_user_id = $${filterParams.length}::uuid`;
      }
      if (targetId) {
        filterParams.push(targetId);
        feedFilterClause += ` AND ae.entity_type = 'user' AND ae.entity_id = $${filterParams.length}`;
      }
      if (fromIso) {
        filterParams.push(fromIso);
        feedFilterClause += ` AND ae.created_at >= $${filterParams.length}::timestamptz`;
      }
      if (toIso) {
        filterParams.push(toIso);
        feedFilterClause += ` AND ae.created_at <= $${filterParams.length}::timestamptz`;
      }
      const feedTypeWhere = eventTypeExact
        ? (() => {
            filterParams.push(eventTypeExact);
            return `WHERE ae.event_type = $${filterParams.length}`;
          })()
        : `WHERE ae.event_type IN ${onboardingEventTypesAll} ${statusClause}`;
      const limitParam = filterParams.length + 1;
      const offsetParam = filterParams.length + 2;
      const hasFeedFilters =
        Boolean(feedFilterClause) ||
        Boolean(eventTypeExact) ||
        (!eventTypeExact && Boolean(statusClause));

      const filteredSummarySql = `SELECT
             COUNT(*) AS total,
             COUNT(*) FILTER (
               WHERE ae.event_type IN ('auth_register_bootstrap','auth_first_login_bootstrap')
             ) AS success,
             COUNT(*) FILTER (
               WHERE ae.event_type IN ('auth_register_bootstrap_failed','auth_first_login_bootstrap_failed')
             ) AS failed,
             COALESCE(SUM(CASE
               WHEN ae.event_type IN ('auth_register_bootstrap','auth_first_login_bootstrap')
               THEN COALESCE((ae.payload->'totals'->>'blocked')::int, 0)
               ELSE 0 END), 0) AS blocked,
             COALESCE(SUM(CASE
               WHEN ae.event_type IN ('auth_register_bootstrap','auth_first_login_bootstrap')
               THEN COALESCE((ae.payload->'totals'->>'created')::int, 0)
               ELSE 0 END), 0) AS created,
             COALESCE(SUM(CASE
               WHEN ae.event_type IN ('auth_register_bootstrap','auth_first_login_bootstrap')
               THEN COALESCE((ae.payload->'totals'->>'updated')::int, 0)
               ELSE 0 END), 0) AS updated,
             COALESCE(SUM(CASE
               WHEN ae.event_type IN ('auth_register_bootstrap','auth_first_login_bootstrap')
               THEN COALESCE((ae.payload->'totals'->>'skipped')::int, 0)
               ELSE 0 END), 0) AS skipped,
             COUNT(*) FILTER (
               WHERE ae.event_type = 'admin_onboarding_bootstrap_retry_all_strict_blocked'
             ) AS strict_blocked_admin,
             COUNT(*) FILTER (
               WHERE ae.event_type = 'admin_onboarding_bootstrap_retry'
             ) AS admin_retry,
             COUNT(*) FILTER (
               WHERE ae.event_type = 'admin_onboarding_bootstrap_retry_failed'
             ) AS admin_retry_failed,
             COUNT(*) FILTER (
               WHERE ae.event_type = 'admin_onboarding_bootstrap_retry_all_user'
             ) AS admin_retry_all_user
           FROM audit_events ae
           ${feedTypeWhere}
           ${feedFilterClause}`;

      type OnboardingSummaryRow = {
        total: string;
        success: string;
        failed: string;
        blocked: string;
        created: string;
        updated: string;
        skipped: string;
        strict_blocked_admin: string;
        admin_retry: string;
        admin_retry_failed: string;
        admin_retry_all_user: string;
      };

      const [summary, filteredSummary, countRows, rows] = await Promise.all([
        this.repo.fetchOnboardingGlobalSummary(),
        hasFeedFilters
          ? this.repo.fetchOnboardingFilteredSummary(filteredSummarySql, filterParams)
          : Promise.resolve({ rows: [] as OnboardingSummaryRow[] }),
        this.repo.countOnboardingFeed(feedTypeWhere, feedFilterClause, filterParams),
        this.repo.listOnboardingFeed(
          feedTypeWhere,
          feedFilterClause,
          sortOrder.sql,
          filterParams,
          limitNum,
          offset,
          limitParam,
          offsetParam
        ),
      ]);

      const mapOnboardingSummary = (row: OnboardingSummaryRow | undefined) => ({
        totalEvents: parseInt(row?.total || '0', 10),
        successEvents: parseInt(row?.success || '0', 10),
        failedEvents: parseInt(row?.failed || '0', 10),
        templatesCreated: parseInt(row?.created || '0', 10),
        templatesUpdated: parseInt(row?.updated || '0', 10),
        templatesSkipped: parseInt(row?.skipped || '0', 10),
        templatesBlocked: parseInt(row?.blocked || '0', 10),
        strictBlockedAdminEvents: parseInt(row?.strict_blocked_admin || '0', 10),
        adminBootstrapRetryEvents: parseInt(row?.admin_retry || '0', 10),
        adminBootstrapRetryFailedEvents: parseInt(row?.admin_retry_failed || '0', 10),
        adminBootstrapRetryAllUserEvents: parseInt(row?.admin_retry_all_user || '0', 10),
      });

      const globalFeedTotal = parseInt(countRows.rows[0]?.count || '0', 10);

      return {
        meta: {
          status: metaStatus,
          sort: sortOrder.label,
          ...(eventTypeExact ? { eventType: eventTypeExact } : {}),
          ...(actorId ? { actorUserId: actorId } : {}),
          ...(targetId ? { targetUserId: targetId } : {}),
          ...(fromIso ? { from: fromIso } : {}),
          ...(toIso ? { to: toIso } : {}),
          ...(warnings.length > 0 ? { warnings } : {}),
        },
        summary: mapOnboardingSummary(summary.rows[0]),
        ...(hasFeedFilters
          ? { filteredSummary: mapOnboardingSummary(filteredSummary.rows[0]) }
          : {}),
        events: rows.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: globalFeedTotal,
          totalPages: totalPagesFromCount(globalFeedTotal, limitNum),
        },
      };
  }

  async getOnboardingUserDetail(userId: string, query: AdminOnboardingUserDetailQueryDtoType) {
      
      const {
        page: pageNum,
        limit: limitNum,
        includeAdminActions,
        adminPage,
        adminLimit,
        from,
        to,
        sort,
      } = query;
      const offset = (pageNum - 1) * limitNum;
      const { fromIso, toIso, warnings: userDateWarnings } = parseOnboardingDateRange(from, to);
      const warnings = [...userDateWarnings];
      const sortOrder = parseCreatedAtSort(sort);
      if (sortOrder.warning) {
        warnings.push(sortOrder.warning);
      }
      const eventParams: unknown[] = [userId];
      let userTimeClause = '';
      if (fromIso) {
        eventParams.push(fromIso);
        userTimeClause += ` AND created_at >= $${eventParams.length}::timestamptz`;
      }
      if (toIso) {
        eventParams.push(toIso);
        userTimeClause += ` AND created_at <= $${eventParams.length}::timestamptz`;
      }
      const adminTimeClauseAe = userTimeClause.replace(/created_at/g, 'ae.created_at');
      const listLimitParam = eventParams.length + 1;
      const listOffsetParam = eventParams.length + 2;
      const withAdminAudit = includeAdminActions === true;
      const adminLimitNum = Math.min(
        Math.max(Number(adminLimit ?? limitNum) || 20, 1),
        100
      );
      const adminPageNum = Math.max(Number(adminPage ?? pageNum) || 1, 1);
      const adminOffset = (adminPageNum - 1) * adminLimitNum;

      const [userRows, summary, countRows, rows] = await Promise.all([
        this.repo.fetchUserById(userId),
        this.repo.fetchOnboardingUserSummary(userTimeClause, eventParams),
        this.repo.countOnboardingUserEvents(userTimeClause, eventParams),
        this.repo.listOnboardingUserEvents(
          userTimeClause,
          sortOrder.sql,
          eventParams,
          limitNum,
          offset,
          listLimitParam,
          listOffsetParam
        ),
      ]);

      let adminActions: unknown[] = [];
      let adminPagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      } | null = null;
      let adminActionsSummary: {
        retry: number;
        retryFailed: number;
        retryAllUser: number;
      } | null = null;
      if (withAdminAudit) {
        const adminListLimitParam = eventParams.length + 1;
        const adminListOffsetParam = eventParams.length + 2;
        const [{ rows: adminCountRows }, { rows: adminRows }, { rows: adminSummaryRows }] = await Promise.all([
          this.repo.countOnboardingAdminActions(userTimeClause, eventParams),
          this.repo.listOnboardingAdminActions(
            adminTimeClauseAe,
            sortOrder.sql,
            eventParams,
            adminLimitNum,
            adminOffset,
            adminListLimitParam,
            adminListOffsetParam
          ),
          this.repo.fetchOnboardingAdminActionsSummary(userTimeClause, eventParams),
        ]);
        adminActions = adminRows;
        {
          const adminTotal = parseInt(adminCountRows[0]?.count || '0', 10);
          adminPagination = {
            page: adminPageNum,
            limit: adminLimitNum,
            total: adminTotal,
            totalPages: totalPagesFromCount(adminTotal, adminLimitNum),
          };
        }
        adminActionsSummary = {
          retry: parseInt(adminSummaryRows[0]?.retry || '0', 10),
          retryFailed: parseInt(adminSummaryRows[0]?.retry_failed || '0', 10),
          retryAllUser: parseInt(adminSummaryRows[0]?.retry_all_user || '0', 10),
        };
      }

      const userFeedTotal = parseInt(countRows.rows[0]?.count || '0', 10);

      return {
        meta: {
          sort: sortOrder.label,
          ...(fromIso ? { from: fromIso } : {}),
          ...(toIso ? { to: toIso } : {}),
          ...(warnings.length > 0 ? { warnings } : {}),
        },
        user: userRows.rows[0] ?? null,
        summary: {
          totalEvents: parseInt(summary.rows[0]?.total || '0', 10),
          successEvents: parseInt(summary.rows[0]?.success || '0', 10),
          failedEvents: parseInt(summary.rows[0]?.failed || '0', 10),
          templatesCreated: parseInt(summary.rows[0]?.created || '0', 10),
          templatesUpdated: parseInt(summary.rows[0]?.updated || '0', 10),
          templatesSkipped: parseInt(summary.rows[0]?.skipped || '0', 10),
          templatesBlocked: parseInt(summary.rows[0]?.blocked || '0', 10),
        },
        events: rows.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: userFeedTotal,
          totalPages: totalPagesFromCount(userFeedTotal, limitNum),
        },
        includeAdminActions: withAdminAudit,
        ...(withAdminAudit
          ? { adminActions, adminPagination, adminActionsSummary }
          : {}),
      };
  }

  async retryOnboardingUser(actorUserId: string, userId: string, body: { overwrite?: boolean; namePrefix?: string }) {
      
      const overwrite = Boolean(body.overwrite ?? false);
      let namePrefix: string | undefined =
        typeof body.namePrefix === 'string' ? body.namePrefix : undefined;
      const retryWarnings: string[] = [];
      if (namePrefix !== undefined && namePrefix.length > ONBOARDING_NAME_PREFIX_MAX) {
        namePrefix = namePrefix.slice(0, ONBOARDING_NAME_PREFIX_MAX);
        retryWarnings.push(
          `namePrefix was truncated to ${ONBOARDING_NAME_PREFIX_MAX} characters.`
        );
      }

      const { rows: userRows } = await this.repo.fetchUserBasicById(userId);
      if (!userRows[0]) {
        return { data: null, message: 'User not found' };
      }

      try {
        const report = await this.workflowChainService.bootstrapTemplates(userId, overwrite, namePrefix);
        await this.repo.insertAuditEvent(
          actorUserId,
          'admin_onboarding_bootstrap_retry',
          'user',
          userId,
          'info',
          JSON.stringify({ targetUserId: userId, overwrite, namePrefix: namePrefix ?? null, report })
        );
        return {
          data: {
            targetUser: userRows[0],
            overwrite,
            namePrefix: namePrefix ?? null,
            report,
            ...(retryWarnings.length > 0 ? { warnings: retryWarnings } : {}),
          },
          message: 'Onboarding bootstrap retried',
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown retry error';
        await this.repo.insertAuditEvent(
          actorUserId,
          'admin_onboarding_bootstrap_retry_failed',
          'user',
          userId,
          'error',
          JSON.stringify({ targetUserId: userId, overwrite, namePrefix: namePrefix ?? null, error: message })
        );
        throw error;
      }
  }

  async retryAllOnboarding(actorUserId: string, body: Record<string, unknown>) {
      const statusRaw = String(body.status ?? 'failed');
      const status = statusRaw === 'blocked' || statusRaw === 'all' ? statusRaw : 'failed';
      const limit = Math.min(Math.max(Number(body.limit ?? 25), 1), 200);
      const overwrite = Boolean(body.overwrite ?? false);
      const dryRun = Boolean(body.dryRun ?? false);
      const sortBy = String(body.sortBy ?? 'recent') === 'oldest' ? 'oldest' : 'recent';
      const dedupeBy = String(body.dedupeBy ?? 'latest') === 'all' ? 'all' : 'latest';
      const minPriorityScore = Math.min(Math.max(Number(body.minPriorityScore ?? 1), 1), 3);
      const maxUsersPerRun = Math.min(Math.max(Number(body.maxUsersPerRun ?? 25), 1), 200);
      const cooldownHours = Math.min(Math.max(Number(body.cooldownHours ?? 0), 0), 720);
      const stopOnFirstError = Boolean(body.stopOnFirstError ?? false);
      const maxFailures = Math.min(Math.max(Number(body.maxFailures ?? 0), 0), 200);
      const maxDurationMs = Math.min(Math.max(Number(body.maxDurationMs ?? 0), 0), 15 * 60 * 1000);
      const strict = Boolean(body.strict ?? false);
      const warnings: string[] = [];
      let namePrefix: string | undefined =
        typeof body.namePrefix === 'string' ? body.namePrefix : undefined;
      if (namePrefix !== undefined && namePrefix.length > ONBOARDING_NAME_PREFIX_MAX) {
        namePrefix = namePrefix.slice(0, ONBOARDING_NAME_PREFIX_MAX);
        warnings.push(
          `namePrefix was truncated to ${ONBOARDING_NAME_PREFIX_MAX} characters.`
        );
      }
      let idempotencyKey =
        typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : '';
      if (idempotencyKey.length > RETRY_ALL_IDEMPOTENCY_KEY_MAX) {
        idempotencyKey = idempotencyKey.slice(0, RETRY_ALL_IDEMPOTENCY_KEY_MAX);
        warnings.push(
          `idempotencyKey was truncated to ${RETRY_ALL_IDEMPOTENCY_KEY_MAX} characters.`
        );
      }
      let resumeFromUserId: string | null = null;
      if (typeof body.resumeFromUserId === 'string' && body.resumeFromUserId.trim()) {
        const r = body.resumeFromUserId.trim();
        if (UUID_PARAM_RE.test(r)) {
          resumeFromUserId = r;
        } else {
          warnings.push('resumeFromUserId is invalid UUID and was ignored.');
        }
      }
      let includeUserIds: string[] | null = null;
      if (Array.isArray(body.includeUserIds)) {
        const raw = body.includeUserIds.map((v: unknown) => String(v)).filter(Boolean);
        const valid = raw
          .filter((id: string) => UUID_PARAM_RE.test(id.trim()))
          .map((id: string) => id.trim());
        const dropped = raw.length - valid.length;
        if (dropped > 0) {
          warnings.push(`includeUserIds: ${dropped} invalid user id(s) ignored.`);
        }
        if (raw.length === 0) {
          includeUserIds = null;
        } else {
          includeUserIds = Array.from(new Set(valid));
          if (includeUserIds.length === 0) {
            warnings.push('includeUserIds contained no valid UUIDs; no users will match.');
          }
        }
      }
      let excludeUserIds: string[] = [];
      if (Array.isArray(body.excludeUserIds)) {
        const raw = body.excludeUserIds.map((v: unknown) => String(v)).filter(Boolean);
        const valid = raw
          .filter((id: string) => UUID_PARAM_RE.test(id.trim()))
          .map((id: string) => id.trim());
        const dropped = raw.length - valid.length;
        if (dropped > 0) {
          warnings.push(`excludeUserIds: ${dropped} invalid user id(s) ignored.`);
        }
        excludeUserIds = Array.from(new Set(valid));
      }
      if (stopOnFirstError && maxFailures > 0) {
        warnings.push('stopOnFirstError=true takes precedence; maxFailures may never be reached.');
      }
      if (dryRun && (stopOnFirstError || maxFailures > 0 || maxDurationMs > 0)) {
        warnings.push('dryRun=true: runtime stop guards are evaluated but no bootstrap execution occurs.');
      }
      if (includeUserIds && includeUserIds.length > 0) {
        const overlap = includeUserIds.filter((id: string) => excludeUserIds.includes(id));
        if (overlap.length > 0) {
          warnings.push(`includeUserIds/excludeUserIds overlap detected for ${overlap.length} user(s). Exclude wins.`);
        }
      }
      if (resumeFromUserId && includeUserIds && includeUserIds.length > 0 && !includeUserIds.includes(resumeFromUserId)) {
        warnings.push('resumeFromUserId is not present in includeUserIds; resume may not apply.');
      }
      if (strict && warnings.length > 0) {
        await this.repo.insertAuditEvent(
          actorUserId,
          'admin_onboarding_bootstrap_retry_all_strict_blocked',
          'system',
          'onboarding',
          'warning',
          JSON.stringify({
            strict: true,
            blocked: true,
            idempotencyKey: idempotencyKey || null,
            warnings,
          })
        );
        return {
          data: { strict, blocked: true, warnings },
          message: 'Retry-all blocked by strict mode',
        };
      }

      if (idempotencyKey) {
        const { rows: existingRuns } = await this.repo.findRetryAllByIdempotencyKey(actorUserId, idempotencyKey);
        if (existingRuns[0]) {
          return {
            data: {
              idempotencyKey,
              reused: true,
              previousRun: {
                eventId: existingRuns[0].id,
                createdAt: existingRuns[0].created_at,
                payload: existingRuns[0].payload,
              },
            },
            message: 'Duplicate retry-all request skipped (idempotency hit)',
          };
        }
      }

      const statusClause =
        status === 'blocked'
          ? `ae.event_type IN ('auth_register_bootstrap','auth_first_login_bootstrap')`
          : status === 'all'
            ? `ae.event_type IN ('auth_register_bootstrap','auth_first_login_bootstrap','auth_register_bootstrap_failed','auth_first_login_bootstrap_failed')`
            : `ae.event_type IN ('auth_register_bootstrap_failed','auth_first_login_bootstrap_failed')`;

      const orderBy = sortBy === 'oldest' ? 'ASC' : 'DESC';
      const { rows: candidateRows } = await this.repo.fetchRetryAllCandidates(
        statusClause,
        orderBy,
        limit,
        minPriorityScore
      );

      const selectedEvents =
        dedupeBy === 'all'
          ? candidateRows
          : Array.from(
              new Map(candidateRows.map((r) => [String(r.actor_user_id), r])).values()
            );
      const selectedByInclude =
        includeUserIds === null
          ? selectedEvents
          : selectedEvents.filter((r) => includeUserIds.includes(String(r.actor_user_id)));
      const selectedByExclude = selectedByInclude.filter((r) => !excludeUserIds.includes(String(r.actor_user_id)));
      const uniqueUserIds = Array.from(new Set(selectedByExclude.map((r) => String(r.actor_user_id))));
      const cooldownCutoffIso =
        cooldownHours > 0 ? new Date(Date.now() - cooldownHours * 60 * 60 * 1000).toISOString() : null;
      const cooldownChecks = await Promise.all(
        uniqueUserIds.map(async (targetUserId) => {
          const { rows } = await this.repo.fetchLastOnboardingRetryAt(targetUserId);
          const lastRetryAt = rows[0]?.last_retry_at ?? null;
          const blocked =
            cooldownCutoffIso !== null && lastRetryAt !== null
              ? new Date(lastRetryAt).toISOString() > cooldownCutoffIso
              : false;
          return { userId: targetUserId, lastRetryAt, blocked };
        })
      );
      const skippedByCooldown = cooldownChecks
        .filter((c) => c.blocked)
        .map((c) => ({ userId: c.userId, lastRetryAt: c.lastRetryAt }));
      const baseEligibleUserIds = cooldownChecks
        .filter((c) => !c.blocked)
        .map((c) => c.userId);
      const resumeFound = resumeFromUserId ? baseEligibleUserIds.includes(resumeFromUserId) : false;
      const resumedEligibleUserIds =
        resumeFromUserId && resumeFound
          ? baseEligibleUserIds.slice(baseEligibleUserIds.indexOf(resumeFromUserId))
          : baseEligibleUserIds;
      const resumeApplied = Boolean(resumeFromUserId && resumeFound);
      const eligibleUserIds = resumedEligibleUserIds
        .slice(0, maxUsersPerRun);
      const retried: Array<Record<string, unknown>> = [];
      const failed: Array<Record<string, unknown>> = [];
      let stoppedEarly = false;
      let stopReason: string | null = null;
      const startedAtMs = Date.now();

      if (!dryRun) {
        for (const targetUserId of eligibleUserIds) {
          if (maxDurationMs > 0 && Date.now() - startedAtMs >= maxDurationMs) {
            stoppedEarly = true;
            stopReason = `Stopped after reaching maxDurationMs=${maxDurationMs}`;
            break;
          }
          try {
            const report = await this.workflowChainService.bootstrapTemplates(targetUserId, overwrite, namePrefix);
            retried.push({
              userId: targetUserId,
              totals: report.totals,
            });
            await this.repo.insertAuditEvent(
              actorUserId,
              'admin_onboarding_bootstrap_retry_all_user',
              'user',
              targetUserId,
              'info',
              JSON.stringify({
                targetUserId,
                overwrite,
                namePrefix: namePrefix ?? null,
                reportTotals: report.totals,
              })
            );
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'unknown';
            failed.push({
              userId: targetUserId,
              error: errorMessage,
            });
            await this.repo.insertAuditEvent(
              actorUserId,
              'admin_onboarding_bootstrap_retry_all_user',
              'user',
              targetUserId,
              'error',
              JSON.stringify({
                targetUserId,
                overwrite,
                namePrefix: namePrefix ?? null,
                error: errorMessage,
              })
            );
            if (stopOnFirstError) {
              stoppedEarly = true;
              stopReason = `Stopped after first error on user ${targetUserId}: ${errorMessage}`;
              break;
            }
            if (maxFailures > 0 && failed.length >= maxFailures) {
              stoppedEarly = true;
              stopReason = `Stopped after reaching maxFailures=${maxFailures}`;
              break;
            }
          }
        }
      }

      await this.repo.insertAuditEvent(
        actorUserId,
        'admin_onboarding_bootstrap_retry_all',
        'system',
        'onboarding',
        failed.length > 0 ? 'warning' : 'info',
        JSON.stringify({
            status,
            idempotencyKey: idempotencyKey || null,
            limit,
            overwrite,
            dryRun,
            sortBy,
            dedupeBy,
            minPriorityScore,
            maxUsersPerRun,
            cooldownHours,
            stopOnFirstError,
            maxFailures,
            maxDurationMs,
            strict,
            resumeFromUserId,
            resumeFound,
            resumeApplied,
            includeUserIds,
            excludeUserIds,
            warnings,
            namePrefix: namePrefix ?? null,
            attemptedUsers: eligibleUserIds.length,
            elapsedMs: Date.now() - startedAtMs,
            stoppedEarly,
            stopReason,
            skippedByCooldown,
            selectedEvents: selectedByExclude.map((e) => ({
              eventId: e.event_id,
              userId: e.actor_user_id,
              createdAt: e.created_at,
              eventType: e.event_type,
              priorityScore: e.priority_score,
            })),
            retried,
            failed,
          })
      );

      return {
        data: {
          filter: {
            status,
            idempotencyKey: idempotencyKey || null,
            limit,
            overwrite,
            dryRun,
            sortBy,
            dedupeBy,
            minPriorityScore,
            maxUsersPerRun,
            cooldownHours,
            stopOnFirstError,
            maxFailures,
            maxDurationMs,
            strict,
            resumeFromUserId,
            resumeFound,
            resumeApplied,
            includeUserIds,
            excludeUserIds,
            warnings,
            namePrefix: namePrefix ?? null,
          },
          attemptedUsers: eligibleUserIds.length,
          warnings,
          elapsedMs: Date.now() - startedAtMs,
          stoppedEarly,
          stopReason,
          skippedByCooldown,
          selectedEvents: selectedByExclude.map((e) => ({
            eventId: e.event_id,
            userId: e.actor_user_id,
            createdAt: e.created_at,
            eventType: e.event_type,
            priorityScore: e.priority_score,
          })),
          candidateUserIds: uniqueUserIds,
          eligibleUserIds,
          retried,
          failed,
        },
        message: dryRun ? 'Batch onboarding retry dry-run completed' : 'Batch onboarding retry completed',
      };
  }

}
