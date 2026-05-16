import {
  CreateFollowUpDto,
  FollowUpRunParamsDto,
  FollowUpStatusDto,
  RunFollowUpDto,
} from '../../../../modules/follow-up/dto/follow-up.dto';

describe('Follow-up DTOs (Zod)', () => {
  describe('CreateFollowUpDto', () => {
    it('rejects empty object (missing name)', () => {
      const r = CreateFollowUpDto.safeParse({});
      expect(r.success).toBe(false);
    });

    it('rejects name shorter than 3 chars', () => {
      expect(CreateFollowUpDto.safeParse({ name: 'ab' }).success).toBe(false);
    });

    it('rejects invalid cadencePreset enum', () => {
      expect(
        CreateFollowUpDto.safeParse({ name: 'valid-name', cadencePreset: 'invalid' }).success
      ).toBe(false);
    });

    it('rejects non-finite budgetAllocated', () => {
      expect(
        CreateFollowUpDto.safeParse({ name: 'workspace', budgetAllocated: Number.NaN }).success
      ).toBe(false);
    });

    it('rejects budget below 0 or above max', () => {
      expect(CreateFollowUpDto.safeParse({ name: 'workspace', budgetAllocated: -1 }).success).toBe(false);
      expect(CreateFollowUpDto.safeParse({ name: 'workspace', budgetAllocated: 2e9 }).success).toBe(false);
    });

    it('rejects strict unknown keys', () => {
      expect(
        CreateFollowUpDto.safeParse({ name: 'workspace', extra: 1 } as Record<string, unknown>).success
      ).toBe(false);
    });

    it('applies defaults for optional fields', () => {
      const r = CreateFollowUpDto.safeParse({ name: 'workspace' });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.budgetAllocated).toBe(0);
        expect(r.data.cadencePreset).toBe('steady');
      }
    });
  });

  describe('RunFollowUpDto', () => {
    it('accepts empty body via defaults', () => {
      const r = RunFollowUpDto.safeParse({});
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.mode).toBe('schedule');
        expect(r.data.intensity).toBe(25);
      }
    });

    it('rejects invalid mode enum', () => {
      expect(RunFollowUpDto.safeParse({ mode: 'invalid' }).success).toBe(false);
    });

    it('accepts schedule escalate digest', () => {
      expect(RunFollowUpDto.safeParse({ mode: 'escalate' }).success).toBe(true);
      expect(RunFollowUpDto.safeParse({ mode: 'digest' }).success).toBe(true);
    });

    it('rejects intensity out of 1..100', () => {
      expect(RunFollowUpDto.safeParse({ intensity: 0 }).success).toBe(false);
      expect(RunFollowUpDto.safeParse({ intensity: 101 }).success).toBe(false);
    });

    it('rejects non-positive revenueEstimate', () => {
      expect(RunFollowUpDto.safeParse({ revenueEstimate: 0 }).success).toBe(false);
      expect(RunFollowUpDto.safeParse({ revenueEstimate: -5 }).success).toBe(false);
    });

    it('rejects strict unknown keys', () => {
      expect(RunFollowUpDto.safeParse({ foo: 1 } as Record<string, unknown>).success).toBe(false);
    });
  });

  describe('FollowUpRunParamsDto', () => {
    it('rejects id with invalid characters', () => {
      expect(FollowUpRunParamsDto.safeParse({ id: 'bad/id' }).success).toBe(false);
    });

    it('rejects id too short', () => {
      expect(FollowUpRunParamsDto.safeParse({ id: 'a' }).success).toBe(false);
    });
  });

  describe('FollowUpStatusDto', () => {
    it('parses valid status shape', () => {
      const r = FollowUpStatusDto.safeParse({
        cadences: ['steady', 'persistent'],
        activeCadence: 'light',
        pipelineCapacity: { maxTouchpointsPerRun: 100, cooldownSeconds: 10 },
      });
      expect(r.success).toBe(true);
    });
  });
});
