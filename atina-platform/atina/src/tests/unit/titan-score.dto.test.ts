import {
  CreateTitanScoreDto,
  RunTitanScoreDto,
  TitanScoreRunParamsDto,
  TitanScoreStatusDto,
} from '../../modules/titan-score/dto/titan-score.dto';

describe('Titan Score DTOs (Zod)', () => {
  describe('CreateTitanScoreDto', () => {
    it('rejects short name', () => {
      expect(CreateTitanScoreDto.safeParse({ name: 'a' }).success).toBe(false);
    });

    it('applies defaults', () => {
      const r = CreateTitanScoreDto.safeParse({ name: 'My workspace' });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.weightProfile).toBe('balanced');
        expect(r.data.budgetAllocated).toBe(0);
      }
    });

    it('rejects strict unknown keys', () => {
      expect(
        CreateTitanScoreDto.safeParse({ name: 'workspace', extra: 1 } as Record<string, unknown>).success
      ).toBe(false);
    });
  });

  describe('RunTitanScoreDto', () => {
    it('accepts snapshot', () => {
      const r = RunTitanScoreDto.safeParse({ mode: 'snapshot', payload: { x: 1 } });
      expect(r.success).toBe(true);
    });

    it('accepts trend with points', () => {
      const r = RunTitanScoreDto.safeParse({
        mode: 'trend',
        points: [{ key: 'a', value: 1 }],
      });
      expect(r.success).toBe(true);
    });

    it('accepts compare', () => {
      const r = RunTitanScoreDto.safeParse({
        mode: 'compare',
        left: { a: 1 },
        right: { b: 2 },
      });
      expect(r.success).toBe(true);
    });

    it('rejects trend without points', () => {
      expect(RunTitanScoreDto.safeParse({ mode: 'trend', points: [] }).success).toBe(false);
    });

    it('defaults missing body to snapshot', () => {
      for (const input of [undefined, null, {}] as const) {
        const r = RunTitanScoreDto.safeParse(input);
        expect(r.success).toBe(true);
        if (r.success) {
          expect(r.data).toEqual({ mode: 'snapshot' });
        }
      }
    });

    it('defaults omitted mode to snapshot when payload is present', () => {
      const r = RunTitanScoreDto.safeParse({ payload: { n: 1 } });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data).toEqual({ mode: 'snapshot', payload: { n: 1 } });
      }
    });

    it('rejects unknown keys on snapshot branch', () => {
      expect(RunTitanScoreDto.safeParse({ mode: 'snapshot', extra: 1 } as Record<string, unknown>).success).toBe(
        false
      );
    });

    it('rejects body without mode that has unknown keys after defaulting mode', () => {
      expect(RunTitanScoreDto.safeParse({ foo: 1 } as Record<string, unknown>).success).toBe(false);
    });
  });

  describe('TitanScoreRunParamsDto', () => {
    it('rejects malformed id', () => {
      expect(TitanScoreRunParamsDto.safeParse({ id: '###' }).success).toBe(false);
    });
  });

  describe('TitanScoreStatusDto', () => {
    it('parses status', () => {
      const r = TitanScoreStatusDto.safeParse({
        modes: ['snapshot', 'trend', 'compare'],
        scoreRange: { min: 0, max: 100 },
        weightProfiles: ['balanced', 'ops', 'growth'],
      });
      expect(r.success).toBe(true);
    });
  });
});
