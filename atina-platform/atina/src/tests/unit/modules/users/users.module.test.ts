import { UsersModule } from '../../../../modules/users/users.module';

describe('UsersModule', () => {
  it('initialize registers routes', async () => {
    const m = new UsersModule();
    await m.initialize();
    expect(m.router).toBeDefined();
  });
});
