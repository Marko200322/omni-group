import { CreateForgeDto, ForgeRunParamsDto, ForgeStatusDto, RunForgeDto } from '../../modules/forge/dto/forge.dto';
import {
  AtinaSystemRunParamsDto,
  AtinaSystemStatusDto,
  CreateAtinaSystemDto,
  RunAtinaSystemDto,
} from '../../modules/atina-system/dto/atina-system.dto';
import {
  CreateSistemNaplateWorkspaceDto,
  RunSistemNaplateDto,
  SistemNaplateRunParamsDto,
} from '../../modules/sistem-naplate/dto/sistem-naplate.dto';

describe('Module DTO API contracts', () => {
  describe('forge dto', () => {
    it('applies defaults for create and run payloads', () => {
      expect(CreateForgeDto.parse({ name: 'Forge Workspace' })).toEqual({
        name: 'Forge Workspace',
        budgetAllocated: 0,
        operatingMode: 'steady',
      });
      expect(RunForgeDto.parse({})).toEqual({
        mode: 'smelt',
        intensity: 25,
      });
    });

    it('enforces strict schema for create and run payloads', () => {
      expect(() => CreateForgeDto.parse({ name: 'Forge', extra: true })).toThrow();
      expect(() => RunForgeDto.parse({ mode: 'smelt', intensity: 10, extra: true })).toThrow();
    });

    it('validates run params id format', () => {
      expect(ForgeRunParamsDto.parse({ id: 'forge_1' })).toEqual({ id: 'forge_1' });
      expect(() => ForgeRunParamsDto.parse({ id: 'bad id!' })).toThrow('Invalid workspace id format');
    });

    it('accepts expected forge status schema payload', () => {
      const parsed = ForgeStatusDto.parse({
        providers: ['oracle', 'aws', 'azure'],
        nextProvider: 'oracle',
        budgetRsd: { initial: 1000, remaining: 900, spent: 100 },
        budgetGuard: { minReserveRsd: 100, hardStopMode: false, availableToSpendRsd: 800 },
        recentEvents: [
          { id: 'e1', provider: 'oracle', eventType: 'forge_run', costRsd: 50, createdAt: '2026-03-31T10:00:00.000Z' },
        ],
      });

      expect(parsed.nextProvider).toBe('oracle');
      expect(parsed.recentEvents).toHaveLength(1);
    });
  });

  describe('atina-system dto', () => {
    it('applies defaults for create and run payloads', () => {
      expect(CreateAtinaSystemDto.parse({ name: 'Atina Workspace' })).toEqual({
        name: 'Atina Workspace',
        budgetAllocated: 0,
        operatingMode: 'balanced',
      });
      expect(RunAtinaSystemDto.parse({})).toEqual({
        mode: 'sync',
        intensity: 25,
      });
    });

    it('rejects unknown fields and invalid enum/range values', () => {
      expect(() => CreateAtinaSystemDto.parse({ name: 'Atina', operatingMode: 'wrong-mode' })).toThrow();
      expect(() => RunAtinaSystemDto.parse({ mode: 'invalid', intensity: 0 })).toThrow();
      expect(() => RunAtinaSystemDto.parse({ mode: 'sync', intensity: 10, extra: true })).toThrow();
    });

    it('validates run params id format', () => {
      expect(AtinaSystemRunParamsDto.parse({ id: 'atina_1' })).toEqual({ id: 'atina_1' });
      expect(() => AtinaSystemRunParamsDto.parse({ id: 'bad id!' })).toThrow('Invalid workspace id format');
    });

    it('accepts boundary name length and operating modes', () => {
      const minName = 'abc';
      expect(CreateAtinaSystemDto.parse({ name: minName })).toMatchObject({
        name: minName,
        operatingMode: 'balanced',
      });
      const longName = 'n'.repeat(120);
      expect(CreateAtinaSystemDto.parse({ name: longName, operatingMode: 'efficiency' })).toEqual({
        name: longName,
        budgetAllocated: 0,
        operatingMode: 'efficiency',
      });
      expect(() => CreateAtinaSystemDto.parse({ name: 'ab' })).toThrow();
    });

    it('rejects non-finite budget and intensity boundaries for run', () => {
      expect(() => CreateAtinaSystemDto.parse({ name: 'Good', budgetAllocated: Number.NaN })).toThrow();
      expect(RunAtinaSystemDto.parse({ mode: 'execute', intensity: 100 })).toEqual({
        mode: 'execute',
        intensity: 100,
      });
      expect(() => RunAtinaSystemDto.parse({ mode: 'sync', intensity: 101 })).toThrow();
      expect(() => RunAtinaSystemDto.parse({ mode: 'sync', intensity: 1.5 })).toThrow();
    });

    it('parses status schema and rejects invalid provider', () => {
      const prodEnvReadiness = {
        nodeEnv: 'test',
        isProduction: false,
        dbSsl: false,
        jwtSecretUsesDocumentedPlaceholder: true,
        jwtRefreshSecretUsesDocumentedPlaceholder: true,
        dbPasswordUsesDocumentedPlaceholder: true,
        adminPasswordUsesDocumentedPlaceholder: true,
        smtpEnabled: false,
        smtpHasCredentials: false,
      };
      const ok = AtinaSystemStatusDto.parse({
        providers: ['core', 'cloud', 'partner'],
        nextProvider: 'cloud',
        capacity: { total: 100, available: 50 },
        recentEvents: [{ id: 'e1', eventType: 'ping', createdAt: '2026-04-01T00:00:00.000Z' }],
        prodEnvReadiness,
      });
      expect(ok.nextProvider).toBe('cloud');
      expect(() =>
        AtinaSystemStatusDto.parse({
          providers: ['core'],
          nextProvider: 'invalid',
          capacity: { total: 1, available: 0 },
          recentEvents: [],
          prodEnvReadiness,
        })
      ).toThrow();
    });
  });

  describe('sistem-naplate dto', () => {
    it('applies defaults for create and run payloads', () => {
      expect(CreateSistemNaplateWorkspaceDto.parse({ name: 'Naplata Workspace' })).toEqual({
        name: 'Naplata Workspace',
        budgetAllocated: 0,
        billingCadence: 'weekly',
      });
      expect(RunSistemNaplateDto.parse({})).toEqual({
        mode: 'reconcile',
        batchSize: 50,
      });
    });

    it('rejects unknown fields and invalid enum/range values', () => {
      expect(() =>
        CreateSistemNaplateWorkspaceDto.parse({ name: 'Naplata', billingCadence: 'yearly' })
      ).toThrow();
      expect(() => RunSistemNaplateDto.parse({ mode: 'invalid', batchSize: 0 })).toThrow();
      expect(() => RunSistemNaplateDto.parse({ mode: 'invoice', batchSize: 10, extra: true })).toThrow();
    });

    it('validates run params id format', () => {
      expect(SistemNaplateRunParamsDto.parse({ id: 'sn_1' })).toEqual({ id: 'sn_1' });
      expect(() => SistemNaplateRunParamsDto.parse({ id: 'bad id!' })).toThrow('Invalid workspace id format');
    });
  });
});
