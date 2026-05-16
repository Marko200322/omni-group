import {
  CreateValidatorDto,
  RunValidatorDto,
  ValidatorRunParamsDto,
  ValidatorStatusDto,
} from '../../modules/validator/dto/validator.dto';

describe('Validator DTOs', () => {
  describe('CreateValidatorDto', () => {
    it('accepts minimal valid input with defaults', () => {
      const parsed = CreateValidatorDto.parse({ name: 'abc' });
      expect(parsed).toMatchObject({
        name: 'abc',
        budgetAllocated: 0,
        profile: 'balanced',
      });
    });

    it('rejects name shorter than 3 chars', () => {
      expect(() => CreateValidatorDto.parse({ name: 'ab' })).toThrow();
    });

    it('rejects non-finite budgetAllocated', () => {
      expect(() =>
        CreateValidatorDto.parse({ name: 'abc', budgetAllocated: Number.NaN })
      ).toThrow();
    });

    it('rejects strict unknown keys', () => {
      expect(() =>
        CreateValidatorDto.parse({ name: 'abc', extra: true } as Record<string, unknown>)
      ).toThrow();
    });
  });

  describe('RunValidatorDto', () => {
    it('applies defaults', () => {
      const parsed = RunValidatorDto.parse({});
      expect(parsed).toMatchObject({
        mode: 'validate',
        intensity: 25,
      });
    });

    it('treats undefined/null body like empty object', () => {
      expect(RunValidatorDto.parse(undefined)).toMatchObject({ mode: 'validate', intensity: 25 });
      expect(RunValidatorDto.parse(null)).toMatchObject({ mode: 'validate', intensity: 25 });
    });

    it('rejects strict unknown keys', () => {
      expect(() => RunValidatorDto.parse({ extra: 1 } as Record<string, unknown>)).toThrow();
    });

    it('rejects intensity out of range', () => {
      expect(() => RunValidatorDto.parse({ intensity: 0 })).toThrow();
      expect(() => RunValidatorDto.parse({ intensity: 101 })).toThrow();
    });

    it('rejects invalid mode', () => {
      expect(() => RunValidatorDto.parse({ mode: 'hack' })).toThrow();
    });
  });

  describe('ValidatorRunParamsDto', () => {
    it('accepts alphanumeric id with underscore', () => {
      expect(ValidatorRunParamsDto.parse({ id: 'ws_1' })).toEqual({ id: 'ws_1' });
    });

    it('rejects id with invalid characters', () => {
      expect(() => ValidatorRunParamsDto.parse({ id: 'a b' })).toThrow();
    });

    it('rejects empty id after trim', () => {
      expect(() => ValidatorRunParamsDto.parse({ id: '  ' })).toThrow();
    });
  });

  describe('ValidatorStatusDto', () => {
    it('parses valid status payload', () => {
      const data = {
        modes: ['validate', 'sanitize', 'enrich'],
        activeMode: 'validate',
        pipelineCapacity: { maxItemsPerRun: 750, cooldownSeconds: 20 },
      };
      expect(() => ValidatorStatusDto.parse(data)).not.toThrow();
    });
  });
});
