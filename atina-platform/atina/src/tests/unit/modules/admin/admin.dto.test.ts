import {
  AdminOverviewQueryDto,
  AdminWorkflowTemplateExecutionStatsQueryDto,
  AdminUsersListQueryDto,
  AdminPaymentsListQueryDto,
  AdminLogsListQueryDto,
  AdminPhaseGatingTimelineQueryDto,
  AdminOnboardingStatusListQueryDto,
  AdminOnboardingUserDetailQueryDto,
  AdminPatchUserBodyDto,
  AdminPostLogBodyDto,
  AdminOnboardingRetryAllBodyDto,
} from '../../../../modules/admin/dto/admin.dto';

describe('Admin DTOs', () => {
  it('AdminOverviewQueryDto applies default threshold in valid range', () => {
    const r = AdminOverviewQueryDto.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(Number.isInteger(r.data.templateSuccessRateAlertThreshold)).toBe(true);
      expect(r.data.templateSuccessRateAlertThreshold).toBeGreaterThanOrEqual(1);
      expect(r.data.templateSuccessRateAlertThreshold).toBeLessThanOrEqual(100);
    }
  });

  it('AdminOverviewQueryDto coerces and clamps threshold', () => {
    const hi = AdminOverviewQueryDto.safeParse({ templateSuccessRateAlertThreshold: '99' });
    expect(hi.success).toBe(true);
    if (hi.success) expect(hi.data.templateSuccessRateAlertThreshold).toBe(99);

    expect(AdminOverviewQueryDto.safeParse({ templateSuccessRateAlertThreshold: 0 }).success).toBe(false);
    expect(AdminOverviewQueryDto.safeParse({ templateSuccessRateAlertThreshold: 101 }).success).toBe(false);
    expect(AdminOverviewQueryDto.safeParse({ unknown: 1 }).success).toBe(false);
  });

  it('AdminWorkflowTemplateExecutionStatsQueryDto defaults and templateKey', () => {
    const d = AdminWorkflowTemplateExecutionStatsQueryDto.safeParse({});
    expect(d.success).toBe(true);
    if (d.success) expect(d.data.days).toBe(30);

    const withKey = AdminWorkflowTemplateExecutionStatsQueryDto.safeParse({
      days: '7',
      templateKey: 'wf_chain_v1',
    });
    expect(withKey.success).toBe(true);
    if (withKey.success) {
      expect(withKey.data.days).toBe(7);
      expect(withKey.data.templateKey).toBe('wf_chain_v1');
    }
  });

  it('AdminWorkflowTemplateExecutionStatsQueryDto rejects invalid days or templateKey', () => {
    expect(AdminWorkflowTemplateExecutionStatsQueryDto.safeParse({ days: 0 }).success).toBe(false);
    expect(AdminWorkflowTemplateExecutionStatsQueryDto.safeParse({ days: 400 }).success).toBe(false);
    expect(AdminWorkflowTemplateExecutionStatsQueryDto.safeParse({ templateKey: 'bad key' }).success).toBe(
      false
    );
    expect(AdminWorkflowTemplateExecutionStatsQueryDto.safeParse({ extra: true }).success).toBe(false);
  });

  it('AdminUsersListQueryDto matches UserQueryDto (strict pagination + isActive)', () => {
    const empty = AdminUsersListQueryDto.safeParse({});
    expect(empty.success).toBe(true);
    if (empty.success) {
      expect(empty.data.page).toBe(1);
      expect(empty.data.limit).toBe(20);
    }
    const inactive = AdminUsersListQueryDto.safeParse({ isActive: 'false' });
    expect(inactive.success).toBe(true);
    if (inactive.success) expect(inactive.data.isActive).toBe(false);
    expect(AdminUsersListQueryDto.safeParse({ limit: 101 }).success).toBe(false);
    expect(AdminUsersListQueryDto.safeParse({ page: 1, unknown: 1 }).success).toBe(false);
  });

  it('AdminPaymentsListQueryDto and AdminLogsListQueryDto defaults and strict', () => {
    const pay = AdminPaymentsListQueryDto.safeParse({});
    expect(pay.success).toBe(true);
    if (pay.success) expect(pay.data).toMatchObject({ page: 1, limit: 20 });

    const logs = AdminLogsListQueryDto.safeParse({});
    expect(logs.success).toBe(true);
    if (logs.success) expect(logs.data).toMatchObject({ page: 1, limit: 50 });

    expect(AdminPaymentsListQueryDto.safeParse({ limit: 101 }).success).toBe(false);
    expect(AdminLogsListQueryDto.safeParse({ extra: 'x' }).success).toBe(false);
  });

  it('AdminPhaseGatingTimelineQueryDto is strict pagination', () => {
    expect(AdminPhaseGatingTimelineQueryDto.safeParse({}).success).toBe(true);
    expect(AdminPhaseGatingTimelineQueryDto.safeParse({ foo: 1 }).success).toBe(false);
  });

  it('AdminOnboardingStatusListQueryDto clamps limit and rejects unknown keys', () => {
    const clamped = AdminOnboardingStatusListQueryDto.safeParse({ page: 1, limit: 500 });
    expect(clamped.success).toBe(true);
    if (clamped.success) expect(clamped.data.limit).toBe(100);

    const neg = AdminOnboardingStatusListQueryDto.safeParse({ limit: -5 });
    expect(neg.success).toBe(true);
    if (neg.success) expect(neg.data.limit).toBe(1);

    expect(AdminOnboardingStatusListQueryDto.safeParse({ extra: 1 }).success).toBe(false);
  });

  it('AdminOnboardingUserDetailQueryDto parses includeAdminActions and is strict', () => {
    const t = AdminOnboardingUserDetailQueryDto.safeParse({ includeAdminActions: 'true' });
    expect(t.success).toBe(true);
    if (t.success) expect(t.data.includeAdminActions).toBe(true);

    const garbage = AdminOnboardingUserDetailQueryDto.safeParse({ includeAdminActions: 'maybe' });
    expect(garbage.success).toBe(true);
    if (garbage.success) expect(garbage.data.includeAdminActions).toBeUndefined();

    expect(AdminOnboardingUserDetailQueryDto.safeParse({ bogusFlag: 1 }).success).toBe(false);
  });

  it('AdminPatchUserBodyDto allows empty object and rejects unknown keys', () => {
    expect(AdminPatchUserBodyDto.safeParse({}).success).toBe(true);
    expect(AdminPatchUserBodyDto.safeParse({ role: 'user', isActive: true }).success).toBe(true);
    expect(AdminPatchUserBodyDto.safeParse({ extra: 1 }).success).toBe(false);
  });

  it('AdminPostLogBodyDto requires message and applies defaults', () => {
    expect(AdminPostLogBodyDto.safeParse({ message: 'x' }).success).toBe(true);
    const r = AdminPostLogBodyDto.safeParse({ message: 'hello' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.level).toBe('info');
      expect(r.data.category).toBe('admin');
      expect(r.data.context).toEqual({});
    }
    expect(AdminPostLogBodyDto.safeParse({}).success).toBe(false);
    expect(AdminPostLogBodyDto.safeParse({ message: 'm', level: 'warn', extra: 1 }).success).toBe(false);
  });

  it('AdminOnboardingRetryAllBodyDto is strict on top-level keys only', () => {
    expect(AdminOnboardingRetryAllBodyDto.safeParse({ dryRun: true }).success).toBe(true);
    expect(AdminOnboardingRetryAllBodyDto.safeParse({ unknownOption: true }).success).toBe(false);
  });
});
