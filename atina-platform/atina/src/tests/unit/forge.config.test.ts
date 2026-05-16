import path from 'path';
import { resolveForgeVaultPath } from '../../config';

describe('resolveForgeVaultPath', () => {
  it('returns default path when unset', () => {
    expect(resolveForgeVaultPath()).toBe(path.resolve(process.cwd(), 'data', 'vault.db'));
  });

  it('resolves relative paths against cwd', () => {
    expect(resolveForgeVaultPath('data/custom-vault.db')).toBe(path.resolve(process.cwd(), 'data', 'custom-vault.db'));
  });

  it('throws clear error when value is empty', () => {
    expect(() => resolveForgeVaultPath('   ')).toThrow('FORGE_VAULT_PATH is set but empty');
  });

  it('throws clear error when extension is not .db', () => {
    expect(() => resolveForgeVaultPath('data/vault.sqlite')).toThrow('must point to a .db SQLite file');
  });
});
