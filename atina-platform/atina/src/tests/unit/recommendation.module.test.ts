import { RecommendationModule } from '../../modules/recommendation/recommendation.module';

describe('RecommendationModule', () => {
  it('initialize registers routes', async () => {
    const m = new RecommendationModule();
    await m.initialize();
    expect(m.router).toBeDefined();
    expect(m.slug).toBe('recommendation');
    expect(m.requiredPlan).toBe('pro');
    expect(m.isCore).toBe(false);
    expect(m.name).toBe('Recommendation Module');
    expect(m.version).toBe('1.0.0');
  });
});
