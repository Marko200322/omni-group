import { ContractsModule } from '../../../../modules/contracts/contracts.module';

describe('ContractsModule', () => {
  it('initialize registers router and routes', async () => {
    const m = new ContractsModule();
    await m.initialize();
    expect(m.router).toBeDefined();
  });

  it('exposes module metadata for registry', () => {
    const m = new ContractsModule();
    expect(m.name).toBe('Contracts');
    expect(m.slug).toBe('contracts');
    expect(m.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(m.isCore).toBe(false);
    expect(m.requiredPlan).toBe('pro');
  });
});
