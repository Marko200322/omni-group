import { z } from 'zod';
import { config } from '../../../config';
import { emailSchema } from '../../auth/dto/auth.dto';

/** Optional query string (Express may send `string[]`). */
const queryParamToOptionalString = z.preprocess((val: unknown): unknown => {
  if (val === undefined || val === null || val === '') return undefined;
  if (Array.isArray(val)) {
    const first = val[0];
    if (first === undefined || first === null || String(first).trim() === '') return undefined;
    return String(first);
  }
  return String(val);
}, z.string().optional());

/**
 * `includeAdminActions` — only explicit truthy enables admin block; unknown strings → `undefined`
 * (matches legacy `String(x).toLowerCase() === 'true'`, no 400 on garbage).
 */
const onboardingIncludeAdminActionsQuery = z.preprocess((val: unknown) => {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (s === 'true' || s === '1' || s === 'yes') return true;
    if (s === 'false' || s === '0' || s === 'no') return false;
    return undefined;
  }
  return undefined;
}, z.boolean().optional());

/** Legacy onboarding list/detail: `page` like `Math.max(Number(page) || 1, 1)`. */
function parseOnboardingQueryPage(val: unknown): number {
  if (val === undefined || val === null || val === '') return 1;
  const raw = Array.isArray(val) ? val[0] : val;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 1;
  const coerced = n === 0 ? 1 : n;
  return Math.max(Math.trunc(coerced), 1);
}

/**
 * Legacy onboarding: `Math.min(Math.max(Number(limit) || 20, 1), 100)`
 * (negative limits floor via `Math.max`, zero → 20).
 */
function parseOnboardingQueryLimit(val: unknown): number {
  if (val === undefined || val === null || val === '') return 20;
  const raw = Array.isArray(val) ? val[0] : val;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 20;
  const coerced = n === 0 ? 20 : n;
  const floored = Math.max(Math.trunc(coerced), 1);
  return Math.min(floored, 100);
}

/** GET `/onboarding-status` — strict keys; pagination matches legacy clamp / fallbacks. */
export const AdminOnboardingStatusListQueryDto = z
  .object({
    page: z.any().transform(parseOnboardingQueryPage),
    limit: z.any().transform(parseOnboardingQueryLimit),
    status: queryParamToOptionalString,
    actorUserId: queryParamToOptionalString,
    targetUserId: queryParamToOptionalString,
    from: queryParamToOptionalString,
    to: queryParamToOptionalString,
    sort: queryParamToOptionalString,
    eventType: queryParamToOptionalString,
  })
  .strict();

/**
 * GET `/onboarding-status/:userId` — `adminPage` / `adminLimit` stay optional strings;
 * handler uses `Number(adminX ?? main) || default` like before.
 */
export const AdminOnboardingUserDetailQueryDto = z
  .object({
    page: z.any().transform(parseOnboardingQueryPage),
    limit: z.any().transform(parseOnboardingQueryLimit),
    includeAdminActions: onboardingIncludeAdminActionsQuery,
    adminPage: queryParamToOptionalString,
    adminLimit: queryParamToOptionalString,
    from: queryParamToOptionalString,
    to: queryParamToOptionalString,
    sort: queryParamToOptionalString,
  })
  .strict();

const defaultTemplateSuccessRateAlertThreshold = Math.max(
  1,
  Math.min(100, Math.floor(config.monitoring.workflowTemplateSuccessAlertThreshold))
);

/** GET `/users` — same filters as public user list (`UserQueryDto`), strict pagination + booleans from query. */
export { UserQueryDto as AdminUsersListQueryDto } from '../../users/dto/users.dto';

/** GET `/phase-gating/timeline` — pagination only. */
export { StrictPaginationQueryDto as AdminPhaseGatingTimelineQueryDto } from '../../../api/dto/pagination-query.dto';

export const AdminPaymentsListQueryDto = z
  .object({
    page: z.coerce.number().int().min(1).catch(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.string().trim().min(1).max(64).optional(),
    provider: z.string().trim().min(1).max(64).optional(),
  })
  .strict();

/** GET `/logs` — default `limit` 50 (not 20). */
export const AdminLogsListQueryDto = z
  .object({
    page: z.coerce.number().int().min(1).catch(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    level: z.string().trim().min(1).max(32).optional(),
    category: z.string().trim().min(1).max(64).optional(),
  })
  .strict();

export const AdminOverviewQueryDto = z.object({
  templateSuccessRateAlertThreshold: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(defaultTemplateSuccessRateAlertThreshold),
}).strict();

export const AdminWorkflowTemplateExecutionStatsQueryDto = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
  templateKey: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid templateKey format')
    .optional(),
}).strict();

export type AdminOverviewQueryDtoType = z.infer<typeof AdminOverviewQueryDto>;
export type AdminWorkflowTemplateExecutionStatsQueryDtoType = z.infer<typeof AdminWorkflowTemplateExecutionStatsQueryDto>;
export type AdminPaymentsListQueryDtoType = z.infer<typeof AdminPaymentsListQueryDto>;
export type AdminLogsListQueryDtoType = z.infer<typeof AdminLogsListQueryDto>;
export type AdminOnboardingStatusListQueryDtoType = z.infer<typeof AdminOnboardingStatusListQueryDto>;
export type AdminOnboardingUserDetailQueryDtoType = z.infer<typeof AdminOnboardingUserDetailQueryDto>;
export type { UserQueryDtoType as AdminUsersListQueryDtoType } from '../../users/dto/users.dto';

const bodyToObject = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

/** POST `/users/invite` — operator creates a client account (optional temp password). */
export const AdminInviteUserBodyDto = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: emailSchema,
    password: z
      .string()
      .min(8)
      .max(100)
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number')
      .optional(),
    company: z.string().trim().max(255).optional(),
    timezone: z.string().trim().max(100).default('UTC'),
    planSlug: z.string().trim().min(1).max(50).optional(),
    sendWelcomeEmail: z.boolean().default(false),
  })
  .strict();

/** PATCH `/users/:id` — optional fields; unknown keys rejected. */
export const AdminPatchUserBodyDto = z.preprocess(
  bodyToObject,
  z
    .object({
      role: z.enum(['admin', 'user', 'moderator']).optional(),
      isActive: z.boolean().optional(),
      planId: z.union([z.string().uuid(), z.null()]).optional(),
    })
    .strict()
);

/** PATCH `/modules/:id` */
export const AdminPatchModuleBodyDto = z.preprocess(
  bodyToObject,
  z
    .object({
      isActive: z.boolean().optional(),
      config: z.record(z.unknown()).optional(),
    })
    .strict()
);

/** POST `/logs` */
export const AdminPostLogBodyDto = z
  .object({
    level: z.string().min(1).max(32).default('info'),
    category: z.string().min(1).max(64).default('admin'),
    message: z.string().min(1).max(20000),
    context: z.record(z.unknown()).default({}),
  })
  .strict();

/** PATCH `/plans/:id` — keys aligned with handler `allowed` list. */
export const AdminPatchPlanBodyDto = z.preprocess(
  bodyToObject,
  z
    .object({
      name: z.string().min(1).max(255).optional(),
      description: z.string().max(5000).optional(),
      price_monthly: z.coerce.number().nonnegative().optional(),
      price_yearly: z.coerce.number().nonnegative().optional(),
      is_active: z.boolean().optional(),
      is_popular: z.boolean().optional(),
      features: z.unknown().optional(),
      limits: z.unknown().optional(),
      sort_order: z.coerce.number().int().optional(),
    })
    .strict()
);

/** POST `/onboarding-status/:userId/retry` */
export const AdminOnboardingRetryBodyDto = z.preprocess(
  bodyToObject,
  z
    .object({
      overwrite: z.boolean().optional(),
      namePrefix: z.string().optional(),
    })
    .strict()
);

/**
 * POST `/onboarding-status/retry-all` — only whitelisted keys; values passed through for legacy coercion in the handler.
 */
export const AdminOnboardingRetryAllBodyDto = z.preprocess(
  bodyToObject,
  z
    .object({
      status: z.any().optional(),
      limit: z.any().optional(),
      overwrite: z.any().optional(),
      dryRun: z.any().optional(),
      sortBy: z.any().optional(),
      dedupeBy: z.any().optional(),
      minPriorityScore: z.any().optional(),
      maxUsersPerRun: z.any().optional(),
      cooldownHours: z.any().optional(),
      stopOnFirstError: z.any().optional(),
      maxFailures: z.any().optional(),
      maxDurationMs: z.any().optional(),
      strict: z.any().optional(),
      namePrefix: z.any().optional(),
      idempotencyKey: z.any().optional(),
      resumeFromUserId: z.any().optional(),
      includeUserIds: z.any().optional(),
      excludeUserIds: z.any().optional(),
    })
    .strict()
);

export type AdminInviteUserBodyDtoType = z.infer<typeof AdminInviteUserBodyDto>;
export type AdminPatchUserBodyDtoType = z.infer<typeof AdminPatchUserBodyDto>;
export type AdminPatchModuleBodyDtoType = z.infer<typeof AdminPatchModuleBodyDto>;
export type AdminPostLogBodyDtoType = z.infer<typeof AdminPostLogBodyDto>;
export type AdminPatchPlanBodyDtoType = z.infer<typeof AdminPatchPlanBodyDto>;
export type AdminOnboardingRetryBodyDtoType = z.infer<typeof AdminOnboardingRetryBodyDto>;
export type AdminOnboardingRetryAllBodyDtoType = z.infer<typeof AdminOnboardingRetryAllBodyDto>;
