import fs from 'fs';
import os from 'os';
import path from 'path';
import { applyEnvAggregator } from '../../config/apply-env-aggregator';

describe('applyEnvAggregator', () => {
  let tmpRoot: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'atina-env-agg-'));
    fs.mkdirSync(path.join(tmpRoot, 'config'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpRoot, 'config', 'env-aggregator.json'),
      JSON.stringify({
        atina: { SAMPLE_AGG_KEY: 'from-file', _comment: 'skip' },
        nest: {},
        bad: 'not-object',
      })
    );
    process.chdir(tmpRoot);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpRoot, { recursive: true, force: true });
    delete process.env.SAMPLE_AGG_KEY;
  });

  it('applies keys from section when not already in process.env', () => {
    applyEnvAggregator('atina');
    expect(process.env.SAMPLE_AGG_KEY).toBe('from-file');
  });

  it('does not override existing env values', () => {
    process.env.SAMPLE_AGG_KEY = 'preset';
    applyEnvAggregator('atina');
    expect(process.env.SAMPLE_AGG_KEY).toBe('preset');
  });

  it('no-ops when config file is missing', () => {
    fs.unlinkSync(path.join(tmpRoot, 'config', 'env-aggregator.json'));
    expect(() => applyEnvAggregator('atina')).not.toThrow();
  });

  it('no-ops for invalid section shape', () => {
    expect(() => applyEnvAggregator('nest')).not.toThrow();
  });

  it('skips null values and underscore-prefixed keys', () => {
    fs.writeFileSync(
      path.join(tmpRoot, 'config', 'env-aggregator.json'),
      JSON.stringify({ atina: { _skip: 'x', KEEP: 'yes', EMPTY: null } })
    );
    applyEnvAggregator('atina');
    expect(process.env.KEEP).toBe('yes');
    expect(process.env._skip).toBeUndefined();
    expect(process.env.EMPTY).toBeUndefined();
    delete process.env.KEEP;
  });
});
