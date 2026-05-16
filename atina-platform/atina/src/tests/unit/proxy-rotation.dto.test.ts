import {
  CreateProxyRotationDto,
  ProxyRotationRunParamsDto,
  ProxyRotationStatusDto,
  RunProxyRotationDto,
} from '../../modules/proxy-rotation/dto/proxy-rotation.dto';

describe('ProxyRotation DTOs (Zod)', () => {
  describe('CreateProxyRotationDto', () => {
    it('rejects empty body', () => {
      expect(CreateProxyRotationDto.safeParse({}).success).toBe(false);
    });

    it('rejects poolSize below 1 or above max', () => {
      expect(CreateProxyRotationDto.safeParse({ name: 'ws', poolSize: 0 }).success).toBe(false);
      expect(CreateProxyRotationDto.safeParse({ name: 'ws', poolSize: 20_000 }).success).toBe(false);
    });

    it('rejects strict unknown keys', () => {
      expect(
        CreateProxyRotationDto.safeParse({ name: 'workspace', secret: 'x' } as Record<string, unknown>).success
      ).toBe(false);
    });

    it('applies defaults', () => {
      const r = CreateProxyRotationDto.safeParse({ name: 'workspace' });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.poolSize).toBe(10);
        expect(r.data.budgetAllocated).toBe(0);
      }
    });

    it('trims name before length check', () => {
      const r = CreateProxyRotationDto.safeParse({ name: '  abc  ' });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.name).toBe('abc');
      }
    });

    it('rejects name shorter than 3 after trim', () => {
      expect(CreateProxyRotationDto.safeParse({ name: '  ab  ' }).success).toBe(false);
    });
  });

  describe('RunProxyRotationDto', () => {
    it('accepts empty body via defaults', () => {
      const r = RunProxyRotationDto.safeParse({});
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.mode).toBe('rotate');
        expect(r.data.intensity).toBe(25);
      }
    });

    it('rejects invalid mode enum', () => {
      expect(RunProxyRotationDto.safeParse({ mode: 'banana' }).success).toBe(false);
    });

    it('rejects intensity boundaries', () => {
      expect(RunProxyRotationDto.safeParse({ intensity: 1, mode: 'rotate' }).success).toBe(true);
      expect(RunProxyRotationDto.safeParse({ intensity: 100, mode: 'rotate' }).success).toBe(true);
      expect(RunProxyRotationDto.safeParse({ intensity: 0 }).success).toBe(false);
    });

    it('rejects non-positive revenueEstimate', () => {
      expect(RunProxyRotationDto.safeParse({ revenueEstimate: 0 }).success).toBe(false);
      expect(RunProxyRotationDto.safeParse({ revenueEstimate: -1 }).success).toBe(false);
    });

    it('accepts revenueEstimate at max and rejects above cap', () => {
      expect(RunProxyRotationDto.safeParse({ revenueEstimate: 1_000_000_000_000 }).success).toBe(true);
      expect(RunProxyRotationDto.safeParse({ revenueEstimate: 1_000_000_000_001 }).success).toBe(false);
    });

    it('rejects strict unknown keys', () => {
      expect(
        RunProxyRotationDto.safeParse({ mode: 'rotate', extra: 1 } as Record<string, unknown>).success
      ).toBe(false);
    });
  });

  describe('ProxyRotationRunParamsDto', () => {
    it('rejects id with spaces', () => {
      expect(ProxyRotationRunParamsDto.safeParse({ id: 'a b' }).success).toBe(false);
    });

    it('rejects id shorter than min after trim', () => {
      expect(ProxyRotationRunParamsDto.safeParse({ id: ' ' }).success).toBe(false);
    });

    it('accepts underscore and hyphen ids', () => {
      expect(ProxyRotationRunParamsDto.safeParse({ id: 'ws_1-a' }).success).toBe(true);
    });
  });

  describe('ProxyRotationStatusDto', () => {
    it('parses nullable lastRotationAt', () => {
      const r = ProxyRotationStatusDto.safeParse({
        poolPolicy: 'round-robin',
        activeProxies: 0,
        lastRotationAt: null,
      });
      expect(r.success).toBe(true);
    });

    it('parses ISO lastRotationAt', () => {
      const r = ProxyRotationStatusDto.safeParse({
        poolPolicy: 'weighted',
        activeProxies: 3,
        lastRotationAt: '2026-01-01T00:00:00.000Z',
      });
      expect(r.success).toBe(true);
    });
  });
});
