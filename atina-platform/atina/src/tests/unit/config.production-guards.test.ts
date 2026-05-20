describe('config production guards', () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
    jest.resetModules();
  });

  function loadConfigWith(env: Record<string, string | undefined>) {
    jest.resetModules();
    process.env = { ...envBackup, ...env, NODE_ENV: 'production' };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('../../config/index');
  }

  it('rejects placeholder JWT_SECRET', () => {
    expect(() =>
      loadConfigWith({
        JWT_SECRET: 'change-me-in-production',
        JWT_REFRESH_SECRET: 'x'.repeat(32),
        DB_PASSWORD: 'secure-db',
        ADMIN_PASSWORD: 'secure-admin',
      })
    ).toThrow('JWT_SECRET');
  });

  it('rejects short JWT_REFRESH_SECRET', () => {
    expect(() =>
      loadConfigWith({
        JWT_SECRET: 'x'.repeat(32),
        JWT_REFRESH_SECRET: 'short',
        DB_PASSWORD: 'secure-db',
        ADMIN_PASSWORD: 'secure-admin',
      })
    ).toThrow('JWT_REFRESH_SECRET');
  });

  it('rejects default DB_PASSWORD', () => {
    expect(() =>
      loadConfigWith({
        JWT_SECRET: 'x'.repeat(32),
        JWT_REFRESH_SECRET: 'y'.repeat(32),
        DB_PASSWORD: 'atina_password',
        ADMIN_PASSWORD: 'secure-admin',
      })
    ).toThrow('DB_PASSWORD');
  });

  it('rejects default ADMIN_PASSWORD', () => {
    expect(() =>
      loadConfigWith({
        JWT_SECRET: 'x'.repeat(32),
        JWT_REFRESH_SECRET: 'y'.repeat(32),
        DB_PASSWORD: 'secure-db',
        ADMIN_PASSWORD: 'Admin@123456',
      })
    ).toThrow('ADMIN_PASSWORD');
  });
});
