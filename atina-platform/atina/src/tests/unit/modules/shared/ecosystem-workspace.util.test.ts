import { mergeWorkflowHuntingInput } from '../../../../modules/shared/ecosystem-workspace.util';

describe('mergeWorkflowHuntingInput', () => {
  it('merges hunting fields from workflow input into step config', () => {
    const merged = mergeWorkflowHuntingInput(
      { revenueEstimate: 50, intensity: 25 },
      { verticalSlug: 'marketing', intensity: 60, category: 'marketing' }
    );
    expect(merged).toMatchObject({
      revenueEstimate: 50,
      verticalSlug: 'marketing',
      intensity: 60,
      category: 'marketing',
    });
  });

  it('keeps step config when input omits hunting fields', () => {
    const merged = mergeWorkflowHuntingInput({ revenueEstimate: 90 }, {});
    expect(merged).toEqual({ revenueEstimate: 90 });
  });
});
