import { LeadScoringModule } from '../../modules/lead-scoring/lead-scoring.module';

describe('LeadScoringModule', () => {
  it('initialize registers routes', async () => {
    const m = new LeadScoringModule();
    await m.initialize();
    expect(m.router).toBeDefined();
  });
});
