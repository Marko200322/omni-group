import {
  CreateTitanisWorkspaceDto,
  RunTitanisDto,
  TitanisRunParamsDto,
} from '../../../../modules/titanis/dto/titanis.dto';

describe('Titanis DTO branches', () => {
  describe('CreateTitanisWorkspaceDto', () => {
    it('rejects name shorter than 3 characters', () => {
      expect(CreateTitanisWorkspaceDto.safeParse({ name: 'ab' }).success).toBe(false);
    });

    it('rejects invalid outreachChannel enum', () => {
      expect(
        CreateTitanisWorkspaceDto.safeParse({ name: 'abc', outreachChannel: 'sms' }).success
      ).toBe(false);
    });

    it('rejects name longer than 120 characters', () => {
      expect(CreateTitanisWorkspaceDto.safeParse({ name: 'x'.repeat(121) }).success).toBe(false);
    });

    it('rejects non-finite and out-of-range budgetAllocated', () => {
      expect(CreateTitanisWorkspaceDto.safeParse({ name: 'abc', budgetAllocated: Number.NaN }).success).toBe(
        false
      );
      expect(CreateTitanisWorkspaceDto.safeParse({ name: 'abc', budgetAllocated: -0.01 }).success).toBe(false);
      expect(CreateTitanisWorkspaceDto.safeParse({ name: 'abc', budgetAllocated: 2e9 }).success).toBe(false);
    });

    it('accepts each outreachChannel value', () => {
      for (const ch of ['email', 'dm', 'mixed'] as const) {
        const r = CreateTitanisWorkspaceDto.safeParse({ name: 'abc', outreachChannel: ch });
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.outreachChannel).toBe(ch);
      }
    });
  });

  describe('RunTitanisDto', () => {
    it('rejects invalid mode', () => {
      expect(RunTitanisDto.safeParse({ mode: 'hunt' }).success).toBe(false);
    });

    it('rejects targetCount below 1 and above 500', () => {
      expect(RunTitanisDto.safeParse({ targetCount: 0 }).success).toBe(false);
      expect(RunTitanisDto.safeParse({ targetCount: 501 }).success).toBe(false);
    });

    it('accepts each mode value', () => {
      for (const mode of ['lead-hunt', 'follow-up', 'close'] as const) {
        const r = RunTitanisDto.safeParse({ mode, targetCount: 1 });
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.mode).toBe(mode);
      }
    });
  });

  describe('TitanisRunParamsDto', () => {
    it('accepts id with underscore and hyphen', () => {
      expect(TitanisRunParamsDto.safeParse({ id: 'ws_1-a' }).success).toBe(true);
    });

    it('rejects id longer than 64 chars', () => {
      expect(TitanisRunParamsDto.safeParse({ id: 'a'.repeat(65) }).success).toBe(false);
    });

    it('rejects id shorter than 2 after trim', () => {
      expect(TitanisRunParamsDto.safeParse({ id: 'x' }).success).toBe(false);
    });

    it('rejects id with characters outside allowed set', () => {
      expect(TitanisRunParamsDto.safeParse({ id: 'ws@1' }).success).toBe(false);
    });
  });
});
