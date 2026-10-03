import { formatOmiAdvisorReply, recommendOmiProducts } from '../../modules/omi/omi-recommend';
import { extractOmiConsultFacts } from '../../modules/omi/omi-consult';
import { classifyOmiProblems } from '../../modules/omi/omi-problem-model';

describe('OMI semantic problem classification', () => {
  it.each([
    'Employees do this manually.',
    'Employees do this manually every day.',
    'We enter the same information by hand.',
    'People copy data between systems.',
    'We manually move orders from one system to another.',
    'Staff repeatedly enter information.',
    'Copy and paste between Excel and the shop.',
  ])('maps “%s” to REPETITIVE_MANUAL_WORK', (message) => {
    expect(classifyOmiProblems(message).concepts).toContain('REPETITIVE_MANUAL_WORK');
  });

  it('maps disconnected systems to INTEGRATION capability', () => {
    const c = classifyOmiProblems("Our CRM and ERP don't communicate.");
    expect(c.concepts).toContain('SYSTEMS_NOT_CONNECTED');
    expect(c.capabilities).toContain('integration');
  });

  it('maps copy-between-systems to manual work plus integration/workflow capability', () => {
    const c = classifyOmiProblems('People copy data between systems.');
    expect(c.concepts).toContain('REPETITIVE_MANUAL_WORK');
    expect(c.capabilities.some((cap) => cap === 'integration' || cap === 'workflow_automation')).toBe(
      true,
    );
  });

  it('maps manual order transfer to manual work plus integration', () => {
    const c = classifyOmiProblems('We manually move orders from one system to another.');
    expect(c.concepts).toContain('REPETITIVE_MANUAL_WORK');
    expect(c.capabilities).toContain('integration');
  });

  it('does not immediately treat more customers as a marketing SKU', () => {
    const rec = recommendOmiProducts({ message: 'We need more customers.' });
    expect(rec.consultStage).toBe('discover');
    expect(rec.products[0]?.id).not.toBe('lead-gen-retainer');
    expect(formatOmiAdvisorReply(rec)).not.toMatch(/lead-gen-retainer/i);
  });

  it('treats traffic with few purchases as conversion investigation', () => {
    const rec = recommendOmiProducts({
      message: 'We get lots of traffic but few purchases.',
    });
    expect(rec.problems).toContain('traffic without conversion');
    expect(rec.consultStage).toBe('diagnose');
    expect(formatOmiAdvisorReply(rec)).toMatch(/conversion/i);
    expect(formatOmiAdvisorReply(rec)).not.toMatch(/I would consider website-business/i);
  });
});

describe('OMI solution mapping', () => {
  const scenarioC = [
    'We spend 200 hours per month doing this manually.',
    'Loaded cost is €30 per hour.',
    'What should I buy?',
  ].join('\n');

  it('C follow-up buy prefers automation/integration over a portal bundle', () => {
    const rec = recommendOmiProducts({ message: scenarioC });
    const facts = extractOmiConsultFacts(rec.sourceMessage);
    expect(rec.consultStage).toBe('recommend');
    expect(rec.budgetEur).toBeUndefined();
    expect(rec.problems).toContain('manual data transfer');
    expect(facts.loadedLabourYearEur).toBe(72000);
    expect(facts.illustrativeSaveYearEur).toBe(21600);
    expect(['integration', 'workflow-design', 'setup-full']).toContain(rec.products[0]?.id);
    expect(rec.products[0]?.id).not.toBe('bundle-portal-presence');
    const reply = formatOmiAdvisorReply(rec);
    expect(reply).toMatch(/72,000|72000/);
    expect(reply).toMatch(/more directly relevant than a general presence or portal package/i);
    expect(reply).toMatch(/addresses the manual transfer itself/i);
    expect(reply).not.toMatch(/guaranteed savings|we will save/i);
    expect(reply).not.toMatch(/bundle-portal-presence/i);
  });

  it('does not hardcode hours to a single SKU — disconnected systems still map to integration', () => {
    const rec = recommendOmiProducts({
      message: "Our CRM and ERP don't communicate. What should I buy?",
    });
    expect(rec.products[0]?.id).toBe('integration');
  });
});
