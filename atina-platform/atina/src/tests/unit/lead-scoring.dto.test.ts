import {
  CreateLeadScoringDto,
  LeadScoringRunParamsDto,
  LeadScoringStatusDto,
  RunLeadScoringDto,
} from '../../modules/lead-scoring/dto/lead-scoring.dto';

describe('LeadScoring DTOs (Zod)', () => {
  describe('CreateLeadScoringDto', () => {
    it('rejects empty body', () => {
      expect(CreateLeadScoringDto.safeParse({}).success).toBe(false);
    });

    it('rejects invalid modelPreset enum', () => {
      expect(
        CreateLeadScoringDto.safeParse({ name: 'workspace', modelPreset: 'turbo' }).success
      ).toBe(false);
    });

    it('rejects budget boundaries', () => {
      expect(CreateLeadScoringDto.safeParse({ name: 'workspace', budgetAllocated: -0.01 }).success).toBe(false);
    });

    it('rejects strict unknown keys', () => {
      expect(
        CreateLeadScoringDto.safeParse({ name: 'workspace', x: true } as Record<string, unknown>).success
      ).toBe(false);
    });

    it('applies defaults', () => {
      const r = CreateLeadScoringDto.safeParse({ name: 'workspace' });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.modelPreset).toBe('standard');
        expect(r.data.budgetAllocated).toBe(0);
      }
    });
  });

  describe('RunLeadScoringDto', () => {
    it('accepts empty body via defaults', () => {
      const r = RunLeadScoringDto.safeParse({});
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.mode).toBe('score');
        expect(r.data.intensity).toBe(25);
      }
    });

    it('rejects invalid mode', () => {
      expect(RunLeadScoringDto.safeParse({ mode: 'train' }).success).toBe(false);
    });

    it('rejects intensity boundaries', () => {
      expect(RunLeadScoringDto.safeParse({ intensity: 0 }).success).toBe(false);
      expect(RunLeadScoringDto.safeParse({ intensity: 1000 }).success).toBe(false);
    });
  });

  describe('LeadScoringRunParamsDto', () => {
    it('rejects malformed workspace id', () => {
      expect(LeadScoringRunParamsDto.safeParse({ id: '###' }).success).toBe(false);
    });
  });

  describe('LeadScoringStatusDto', () => {
    it('parses valid status', () => {
      const r = LeadScoringStatusDto.safeParse({
        presets: ['standard', 'aggressive', 'conservative'],
        defaultPreset: 'standard',
        scoreRange: { min: 0, max: 100 },
      });
      expect(r.success).toBe(true);
    });
  });
});
