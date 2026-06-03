import { totalPagesFromCount } from '../../../utils/pagination';
import { parseOnboardingDateRange, parseCreatedAtSort } from '../../../utils/onboarding-query';
import { WorkflowChainService } from '../../workflow-chain/service/workflow-chain.service';
import type {
  AdminOnboardingStatusListQueryDtoType,
  AdminOnboardingUserDetailQueryDtoType,
} from '../dto/admin.dto';
import {
  ONBOARDING_FEED_EVENT_TYPES,
  UUID_PARAM_RE,
  ONBOARDING_NAME_PREFIX_MAX,
  RETRY_ALL_IDEMPOTENCY_KEY_MAX,
} from '../admin.helpers';
import { AdminRepository, type OnboardingSummaryRow } from '../repository/admin.repository';

export class AdminOnboardingService {
  private readonly repo = new AdminRepository();
  private readonly workflowChainService: WorkflowChainService;

  constructor(workflowChainService?: WorkflowChainService) {
    this.workflowChainService = workflowChainService ?? new WorkflowChainService();
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
