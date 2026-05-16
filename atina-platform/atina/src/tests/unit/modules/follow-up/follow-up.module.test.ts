import { FollowUpModule } from '../../../../modules/follow-up/follow-up.module';

describe('FollowUpModule', () => {
  it('initialize registers routes', async () => {
    const m = new FollowUpModule();
    await m.initialize();
    expect(m.router).toBeDefined();
  });
});
