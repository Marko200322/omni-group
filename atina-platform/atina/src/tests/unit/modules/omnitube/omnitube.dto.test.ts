import {
  CreateOmniTubeDto,
  OmniTubeRunParamsDto,
  RunOmniTubeDto,
} from '../../../../modules/omnitube/dto/omnitube.dto';

describe('OmniTube DTOs (Zod) — modules/omnitube', () => {
  describe('CreateOmniTubeDto', () => {
    it('rejects empty object', () => {
      expect(CreateOmniTubeDto.safeParse({}).success).toBe(false);
    });

    it('rejects name shorter than 2 chars', () => {
      expect(CreateOmniTubeDto.safeParse({ name: 'A' }).success).toBe(false);
    });

    it('rejects invalid platform enum', () => {
      expect(
        CreateOmniTubeDto.safeParse({ name: 'Ok', platform: 'vimeo' } as Record<string, unknown>).success
      ).toBe(false);
    });

    it('rejects non-finite budgetAllocated', () => {
      expect(CreateOmniTubeDto.safeParse({ name: 'Ok', budgetAllocated: Number.NaN }).success).toBe(false);
    });

    it('rejects budget below 0 or above max', () => {
      expect(CreateOmniTubeDto.safeParse({ name: 'Ok', budgetAllocated: -1 }).success).toBe(false);
      expect(CreateOmniTubeDto.safeParse({ name: 'Ok', budgetAllocated: 2e9 }).success).toBe(false);
    });

    it('rejects strict unknown keys', () => {
      expect(
        CreateOmniTubeDto.safeParse({ name: 'Ok', extra: 1 } as Record<string, unknown>).success
      ).toBe(false);
    });

    it('applies defaults for optional fields', () => {
      const r = CreateOmniTubeDto.safeParse({ name: 'Channel' });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.budgetAllocated).toBe(0);
        expect(r.data.platform).toBe('youtube');
      }
    });

    it('accepts all platform enum values', () => {
      for (const platform of ['youtube', 'tiktok', 'instagram', 'multiplatform'] as const) {
        const r = CreateOmniTubeDto.safeParse({ name: 'Ch', platform });
        expect(r.success).toBe(true);
      }
    });
  });

  describe('RunOmniTubeDto', () => {
    it('accepts empty body via default mode', () => {
      const r = RunOmniTubeDto.safeParse({});
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.mode).toBe('publish');
    });

    it('rejects invalid mode', () => {
      expect(RunOmniTubeDto.safeParse({ mode: 'live' } as Record<string, unknown>).success).toBe(false);
    });

    it('rejects strict unknown keys', () => {
      expect(
        RunOmniTubeDto.safeParse({ mode: 'publish', x: 1 } as Record<string, unknown>).success
      ).toBe(false);
    });

    it.each(['idea', 'production', 'publish', 'optimize'] as const)('accepts mode %s', (mode) => {
      expect(RunOmniTubeDto.safeParse({ mode }).success).toBe(true);
    });
  });

  describe('OmniTubeRunParamsDto', () => {
    it('accepts alphanumeric id with hyphen and underscore', () => {
      expect(OmniTubeRunParamsDto.safeParse({ id: 'tube_9-a' }).success).toBe(true);
    });

    it('rejects id with invalid characters', () => {
      expect(OmniTubeRunParamsDto.safeParse({ id: 'bad!' }).success).toBe(false);
    });

    it('rejects id shorter than 2', () => {
      expect(OmniTubeRunParamsDto.safeParse({ id: 'x' }).success).toBe(false);
    });
  });
});
