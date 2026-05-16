import {
  CreateOutreachDto,
  OutreachRunParamsDto,
  OutreachStatusDto,
  RunOutreachDto,
} from '../../modules/outreach/dto/outreach.dto';

describe('Outreach DTOs (Zod)', () => {
  describe('CreateOutreachDto', () => {
    it('rejects empty object (missing name)', () => {
      const r = CreateOutreachDto.safeParse({});
      expect(r.success).toBe(false);
    });

    it('rejects name shorter than 3 chars', () => {
      expect(CreateOutreachDto.safeParse({ name: 'ab' }).success).toBe(false);
    });

    it('rejects invalid channelFocus enum', () => {
      expect(
        CreateOutreachDto.safeParse({ name: 'valid-name', channelFocus: 'invalid' }).success
      ).toBe(false);
    });

    it('rejects non-finite budgetAllocated', () => {
      expect(
        CreateOutreachDto.safeParse({ name: 'workspace', budgetAllocated: Number.NaN }).success
      ).toBe(false);
    });

    it('rejects budget below 0 or above max', () => {
      expect(CreateOutreachDto.safeParse({ name: 'workspace', budgetAllocated: -1 }).success).toBe(false);
      expect(CreateOutreachDto.safeParse({ name: 'workspace', budgetAllocated: 2e9 }).success).toBe(false);
    });

    it('rejects strict unknown keys', () => {
      expect(
        CreateOutreachDto.safeParse({ name: 'workspace', extra: 1 } as Record<string, unknown>).success
      ).toBe(false);
    });

    it('applies defaults for optional fields', () => {
      const r = CreateOutreachDto.safeParse({ name: 'workspace' });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.budgetAllocated).toBe(0);
        expect(r.data.channelFocus).toBe('email');
      }
    });
  });

  describe('RunOutreachDto', () => {
    it('accepts empty body via defaults', () => {
      const r = RunOutreachDto.safeParse({});
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.mode).toBe('send');
        expect(r.data.intensity).toBe(25);
      }
    });

    it('rejects invalid mode enum', () => {
      expect(RunOutreachDto.safeParse({ mode: 'invalid' }).success).toBe(false);
    });

    it('rejects intensity out of 1..100', () => {
      expect(RunOutreachDto.safeParse({ intensity: 0 }).success).toBe(false);
      expect(RunOutreachDto.safeParse({ intensity: 101 }).success).toBe(false);
    });

    it('rejects non-positive revenueEstimate', () => {
      expect(RunOutreachDto.safeParse({ revenueEstimate: 0 }).success).toBe(false);
      expect(RunOutreachDto.safeParse({ revenueEstimate: -5 }).success).toBe(false);
    });

    it('rejects strict unknown keys', () => {
      expect(RunOutreachDto.safeParse({ foo: 1 } as Record<string, unknown>).success).toBe(false);
    });

    it('accepts ab-test mode', () => {
      const r = RunOutreachDto.safeParse({ mode: 'ab-test', intensity: 50 });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.mode).toBe('ab-test');
      }
    });
  });

  describe('OutreachRunParamsDto', () => {
    it('rejects id with invalid characters', () => {
      expect(OutreachRunParamsDto.safeParse({ id: 'bad/id' }).success).toBe(false);
    });

    it('rejects id too short', () => {
      expect(OutreachRunParamsDto.safeParse({ id: 'a' }).success).toBe(false);
    });
  });

  describe('OutreachStatusDto', () => {
    it('parses valid status shape', () => {
      const r = OutreachStatusDto.safeParse({
        channels: ['email', 'sms'],
        dailyCap: 100,
      });
      expect(r.success).toBe(true);
    });
  });
});
