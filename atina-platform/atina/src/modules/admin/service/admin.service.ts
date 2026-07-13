import { moduleRegistry } from '../../../core/ModuleRegistry';
import { config } from '../../../config';
import logger from '../../../utils/logger';
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
import { AdminRepository } from '../repository/admin.repository';
import { AdminOnboardingService } from './admin-onboarding.service';
import { AuthService } from '../../auth/service/auth.service';
import { createWorkflowChainAuthBootstrapAdapter } from '../../auth/service/workflow-chain-auth-bootstrap.adapter';
import { generateInvitePassword } from '../lib/invite-password';
import { ValidationError } from '../../../utils/errors';
import { buildFactoryPhaseStatus } from '../../billing/lib/factory-phase-modules';
import { getFactoryRuntimeSnapshot } from '../../billing/lib/factory-phase-runtime';
import type { AdminInviteUserBodyDtoType } from '../dto/admin.dto';

export class AdminService {
  private readonly repo = new AdminRepository();
  private readonly workflowChainService: WorkflowChainService;
  private readonly onboarding: AdminOnboardingService;

  constructor(workflowChainService?: WorkflowChainService) {
    this.workflowChainService = workflowChainService ?? new WorkflowChainService();
    this.onboarding = new AdminOnboardingService(this.workflowChainService);
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
        factory: {
          ...buildFactoryPhaseStatus(),
          runtime: getFactoryRuntimeSnapshot(),
        },
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

  async inviteUser(actorUserId: string, body: AdminInviteUserBodyDtoType) {
    const generatedPassword = !body.password;
    const password = body.password ?? generateInvitePassword();

    const authService = new AuthService({
      postLoginBootstrap: createWorkflowChainAuthBootstrapAdapter(),
    });

    const registered = await authService.register({
      name: body.name,
      email: body.email,
      password,
      company: body.company,
      timezone: body.timezone,
    });

    const userId = registered.user.id;
    await this.repo.updateUser('is_email_verified = $1', [true, userId]);

    let planSlug = registered.user.planSlug ?? 'starter';
    if (body.planSlug && body.planSlug !== planSlug) {
      const { rows: planRows } = await this.repo.getPlanIdBySlug(body.planSlug);
      if (!planRows[0]) {
        throw new ValidationError(`Unknown or inactive plan slug: ${body.planSlug}`);
      }
      await this.repo.updateUser('plan_id = $1', [planRows[0].id, userId]);
      planSlug = planRows[0].slug;
    }

    await this.repo.insertAuditEvent(
      actorUserId,
      'admin_client_invited',
      'user',
      userId,
      'info',
      JSON.stringify({
        email: registered.user.email,
        generatedPassword,
        planSlug,
        sendWelcomeEmail: body.sendWelcomeEmail,
      })
    );

    logger.info('Admin invited client user', {
      actorUserId,
      userId,
      email: registered.user.email,
      generatedPassword,
    });

    return {
      data: {
        id: userId,
        email: registered.user.email,
        name: registered.user.name,
        role: registered.user.role,
        planSlug,
        loginUrl: `${String(config.app.webUrl).replace(/\/+$/, '')}/login`,
        temporaryPassword: generatedPassword ? password : null,
      },
      message: 'Client invited — share login credentials securely.',
    };
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
    return this.onboarding.listOnboardingStatus(query);
  }

  async getOnboardingUserDetail(userId: string, query: AdminOnboardingUserDetailQueryDtoType) {
    return this.onboarding.getOnboardingUserDetail(userId, query);
  }

  async retryOnboardingUser(actorUserId: string, userId: string, body: { overwrite?: boolean; namePrefix?: string }) {
    return this.onboarding.retryOnboardingUser(actorUserId, userId, body);
  }

  async retryAllOnboarding(actorUserId: string, body: Record<string, unknown>) {
    return this.onboarding.retryAllOnboarding(actorUserId, body);
  }
}

