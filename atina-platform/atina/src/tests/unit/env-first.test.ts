import { envFirst } from '../../config/env-first';

describe('envFirst', () => {
  const backup = process.env.TEST_ENV_FIRST_A;

  afterEach(() => {
    if (backup === undefined) delete process.env.TEST_ENV_FIRST_A;
    else process.env.TEST_ENV_FIRST_A = backup;
    delete process.env.TEST_ENV_FIRST_B;
  });

  it('returns first non-empty trimmed value', () => {
    process.env.TEST_ENV_FIRST_A = '  hello  ';
    process.env.TEST_ENV_FIRST_B = 'second';
    expect(envFirst('TEST_ENV_FIRST_MISSING', 'TEST_ENV_FIRST_A', 'TEST_ENV_FIRST_B')).toBe('hello');
  });

  it('returns empty string when no keys match', () => {
    expect(envFirst('TEST_ENV_FIRST_MISSING')).toBe('');
  });
});
