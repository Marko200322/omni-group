import { optional, optionalBool, optionalNumber } from '../../config/env';

describe('config/env helpers', () => {
  const snapshot = { ...process.env };

  beforeEach(() => {
    process.env = { ...snapshot };
  });

  afterAll(() => {
    process.env = snapshot;
  });

  describe('optional', () => {
    it('returns env value when set', () => {
      process.env.TEST_OPT_STR = 'from-env';
      expect(optional('TEST_OPT_STR', 'fallback')).toBe('from-env');
    });

    it('returns fallback when unset or empty', () => {
      delete process.env.TEST_OPT_MISSING;
      expect(optional('TEST_OPT_MISSING', 'fb')).toBe('fb');
      process.env.TEST_OPT_EMPTY = '';
      expect(optional('TEST_OPT_EMPTY', 'fb2')).toBe('fb2');
    });
  });

  describe('optionalNumber', () => {
    it('parses integer when env is non-empty', () => {
      process.env.TEST_OPT_NUM = '42';
      expect(optionalNumber('TEST_OPT_NUM', 0)).toBe(42);
    });

    it('returns fallback when unset or empty string', () => {
      delete process.env.TEST_OPT_NUM2;
      expect(optionalNumber('TEST_OPT_NUM2', 7)).toBe(7);
      process.env.TEST_OPT_NUM3 = '';
      expect(optionalNumber('TEST_OPT_NUM3', 8)).toBe(8);
    });

    it('returns NaN when env is non-numeric (parseInt behavior)', () => {
      process.env.TEST_OPT_NUM_BAD = 'not-a-number';
      expect(Number.isNaN(optionalNumber('TEST_OPT_NUM_BAD', 0))).toBe(true);
    });
  });

  describe('optionalBool', () => {
    it('returns fallback when unset', () => {
      delete process.env.TEST_OPT_BOOL;
      expect(optionalBool('TEST_OPT_BOOL', true)).toBe(true);
      expect(optionalBool('TEST_OPT_BOOL2', false)).toBe(false);
    });

    it('returns fallback when empty string', () => {
      process.env.TEST_OPT_BOOL_EMPTY = '';
      expect(optionalBool('TEST_OPT_BOOL_EMPTY', true)).toBe(true);
    });

    it('is true only for case-insensitive "true"', () => {
      process.env.TEST_OPT_BOOL_T = 'true';
      process.env.TEST_OPT_BOOL_T2 = 'TRUE';
      expect(optionalBool('TEST_OPT_BOOL_T', false)).toBe(true);
      expect(optionalBool('TEST_OPT_BOOL_T2', false)).toBe(true);
    });

    it('is false for other non-empty strings', () => {
      process.env.TEST_OPT_BOOL_F = 'false';
      process.env.TEST_OPT_BOOL_X = '0';
      expect(optionalBool('TEST_OPT_BOOL_F', true)).toBe(false);
      expect(optionalBool('TEST_OPT_BOOL_X', true)).toBe(false);
    });
  });
});
