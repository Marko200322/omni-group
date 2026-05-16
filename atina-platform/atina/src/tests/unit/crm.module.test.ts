import { CrmModule } from '../../modules/crm/crm.module';

describe('CrmModule', () => {
  it('initialize registers routes', async () => {
    const m = new CrmModule();
    await m.initialize();
    expect(m.router).toBeDefined();
  });

  it('exposes registry metadata', () => {
    const m = new CrmModule();
    expect(m.slug).toBe('crm');
    expect(m.name).toBe('CRM');
    expect(m.isCore).toBe(false);
    expect(m.requiredPlan).toBe('pro');
  });
});
