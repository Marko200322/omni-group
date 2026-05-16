import { Test, TestingModule } from '@nestjs/testing';
import { PhaseService } from './phase.service';

describe('PhaseService', () => {
  let moduleRef: TestingModule;
  let service: PhaseService;
  let envPhaseSnapshot: string | undefined;

  beforeEach(() => {
    envPhaseSnapshot = process.env.PHASE;
  });

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [PhaseService],
    }).compile();

    service = moduleRef.get(PhaseService);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    if (envPhaseSnapshot === undefined) {
      delete process.env.PHASE;
    } else {
      process.env.PHASE = envPhaseSnapshot;
    }
    await moduleRef.close();
  });

  describe('getPhase', () => {
    it('defaults to v1 when PHASE is unset', () => {
      delete process.env.PHASE;
      expect(service.getPhase()).toBe('v1');
    });

    it('uses explicit PHASE from env', () => {
      process.env.PHASE = 'v2';
      expect(service.getPhase()).toBe('v2');
    });
  });

  describe('isBillingEnabled', () => {
    it.each([
      ['v1', false],
      ['v2', false],
      ['v3', true],
      ['v4', true],
      ['v5', true],
      ['v6', true],
    ] as const)('when getPhase returns %s → %s', (phase, expected) => {
      jest.spyOn(service, 'getPhase').mockReturnValue(phase);
      expect(service.isBillingEnabled()).toBe(expected);
    });

    it('returns true for v6-prefixed phases', () => {
      jest.spyOn(service, 'getPhase').mockReturnValue('v6-next');
      expect(service.isBillingEnabled()).toBe(true);
    });

    it('returns false for unknown higher tags', () => {
      jest.spyOn(service, 'getPhase').mockReturnValue('v7');
      expect(service.isBillingEnabled()).toBe(false);
    });
  });

  describe('isAiEnabled', () => {
    it.each([
      ['v1', false],
      ['v2', false],
      ['v3', true],
      ['v4', true],
      ['v5', true],
      ['v6', true],
    ] as const)('when getPhase returns %s → %s', (phase, expected) => {
      jest.spyOn(service, 'getPhase').mockReturnValue(phase);
      expect(service.isAiEnabled()).toBe(expected);
    });

    it('returns true for v6-prefixed phases', () => {
      jest.spyOn(service, 'getPhase').mockReturnValue('v6-next');
      expect(service.isAiEnabled()).toBe(true);
    });

    it('returns false for unknown higher tags', () => {
      jest.spyOn(service, 'getPhase').mockReturnValue('v7');
      expect(service.isAiEnabled()).toBe(false);
    });
  });

  describe('integration with process.env', () => {
    it('defaults unset PHASE to v1 with flags off', () => {
      delete process.env.PHASE;
      expect(service.getPhase()).toBe('v1');
      expect(service.isBillingEnabled()).toBe(false);
      expect(service.isAiEnabled()).toBe(false);
    });

    it('drives flags from env without mocking getPhase', () => {
      process.env.PHASE = 'v3';
      expect(service.getPhase()).toBe('v3');
      expect(service.isBillingEnabled()).toBe(true);
      expect(service.isAiEnabled()).toBe(true);
    });
  });
});
