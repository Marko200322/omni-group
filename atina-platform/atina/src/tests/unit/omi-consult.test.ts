import { generateAgentReply } from '../../modules/video-meetings/providers/avatar-ai-chat.provider';
import { buildOmiVerifiedContext, sanitizeOmiPageContext } from '../../modules/omi/omi-page-context';
import { formatOmiAdvisorReply, recommendOmiProducts } from '../../modules/omi/omi-recommend';
import {
  buildOmiConversationState,
  extractOmiConsultFacts,
} from '../../modules/omi/omi-consult';

jest.mock('../../integrations', () => ({
  getAiClient: () => ({ isConfigured: () => false }),
}));

async function publicOmi(message: string, history: Array<{ role: 'user' | 'assistant'; content: string }> = []) {
  const prior = history.filter((h) => h.role === 'user').map((h) => h.content);
  const verifiedContext = buildOmiVerifiedContext(message, sanitizeOmiPageContext({}), prior);
  return generateAgentReply({
    agentType: 'support',
    systemPersona: '',
    history,
    userMessage: message,
    audience: 'public',
    verifiedContext,
  });
}

describe('OMI consult loop', () => {
  it('A: investigates why they want a website instead of dumping a SKU', async () => {
    const rec = recommendOmiProducts({ message: 'I need a new website.' });
    expect(rec.consultStage).toBe('discover');
    const out = await publicOmi('I need a new website.');
    expect(out.content).toMatch(/before I point you toward a package|bottleneck|design, not enough customers|conversion/i);
    expect(out.content).not.toMatch(/Verified Omni packages:/i);
  });

  it('B: treats high traffic / no purchases as conversion, not a rebuild', async () => {
    const out = await publicOmi('Our website gets 10,000 visitors but hardly anyone buys.');
    expect(out.content).toMatch(/conversion/i);
    expect(out.content).not.toMatch(/I would consider website-business/i);
  });

  it('C: investigates the workflow and can price labour when figures exist', () => {
    const facts = extractOmiConsultFacts(
      'Two employees spend around 200 hours per month copying orders. Loaded cost is €30 per hour.',
    );
    expect(facts.hoursPerMonth).toBe(200);
    expect(facts.hourlyEur).toBe(30);
    expect(facts.loadedLabourYearEur).toBe(72000);
    const rec = recommendOmiProducts({
      message:
        'Our employees spend all day copying data. Two people, 200 hours per month, €30 per hour.',
    });
    expect(rec.budgetEur).toBeUndefined();
    expect(rec.consultStage).toBe('diagnose');
    const reply = formatOmiAdvisorReply(rec);
    expect(reply).toMatch(/72,000|72000/);
    expect(reply).toMatch(/illustrative|estimate/i);
    expect(reply).not.toMatch(/guaranteed savings|we will save/i);
  });

  it('D: does not immediately recommend marketing for "we need more customers"', async () => {
    const rec = recommendOmiProducts({ message: 'We need more customers.' });
    expect(rec.consultStage).toBe('discover');
    const out = await publicOmi('We need more customers.');
    expect(out.content).toMatch(/will not jump to a marketing package|acquisition, conversion/i);
    expect(out.content).not.toMatch(/lead-gen-retainer/i);
  });

  it('E: starts structured discovery when everything is a mess', async () => {
    const out = await publicOmi("I don't know what we need. Everything is a mess.");
    expect(out.content).toMatch(/without a package name|work backwards|time, money/i);
  });

  it('F: investigates custom before routing to custom', async () => {
    const out = await publicOmi('We need something custom.');
    expect(out.content).toMatch(/requirement first|standard Omni package/i);
  });

  it('G: reassesses when the visitor rejects a package', async () => {
    const out = await publicOmi('Your package doesn\'t solve my problem.');
    expect(out.content).toMatch(/drop that package assumption|rebuild the problem/i);
  });

  it('does not treat already-stated headcount as missing context', () => {
    const rec = recommendOmiProducts({
      message:
        'We have 25 employees. They spend 200 hours per month copying orders between Excel and the shop at €30 per hour. What should I buy?',
    });
    expect(extractOmiConsultFacts(rec.sourceMessage).employees).toBe(25);
    expect(rec.consultStage).toBe('recommend');
    expect(formatOmiAdvisorReply(rec)).not.toMatch(/how many employees/i);
  });

  it('H: maps multiple problems without forcing every SKU', () => {
    const rec = recommendOmiProducts({
      message:
        'We lose leads, someone responds manually, and reporting is a mess. I have €2000. What should I buy?',
    });
    expect(rec.consultStage).toBe('recommend');
    expect(rec.problems.length).toBeGreaterThan(1);
    expect(rec.problems).toContain('manual data transfer');
    const reply = formatOmiAdvisorReply(rec);
    expect(reply).toMatch(/Do not buy all of them|Separate issues|would not automatically/i);
  });
});

describe('OMI multi-turn conversation intelligence', () => {
  const t1 = 'I need a new website.';
  const t2 = 'Poor conversion. People land and bounce.';
  const t3 =
    'Actually it is sales follow-up — leads come in and nobody calls them back.';
  const t4 = 'We spend about 40 hours a month on this at €25 per hour.';
  const t5 = 'What should I buy?';
  const t6 = "No that's not right — that package doesn't solve it.";
  const t7 = 'Forget that. Our real issue now is reporting — no operational visibility.';

  it('tracks state across website → conversion → follow-up correction → hours → buy → reject → reporting switch', () => {
    const s1 = buildOmiConversationState([], t1);
    expect(s1.intent).toBe('other');
    expect(recommendOmiProducts({ message: t1 }).consultStage).toBe('discover');

    const s2 = buildOmiConversationState([t1], t2);
    expect(s2.activeThread).toMatch(/conversion|bounce/i);
    const r2 = recommendOmiProducts({ message: t2, priorUserMessages: [t1] });
    expect(r2.consultStage).toBe('diagnose');
    expect(formatOmiAdvisorReply(r2)).toMatch(/conversion/i);
    expect(formatOmiAdvisorReply(r2)).not.toMatch(/I would consider website-business/i);

    const s3 = buildOmiConversationState([t1, t2], t3);
    expect(s3.intent).toBe('correct');
    expect(s3.rejectedAssumptions.length).toBeGreaterThan(0);
    expect(s3.problems).toContain('missed inquiries');
    expect(s3.problems).not.toContain('traffic without conversion');
    const r3 = recommendOmiProducts({ message: t3, priorUserMessages: [t1, t2] });
    expect(formatOmiAdvisorReply(r3)).toMatch(/revis|follow-up|missed inquiries|response process/i);
    expect(formatOmiAdvisorReply(r3)).not.toMatch(/I would consider website-business/i);

    const s4 = buildOmiConversationState([t1, t2, t3], t4);
    expect(s4.facts.hoursPerMonth).toBe(40);
    expect(s4.facts.hourlyEur).toBe(25);
    expect(s4.facts.loadedLabourYearEur).toBe(40 * 25 * 12);
    const r4 = recommendOmiProducts({ message: t4, priorUserMessages: [t1, t2, t3] });
    expect(r4.budgetEur).toBeUndefined();
    expect(r4.conversation?.facts.loadedLabourYearEur).toBe(12000);
    expect(formatOmiAdvisorReply(r4)).toMatch(/12,000|12000/);

    const s5 = buildOmiConversationState([t1, t2, t3, t4], t5);
    expect(s5.intent).toBe('buy');
    expect(s5.enoughInfo).toBe(true);
    const r5 = recommendOmiProducts({ message: t5, priorUserMessages: [t1, t2, t3, t4] });
    expect(r5.consultStage).toBe('recommend');
    expect(r5.problems).toContain('missed inquiries');
    expect(r5.products[0]?.id).not.toBe('website-business');
    expect(['sales-enablement', 'lead-gen-retainer', 'landing', 'ai-support-retainer']).toContain(
      r5.products[0]?.id,
    );
    const buyReply = formatOmiAdvisorReply(r5);
    expect(buyReply).toMatch(/12,000|12000|follow-up/i);
    expect(buyReply).not.toMatch(/I would consider website-business/i);

    const s6 = buildOmiConversationState([t1, t2, t3, t4, t5], t6);
    expect(s6.intent).toBe('deny');
    const r6 = recommendOmiProducts({ message: t6, priorUserMessages: [t1, t2, t3, t4, t5] });
    expect(r6.consultStage).toBe('discover');
    expect(formatOmiAdvisorReply(r6)).toMatch(/drop that package assumption|rebuild the problem/i);

    const s7 = buildOmiConversationState([t1, t2, t3, t4, t5, t6], t7);
    expect(s7.topicDropped).toBe(true);
    expect(s7.problems).toContain('poor reporting / no operational visibility');
    expect(s7.facts.hoursPerMonth).toBeUndefined();
    expect(s7.rejectedAssumptions.length).toBeGreaterThan(0);
    const r7 = recommendOmiProducts({
      message: t7,
      priorUserMessages: [t1, t2, t3, t4, t5, t6],
    });
    expect(r7.problems).toContain('poor reporting / no operational visibility');
    expect(r7.problems).not.toContain('missed inquiries');
    expect(formatOmiAdvisorReply(r7)).toMatch(/reporting|visibility|drop|revis|thread/i);
    expect(formatOmiAdvisorReply(r7)).not.toMatch(/12,000|12000/);
  });

  it('handles short continuity replies against prior state', () => {
    const prior = [
      'People copy orders between Excel and the shop about 80 hours a month.',
      'Loaded cost is €40 per hour.',
    ];
    const yes = recommendOmiProducts({ message: 'Exactly.', priorUserMessages: prior });
    expect(yes.conversation?.intent).toBe('affirm');
    expect(yes.conversation?.facts.loadedLabourYearEur).toBe(80 * 40 * 12);
    expect(formatOmiAdvisorReply(yes)).not.toMatch(/how many hours/i);

    const howMuch = recommendOmiProducts({ message: 'How much?', priorUserMessages: prior });
    expect(howMuch.conversation?.intent).toBe('price');
    expect(howMuch.consultStage).toBe('recommend');

    const forget = recommendOmiProducts({
      message: 'Forget that.',
      priorUserMessages: prior,
    });
    expect(forget.conversation?.topicDropped).toBe(true);
    expect(forget.consultStage).toBe('discover');
    expect(formatOmiAdvisorReply(forget)).toMatch(/dropped|new bottleneck/i);
  });
});
