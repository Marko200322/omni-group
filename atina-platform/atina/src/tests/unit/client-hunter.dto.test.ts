import {
  ClientHunterRunParamsDto,
  ClientHunterStatusDto,
  CreateClientHunterDto,
  RunClientHunterDto,
} from '../../modules/client-hunter/dto/client-hunter.dto';

describe('ClientHunter DTOs (Zod)', () => {
  describe('CreateClientHunterDto', () => {
    it('rejects empty object (missing name)', () => {
      const r = CreateClientHunterDto.safeParse({});
      expect(r.success).toBe(false);
    });

    it('rejects name shorter than 3 chars', () => {
      expect(CreateClientHunterDto.safeParse({ name: 'ab' }).success).toBe(false);
    });

    it('rejects invalid huntStrategy enum', () => {
      expect(
        CreateClientHunterDto.safeParse({ name: 'valid-name', huntStrategy: 'invalid' }).success
      ).toBe(false);
    });

    it('rejects non-finite budgetAllocated', () => {
      expect(
        CreateClientHunterDto.safeParse({ name: 'workspace', budgetAllocated: Number.NaN }).success
      ).toBe(false);
    });

    it('rejects budget below 0 or above max', () => {
      expect(CreateClientHunterDto.safeParse({ name: 'workspace', budgetAllocated: -1 }).success).toBe(false);
      expect(CreateClientHunterDto.safeParse({ name: 'workspace', budgetAllocated: 2e9 }).success).toBe(false);
    });

    it('rejects strict unknown keys', () => {
      expect(
        CreateClientHunterDto.safeParse({ name: 'workspace', extra: 1 } as Record<string, unknown>).success
      ).toBe(false);
    });

    it('applies defaults for optional fields', () => {
      const r = CreateClientHunterDto.safeParse({ name: 'workspace' });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.budgetAllocated).toBe(0);
        expect(r.data.huntStrategy).toBe('broad');
      }
    });
  });

  describe('RunClientHunterDto', () => {
    it('accepts empty body via defaults', () => {
      const r = RunClientHunterDto.safeParse({});
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.mode).toBe('hunt');
        expect(r.data.intensity).toBe(25);
      }
    });

    it('rejects invalid mode enum', () => {
      expect(RunClientHunterDto.safeParse({ mode: 'invalid' }).success).toBe(false);
    });

    it('rejects intensity out of 1..100', () => {
      expect(RunClientHunterDto.safeParse({ intensity: 0 }).success).toBe(false);
      expect(RunClientHunterDto.safeParse({ intensity: 101 }).success).toBe(false);
    });

    it('rejects non-positive revenueEstimate', () => {
      expect(RunClientHunterDto.safeParse({ revenueEstimate: 0 }).success).toBe(false);
      expect(RunClientHunterDto.safeParse({ revenueEstimate: -5 }).success).toBe(false);
    });

    it('rejects strict unknown keys', () => {
      expect(RunClientHunterDto.safeParse({ foo: 1 } as Record<string, unknown>).success).toBe(false);
    });
  });

  describe('ClientHunterRunParamsDto', () => {
    it('rejects id with invalid characters', () => {
      expect(ClientHunterRunParamsDto.safeParse({ id: 'bad/id' }).success).toBe(false);
    });

    it('rejects id too short', () => {
      expect(ClientHunterRunParamsDto.safeParse({ id: 'a' }).success).toBe(false);
    });
  });

  describe('ClientHunterStatusDto', () => {
    it('parses valid status shape', () => {
      const r = ClientHunterStatusDto.safeParse({
        strategies: ['broad', 'targeted'],
        activeStrategy: 'niche',
        pipelineCapacity: { maxLeadsPerRun: 100, cooldownSeconds: 10 },
      });
      expect(r.success).toBe(true);
    });

    it('rejects activeStrategy outside allowed enum', () => {
      const r = ClientHunterStatusDto.safeParse({
        strategies: ['broad'],
        activeStrategy: 'stealth',
        pipelineCapacity: { maxLeadsPerRun: 1, cooldownSeconds: 0 },
      });
      expect(r.success).toBe(false);
    });
  });
});
