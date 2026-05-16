import { TitanScoreModule } from '../../modules/titan-score/titan-score.module';

describe('TitanScoreModule', () => {
  it('initialize registers routes', async () => {
    const m = new TitanScoreModule();
    await m.initialize();
    expect(m.router).toBeDefined();
    expect(m.slug).toBe('titan-score');
  });
});
