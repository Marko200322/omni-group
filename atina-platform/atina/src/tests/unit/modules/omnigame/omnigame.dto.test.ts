import {
  CreateOmniGameDto,
  OmniGameRunParamsDto,
  RunOmniGameDto,
} from '../../../../modules/omnigame/dto/omnigame.dto';

describe('OmniGame DTOs (Zod) — modules/omnigame', () => {
  describe('CreateOmniGameDto', () => {
    it('rejects empty object', () => {
      expect(CreateOmniGameDto.safeParse({}).success).toBe(false);
    });

    it('rejects name shorter than 2 chars', () => {
      expect(CreateOmniGameDto.safeParse({ name: 'A', genre: 'rpg' }).success).toBe(false);
    });

    it('rejects genre shorter than 2 chars', () => {
      expect(CreateOmniGameDto.safeParse({ name: 'Ok', genre: 'r' }).success).toBe(false);
    });

    it('rejects non-finite budgetAllocated', () => {
      expect(CreateOmniGameDto.safeParse({ name: 'Ok', genre: 'rpg', budgetAllocated: Number.NaN }).success).toBe(
        false
      );
    });

    it('rejects budget below 0 or above max', () => {
      expect(CreateOmniGameDto.safeParse({ name: 'Ok', genre: 'rpg', budgetAllocated: -1 }).success).toBe(false);
      expect(CreateOmniGameDto.safeParse({ name: 'Ok', genre: 'rpg', budgetAllocated: 2e9 }).success).toBe(false);
    });

    it('rejects strict unknown keys', () => {
      expect(
        CreateOmniGameDto.safeParse({ name: 'Ok', genre: 'rpg', extra: 1 } as Record<string, unknown>).success
      ).toBe(false);
    });

    it('applies default budgetAllocated', () => {
      const r = CreateOmniGameDto.safeParse({ name: 'Game', genre: 'puzzle' });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.budgetAllocated).toBe(0);
    });
  });

  describe('RunOmniGameDto', () => {
    it('accepts empty body via default mode', () => {
      const r = RunOmniGameDto.safeParse({});
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.mode).toBe('prototype');
    });

    it('rejects invalid mode', () => {
      expect(RunOmniGameDto.safeParse({ mode: 'ship' } as Record<string, unknown>).success).toBe(false);
    });

    it('rejects strict unknown keys', () => {
      expect(
        RunOmniGameDto.safeParse({ mode: 'publish', flag: true } as Record<string, unknown>).success
      ).toBe(false);
    });

    it.each(['trend-scan', 'prototype', 'validate', 'publish'] as const)('accepts mode %s', (mode) => {
      expect(RunOmniGameDto.safeParse({ mode }).success).toBe(true);
    });
  });

  describe('OmniGameRunParamsDto', () => {
    it('accepts alphanumeric id with hyphen and underscore', () => {
      expect(OmniGameRunParamsDto.safeParse({ id: 'proj_1-a' }).success).toBe(true);
    });

    it('rejects id with invalid characters', () => {
      expect(OmniGameRunParamsDto.safeParse({ id: 'x@y' }).success).toBe(false);
    });

    it('rejects id shorter than 2', () => {
      expect(OmniGameRunParamsDto.safeParse({ id: 'g' }).success).toBe(false);
    });
  });
});
