import { OutreachModule } from '../../modules/outreach/outreach.module';

describe('OutreachModule', () => {
  it('initialize registers routes', async () => {
    const m = new OutreachModule();
    await m.initialize();
    expect(m.router).toBeDefined();
  });
});
