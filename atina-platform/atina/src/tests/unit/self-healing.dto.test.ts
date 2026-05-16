import {
  AutoHealDto,
  AutoScanDto,
  HealIssueDto,
  ReportIssueDto,
} from '../../modules/self-healing/dto/self-healing.dto';

describe('Self-healing DTOs', () => {
  describe('AutoScanDto', () => {
    it('applies all include flags to true by default', () => {
      const r = AutoScanDto.safeParse({});
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.includeTasks).toBe(true);
        expect(r.data.includePayments).toBe(true);
        expect(r.data.includeIntegrations).toBe(true);
      }
    });

    it('treats undefined body like empty object', () => {
      const r = AutoScanDto.safeParse(undefined);
      expect(r.success).toBe(true);
    });

    it('rejects strict unknown keys', () => {
      expect(AutoScanDto.safeParse({ extra: true } as Record<string, unknown>).success).toBe(false);
    });

    it('allows disabling individual flags', () => {
      const r = AutoScanDto.safeParse({ includeTasks: false });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.includeTasks).toBe(false);
        expect(r.data.includePayments).toBe(true);
      }
    });

    it('rejects non-boolean flags', () => {
      expect(AutoScanDto.safeParse({ includeTasks: 'yes' as unknown as boolean }).success).toBe(false);
    });
  });

  describe('AutoHealDto', () => {
    it('applies default maxEvents when body is empty', () => {
      const r = AutoHealDto.safeParse({});
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.maxEvents).toBe(20);
      }
    });

    it('treats undefined body like empty object', () => {
      const r = AutoHealDto.safeParse(undefined);
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.maxEvents).toBe(20);
      }
    });

    it('rejects strict unknown keys', () => {
      expect(AutoHealDto.safeParse({ maxEvents: 10, extra: 1 } as Record<string, unknown>).success).toBe(false);
    });

    it('accepts zero maxEvents (no-op cap, N3-I4)', () => {
      const r = AutoHealDto.safeParse({ maxEvents: 0 });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.maxEvents).toBe(0);
      }
    });

    it('rejects maxEvents above 100', () => {
      expect(AutoHealDto.safeParse({ maxEvents: 101 }).success).toBe(false);
    });

    it('rejects non-integer maxEvents', () => {
      expect(AutoHealDto.safeParse({ maxEvents: 2.5 }).success).toBe(false);
    });

    it('rejects negative maxEvents', () => {
      expect(AutoHealDto.safeParse({ maxEvents: -1 }).success).toBe(false);
    });

    it('rejects NaN maxEvents', () => {
      expect(AutoHealDto.safeParse({ maxEvents: Number.NaN }).success).toBe(false);
    });

    it('rejects string maxEvents', () => {
      expect(AutoHealDto.safeParse({ maxEvents: '10' as unknown as number }).success).toBe(false);
    });
  });

  describe('ReportIssueDto', () => {
    it('rejects subsystem shorter than min length', () => {
      expect(
        ReportIssueDto.safeParse({
          subsystem: 'a',
          issueKey: 'valid-key',
          details: {},
        }).success
      ).toBe(false);
    });

    it('rejects empty subsystem', () => {
      expect(
        ReportIssueDto.safeParse({
          subsystem: '',
          issueKey: 'valid-key',
          details: {},
        }).success
      ).toBe(false);
    });

    it('applies default empty details when omitted', () => {
      const r = ReportIssueDto.safeParse({ subsystem: 'pay', issueKey: 'key-one' });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.details).toEqual({});
      }
    });

    it('rejects issueKey longer than max', () => {
      expect(
        ReportIssueDto.safeParse({
          subsystem: 'tasks',
          issueKey: 'k'.repeat(121),
          details: {},
        }).success
      ).toBe(false);
    });

    it('rejects strict unknown keys', () => {
      expect(
        ReportIssueDto.safeParse({
          subsystem: 'pay',
          issueKey: 'key-one',
          extra: 1,
        } as Record<string, unknown>).success
      ).toBe(false);
    });
  });

  describe('HealIssueDto', () => {
    it('rejects remediation shorter than min length', () => {
      expect(HealIssueDto.safeParse({ remediationAction: 'ab' }).success).toBe(false);
    });

    it('rejects remediation longer than max', () => {
      expect(HealIssueDto.safeParse({ remediationAction: 'x'.repeat(301) }).success).toBe(false);
    });

    it('accepts remediation at max length', () => {
      expect(HealIssueDto.safeParse({ remediationAction: 'x'.repeat(300) }).success).toBe(true);
    });

    it('rejects strict unknown keys', () => {
      expect(
        HealIssueDto.safeParse({ remediationAction: 'valid-action', extra: 1 } as Record<string, unknown>).success
      ).toBe(false);
    });
  });
});
