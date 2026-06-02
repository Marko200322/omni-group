import { parseRecommendationsFromContent } from '../../integrations/openrouter-direct';

describe('parseRecommendationsFromContent', () => {
  it('parses JSON recommendations', () => {
    const content = 'Here you go:\n{"recommendations":["CRM for clinics","Automated billing","AI triage"]}';
    expect(parseRecommendationsFromContent(content)).toEqual([
      'CRM for clinics',
      'Automated billing',
      'AI triage',
    ]);
  });

  it('falls back to bullet lines', () => {
    const content = '1. Vertical CRM\n- Automated invoicing\n* AI support bot';
    expect(parseRecommendationsFromContent(content)).toEqual([
      'Vertical CRM',
      'Automated invoicing',
      'AI support bot',
    ]);
  });

  it('returns empty for blank content', () => {
    expect(parseRecommendationsFromContent('   ')).toEqual([]);
  });
});
