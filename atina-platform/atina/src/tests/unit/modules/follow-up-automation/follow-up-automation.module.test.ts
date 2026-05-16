import { FollowUpAutomationModule } from '../../../../modules/follow-up-automation/follow-up-automation.module';

describe('FollowUpAutomationModule', () => {
  it('initialize registers routes', async () => {
    const m = new FollowUpAutomationModule();
    await m.initialize();
    expect(m.router).toBeDefined();
    expect(m.slug).toBe('follow-up-automation');
  });
});
