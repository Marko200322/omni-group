import { AuthModule } from '../../modules/auth/auth.module';

describe('AuthModule', () => {
  it('initialize registers routes', async () => {
    const m = new AuthModule();
    await m.initialize();
    expect(m.router).toBeDefined();
    expect(m.slug).toBe('auth');
  });
});
