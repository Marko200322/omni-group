/**
 * Integration: assembled config respects NODE_ENV after resetModules.
 */
describe('config index (assembled)', () => {
  const snapshot = { ...process.env };

  afterEach(() => {
    jest.resetModules();
    process.env = { ...snapshot };
  });

  afterAll(() => {
    process.env = snapshot;
  });

  it('sets isDev when NODE_ENV is development', () => {
    process.env = { ...snapshot, NODE_ENV: 'development' };
    jest.resetModules();
    const { config } = require('../../config');
    expect(config.app.isDev).toBe(true);
    expect(config.app.isProd).toBe(false);
  });

  it('sets isProd when NODE_ENV is production', () => {
    process.env = {
      ...snapshot,
      NODE_ENV: 'production',
      JWT_SECRET: 'unit-test-production-jwt-secret-min-32-chars',
      JWT_REFRESH_SECRET: 'unit-test-production-refresh-secret-min-32',
      DB_PASSWORD: 'unit-test-production-db-password-not-default',
      ADMIN_PASSWORD: 'UnitTestAdmin@NotDefault123',
    };
    jest.resetModules();
    const { config } = require('../../config');
    expect(config.app.isDev).toBe(false);
    expect(config.app.isProd).toBe(true);
  });
});
