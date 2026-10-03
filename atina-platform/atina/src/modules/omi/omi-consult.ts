import { classifyOmiProblems, type OmiProblemClassification } from './omi-problem-model';

export type OmiConsultStage = 'page' | 'discover' | 'diagnose' | 'recommend' | 'unavailable';

export type OmiConsultProduct = {
  id: string;
  name: string;
  priceEur: number;
  billing: string;
  description: string;
  exclusions?: string;
  why?: string;
  href: string;
};

export type OmiConsultResultView = {
  understood?: string;
  problems: string[];
  products: OmiConsultProduct[];
  saasFocus?: boolean;
  catalogFocus?: boolean;
  noSuitable: boolean;
  confidence: 'high' | 'medium' | 'low';
  budgetEur?: number;
  consultStage?: OmiConsultStage;
  conversation?: OmiConversationState;
};

export type OmiConsultFacts = {
  employees?: number;
  hoursPerMonth?: number;
  hourlyEur?: number;
  leadsPerMonth?: number;
  visitorsPerMonth?: number;
  loadedLabourYearEur?: number;
  illustrativeSaveYearEur?: number;
};

export type OmiUserIntent =
  | 'affirm'
  | 'deny'
  | 'correct'
  | 'price'
  | 'drop_topic'
  | 'switch_topic'
  | 'buy'
  | 'provide_facts'
  | 'other';

export type OmiConversationState = {
  lastMessage: string;
  priorMessages: string[];
  /** Text used for problem classification after drops/corrections. */
  activeThread: string;
  /** Full text since last hard topic reset (facts may span turns). */
  factThread: string;
  intent: OmiUserIntent;
  problems: string[];
  hypotheses: string[];
  evidence: string[];
  rejectedAssumptions: string[];
  answeredQuestions: string[];
  unansweredQuestions: string[];
  facts: OmiConsultFacts;
  rejectedPackages: string[];
  confirmedBottleneck: boolean;
  enoughInfo: boolean;
  topicDropped: boolean;
  classified: OmiProblemClassification;
};

const THIN_WEBSITE =
  /\b(need|want|treba|trebam|želim|zelim).{0,40}\b(website|web site|sajt|stranicu)|new website|novi sajt|redesign (the )?site\b/i;
const THIN_AUTOMATION =
  /\b(need|want|treba).{0,40}\b(automation|automatiz)|sve (je )?ru[cč]no|everything is manual|copying (data|information)|prepisuj/i;
const THIN_CUSTOMERS =
  /\b(need|want|treba).{0,40}\b(more customers|vi[sš]e kupac|vi[sš]e klijen)|we need more sales|treba nam vi[sš]e prodaj/i;
const THIN_CUSTOM = /\b(custom|bespoke|po meri|ne[sš]to custom|something custom)\b/i;
const THIN_MESS =
  /\b(don'?t know what we need|ne znam (sta|šta) nam treba|everything is a mess|sve je haos|sve je nered)\b/i;
const REASSESS =
  /\b(not the (actual )?problem|that'?s not (it|the problem|right)|doesn'?t solve|does not solve|ne re[sš]ava|nije to problem|pogre[sš]an paket|no that'?s not right)\b/i;
const EXPLICIT_BUY =
  /\b(what should i buy|šta mi preporu[cč]uje[sš]|sta mi preporucujes|recommend( a package)?|which package|koji paket|koliko ko[sš]ta|how much (is|does)|price of|cena)\b/i;
const CONVERSION_SIGNAL =
  /\b(visitors?|posetilac|posete|traffic).{0,48}\b(buy|convert|kupuj|purchase)|hardly anyone buys|niko ne kupuje|poor conversion|slaba konverzij|few purchases/i;
const HARD_TOPIC_RESET =
  /\b(forget (that|it|this|the previous)|never mind|drop that|let'?s (talk|focus|switch) (about|to|on)|different (problem|topic|thread)|switch(ing)? (topics?|to)|real issue now|something else entirely|new (problem|topic)|forget the .{0,40}\b)\b/i;
const SOFT_CORRECTION =
  /\b(actually|in fact|correction:|i meant|not (really )?that|the (real|actual) problem is|it'?s (really |actually )?(sales|follow[- ]?up|reporting|leads?|manual|integration))\b/i;
const AFFIRM_SHORT =
  /^(yeah|yes|yep|yup|exactly|correct|right|sure|ok|okay|that'?s (it|right|correct)|sounds right|tacno|ta[cč]no|jes|da)\b/i;
const DENY_SHORT = /^(no|nope|not really|not quite|nah|ne)\b/i;
const PRICE_SHORT = /^(how much|koliko( ko[sš]ta)?|price|cena)\??$/i;
const BUY_SHORT = /^(what should i buy|which package|koji paket)\??$/i;

export function extractOmiConsultFacts(text: string): OmiConsultFacts {
  const t = text.replace(/,/g, '');
  const employees = firstNum(t, /(\d{1,4})\s*(employees?|staff|people|zaposlen|ljudi)\b/i);
  const hoursPerMonth =
    firstNum(t, /(\d{1,5})\s*(hours?|sati)\s*(a|per|\/|mese[cč]no|monthly|month)/i) ??
    firstNum(t, /(\d{1,5})\s*hours?\s+.{0,20}(month|mese)/i);
  const hourlyEur =
    firstNum(t, /(?:€|eur)\s*(\d{1,4})\s*(?:\/|per|an)\s*hour/i) ??
    firstNum(t, /(\d{1,4})\s*(?:€|eur)\s*(?:\/|per)\s*hour/i);
  const leadsPerMonth = firstNum(t, /(\d{1,6})\s*leads?\b/i);
  const visitorsPerMonth = firstNum(t, /(\d{3,8})\s*visitors?\b/i);
  let loadedLabourYearEur: number | undefined;
  let illustrativeSaveYearEur: number | undefined;
  if (hoursPerMonth && hourlyEur) {
    loadedLabourYearEur = hoursPerMonth * hourlyEur * 12;
    illustrativeSaveYearEur = Math.round(loadedLabourYearEur * 0.3);
  }
  return {
    employees,
    hoursPerMonth,
    hourlyEur,
    leadsPerMonth,
    visitorsPerMonth,
    loadedLabourYearEur,
    illustrativeSaveYearEur,
  };
}

export function isThinSolutionAsk(message: string): boolean {
  return (
    THIN_WEBSITE.test(message) ||
    THIN_AUTOMATION.test(message) ||
    THIN_CUSTOMERS.test(message) ||
    THIN_CUSTOM.test(message) ||
    THIN_MESS.test(message)
  );
}

export function detectOmiUserIntent(message: string): OmiUserIntent {
  const t = message.trim();
  if (HARD_TOPIC_RESET.test(t)) return t.length < 48 ? 'drop_topic' : 'switch_topic';
  if (REASSESS.test(t) || DENY_SHORT.test(t)) return 'deny';
  if (SOFT_CORRECTION.test(t)) return 'correct';
  if (PRICE_SHORT.test(t) || /\bhow much\b/i.test(t)) return 'price';
  if (BUY_SHORT.test(t) || EXPLICIT_BUY.test(t)) return 'buy';
  if (AFFIRM_SHORT.test(t)) return 'affirm';
  const facts = extractOmiConsultFacts(t);
  if (
    facts.hoursPerMonth != null ||
    facts.hourlyEur != null ||
    facts.employees != null ||
    facts.leadsPerMonth != null ||
    facts.visitorsPerMonth != null
  ) {
    return 'provide_facts';
  }
  return 'other';
}

function splitCombinedTurns(combined: string): string[] {
  const lines = combined
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length > 1 ? lines : combined.trim() ? [combined.trim()] : [];
}

function buildQuestions(facts: OmiConsultFacts, classified: OmiProblemClassification, thin: boolean): {
  answered: string[];
  unanswered: string[];
} {
  const answered: string[] = [];
  const unanswered: string[] = [];
  if (facts.employees != null) answered.push('headcount');
  if (facts.hoursPerMonth != null) answered.push('hours_per_month');
  else if (
    classified.concepts.includes('REPETITIVE_MANUAL_WORK') ||
    classified.concepts.includes('MISSED_INQUIRIES')
  ) {
    unanswered.push('hours_per_month');
  }
  if (facts.hourlyEur != null) answered.push('hourly_cost');
  else if (facts.hoursPerMonth != null) unanswered.push('hourly_cost');
  if (facts.visitorsPerMonth != null) answered.push('visitors');
  if (classified.labels.length) answered.push('problem_area');
  else if (thin) unanswered.push('bottleneck');
  if (
    classified.concepts.includes('TRAFFIC_WITHOUT_CONVERSION') &&
    !classified.concepts.includes('MISSED_INQUIRIES')
  ) {
    unanswered.push('where_they_drop_off');
  }
  return { answered, unanswered: unanswered.slice(0, 3) };
}

function evidenceFrom(message: string, facts: OmiConsultFacts): string[] {
  const out: string[] = [];
  if (CONVERSION_SIGNAL.test(message)) out.push('conversion_friction');
  if (facts.hoursPerMonth != null) out.push(`${facts.hoursPerMonth}_hours_month`);
  if (facts.hourlyEur != null) out.push(`€${facts.hourlyEur}_per_hour`);
  if (facts.employees != null) out.push(`${facts.employees}_people`);
  if (facts.visitorsPerMonth != null) out.push(`${facts.visitorsPerMonth}_visitors`);
  if (/\bfollow[- ]?up|nobody calls|no one calls|leads come in\b/i.test(message)) {
    out.push('weak_sales_followup');
  }
  if (/\breport|reporting|visibility|pregled\b/i.test(message)) out.push('reporting_gap');
  return out;
}

export function buildOmiConversationState(
  priorUserMessages: string[],
  currentMessage: string,
): OmiConversationState {
  const prior = priorUserMessages.map((m) => m.trim()).filter(Boolean);
  const lastMessage = currentMessage.trim();
  const turns = [...prior, lastMessage].filter(Boolean);
  return buildStateFromTurns(turns);
}

/** Backward-compatible path when callers pass a joined transcript as one string. */
export function buildOmiConversationStateFromCombined(combined: string): OmiConversationState {
  return buildStateFromTurns(splitCombinedTurns(combined));
}

function buildStateFromTurns(turns: string[]): OmiConversationState {
  const lastMessage = turns[turns.length - 1] || '';
  const priorMessages = turns.slice(0, -1);
  const intent = detectOmiUserIntent(lastMessage);

  let hardStart = 0;
  let softStart = 0;
  const rejectedAssumptions: string[] = [];
  const rejectedPackages: string[] = [];

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    const turnIntent = detectOmiUserIntent(turn);
    if (HARD_TOPIC_RESET.test(turn)) {
      hardStart = i;
      softStart = i;
      rejectedAssumptions.length = 0;
      rejectedPackages.length = 0;
      if (i > 0) {
        const dropped = classifyOmiProblems(turns.slice(0, i).join('\n'));
        for (const label of dropped.labels) {
          if (!rejectedAssumptions.includes(label)) rejectedAssumptions.push(label);
        }
      }
    } else if (turnIntent === 'correct' && i > 0) {
      const before = classifyOmiProblems(turns.slice(hardStart, i).join('\n'));
      softStart = i;
      for (const label of before.labels) {
        if (!rejectedAssumptions.includes(label)) rejectedAssumptions.push(label);
      }
    } else if (turnIntent === 'deny' || REASSESS.test(turn)) {
      const before = classifyOmiProblems(turns.slice(softStart, i).join('\n') || turns.slice(hardStart, i).join('\n'));
      for (const label of before.labels) {
        if (!rejectedAssumptions.includes(label)) rejectedAssumptions.push(`rejected:${label}`);
      }
      rejectedPackages.push('last_suggested');
    }
  }

  const topicDropped = HARD_TOPIC_RESET.test(lastMessage);
  const factThread = turns.slice(hardStart).join('\n');
  const activeThread = turns.slice(Math.max(hardStart, softStart)).join('\n') || lastMessage;
  const facts = extractOmiConsultFacts(factThread);
  const classified = classifyOmiProblems(activeThread);
  const problems = classified.labels.filter((l) => !rejectedAssumptions.includes(l));
  const hypotheses = problems.slice(0, 3);
  const evidence = evidenceFrom(activeThread, facts);
  const thin = isThinSolutionAsk(activeThread) || isThinSolutionAsk(lastMessage);
  const { answered, unanswered } = buildQuestions(facts, classified, thin);

  let confirmedBottleneck = false;
  if (intent === 'affirm' && (priorMessages.length > 0 || problems.length > 0)) {
    confirmedBottleneck = true;
  }
  if (intent === 'provide_facts' && problems.length > 0) confirmedBottleneck = true;
  if (intent === 'buy' || intent === 'price') confirmedBottleneck = problems.length > 0;

  const factCount = [facts.employees, facts.hoursPerMonth, facts.hourlyEur, facts.leadsPerMonth, facts.visitorsPerMonth].filter(
    (n) => n != null,
  ).length;
  const enoughInfo =
    (confirmedBottleneck && (factCount >= 1 || problems.length >= 1) && intent === 'buy') ||
    (problems.length >= 1 && factCount >= 2) ||
    (confirmedBottleneck && factCount >= 2) ||
    (intent === 'buy' && problems.length >= 1 && (factCount >= 1 || confirmedBottleneck));

  // Soft correction rejects prior labels that no longer appear.
  const cleanedRejected = rejectedAssumptions.filter((r) => !problems.includes(r.replace(/^rejected:/, '')));

  return {
    lastMessage,
    priorMessages,
    activeThread,
    factThread,
    intent,
    problems,
    hypotheses,
    evidence,
    rejectedAssumptions: cleanedRejected,
    answeredQuestions: answered,
    unansweredQuestions: enoughInfo
      ? []
      : intent === 'affirm'
        ? unanswered.filter((q) => q !== 'bottleneck' && q !== 'where_they_drop_off')
        : unanswered,
    facts,
    rejectedPackages,
    confirmedBottleneck,
    enoughInfo,
    topicDropped,
    classified: {
      ...classified,
      labels: problems,
      concepts: classified.concepts,
    },
  };
}

export function resolveOmiConsultStage(message: string, result: OmiConsultResultView): OmiConsultStage {
  if (result.saasFocus || result.catalogFocus) return 'page';

  const state =
    result.conversation ??
    buildOmiConversationStateFromCombined(message);
  const intent = state.intent;
  const facts = state.facts;
  const factCount = [facts.employees, facts.hoursPerMonth, facts.hourlyEur, facts.leadsPerMonth, facts.visitorsPerMonth].filter(
    (n) => n != null,
  ).length;

  if (intent === 'deny' || REASSESS.test(state.lastMessage)) return 'discover';
  if (state.topicDropped || intent === 'drop_topic') {
    if (state.problems.length === 0) return 'discover';
  }
  if (result.noSuitable) return 'unavailable';
  if (intent === 'correct' && !state.enoughInfo && !EXPLICIT_BUY.test(state.lastMessage)) {
    return state.problems.length ? 'diagnose' : 'discover';
  }
  if (CONVERSION_SIGNAL.test(state.activeThread) && intent !== 'buy' && intent !== 'price' && !EXPLICIT_BUY.test(state.lastMessage)) {
    if (!state.enoughInfo && intent !== 'affirm') return 'diagnose';
  }

  const rich =
    state.problems.length >= 2 ||
    (Boolean(result.budgetEur) && state.problems.length >= 1) ||
    factCount >= 2 ||
    state.enoughInfo;
  if (intent === 'buy' || intent === 'price' || EXPLICIT_BUY.test(state.lastMessage)) return 'recommend';
  if (intent === 'affirm' && state.problems.length >= 1 && factCount >= 2) return 'recommend';
  if (isThinSolutionAsk(state.lastMessage) && !rich && intent === 'other') return 'discover';
  // buy/price already returned above — redundant checks trip TS2367
  if (rich) return 'diagnose';
  if (state.problems.length === 1 && result.confidence !== 'high' && !state.confirmedBottleneck) {
    return 'discover';
  }
  if (result.products.length > 0 && result.confidence === 'high' && state.problems.length) return 'diagnose';
  return 'discover';
}

function firstNum(text: string, re: RegExp): number | undefined {
  const m = text.match(re);
  if (!m) return undefined;
  const n = Number.parseInt(m[1] || '', 10);
  return Number.isFinite(n) ? n : undefined;
}

function followUpsFromState(state: OmiConversationState): string[] {
  if (state.enoughInfo || state.intent === 'buy' || state.intent === 'price') return [];
  const q: string[] = [];
  for (const key of state.unansweredQuestions) {
    if (key === 'bottleneck') {
      q.push('What is currently costing you the most: time, money, missed customers, errors, or visibility?');
    } else if (key === 'hours_per_month') {
      q.push('Roughly how many hours a month does this consume?');
    } else if (key === 'hourly_cost') {
      q.push('What is the approximate loaded hourly cost of the people doing it?');
    } else if (key === 'where_they_drop_off') {
      q.push('Where do visitors drop off today — enquire, buy, or after contact?');
    }
    if (q.length >= 2) break;
  }
  return q;
}

export function formatOmiDiscoveryReply(
  message: string,
  problems: string[],
  state?: OmiConversationState,
): string {
  const s = state ?? buildOmiConversationStateFromCombined(message);
  if (s.intent === 'deny' || REASSESS.test(s.lastMessage)) {
    return 'Understood — I will drop that package assumption. Tell me what is actually going wrong: time, money, customers, errors, or operational friction. We will rebuild the problem from there.';
  }
  if (s.topicDropped || s.intent === 'drop_topic') {
    return 'Understood — previous thread dropped. What is the new bottleneck: time, money, customers, errors, or visibility?';
  }
  if (s.intent === 'switch_topic' || (s.intent === 'correct' && s.rejectedAssumptions.length)) {
    const next = s.problems[0] ? ` Working hypothesis now: ${s.problems[0]}.` : '';
    const ask = followUpsFromState(s)[0];
    return `Got it — revising the diagnosis.${next}${ask ? ` ${ask}` : ' What would a good week look like if this were fixed?'}`;
  }
  if (THIN_WEBSITE.test(s.lastMessage) || (THIN_WEBSITE.test(message) && s.priorMessages.length === 0)) {
    return 'Absolutely, we can help with a website. Before I point you toward a package, I need the bottleneck: is the main issue the current design, not enough customers, poor conversion, outdated technology, speed, trust, or something else?';
  }
  if (CONVERSION_SIGNAL.test(s.lastMessage) || CONVERSION_SIGNAL.test(s.activeThread)) {
    return 'That sounds like a conversion problem, not automatically a rebuild. What happens after someone lands on the site today — can they enquire or buy, and where do they drop off? I will not recommend a new website until we know whether the issue is traffic quality, offer, or the page itself.';
  }
  if (THIN_AUTOMATION.test(s.lastMessage) || /copying (data|information)|prepisuj/i.test(s.lastMessage)) {
    return 'Manual work is usually a process, not a product name. Which workflow eats the time, which systems does it jump between, and roughly how many hours a month? Once I have that, I can tell you whether Omni has a verified package — or that you should not buy one yet.';
  }
  if (THIN_CUSTOMERS.test(s.lastMessage)) {
    return 'More customers can mean acquisition, conversion, follow-up, or retention — those are different problems. How do people find you today, and where do you lose them? I will not jump to a marketing package.';
  }
  if (THIN_CUSTOM.test(s.lastMessage)) {
    return 'Custom work is possible, but I need the requirement first. What should the system do that a standard Omni package would miss? If nothing in the verified catalog fits, I will say so and point you to /contact.';
  }
  if (THIN_MESS.test(s.lastMessage)) {
    return 'We can start without a package name. What is currently costing you the most: time, money, missed customers, errors, or lack of visibility? Answer with one area and we will work backwards.';
  }
  const asks = followUpsFromState(s);
  const hint = (problems.length ? problems : s.problems).length
    ? ` I heard possible issues around ${(problems.length ? problems : s.problems).slice(0, 2).join(' and ')}.`
    : '';
  if (asks.length) {
    return `I want to understand the situation before recommending anything.${hint} ${asks.join(' ')}`;
  }
  return `I want to understand the situation before recommending anything.${hint} In one or two sentences: what breaks today, and what would a good week look like instead?`;
}

export function formatOmiDiagnoseReply(result: OmiConsultResultView, message: string): string {
  const state = result.conversation ?? buildOmiConversationStateFromCombined(message);
  const facts = state.facts;
  const parts: string[] = [];

  if (state.intent === 'correct' || state.rejectedAssumptions.length) {
    parts.push('Updating the working diagnosis from what you just corrected.');
    if (state.rejectedAssumptions.length) {
      parts.push(
        `Setting aside earlier assumptions (${state.rejectedAssumptions
          .map((a) => a.replace(/^rejected:/, ''))
          .slice(0, 2)
          .join(', ')}).`,
      );
    }
  }

  if (result.understood) parts.push(`What I understand: ${result.understood.slice(0, 220)}`);
  const problems = state.problems.length ? state.problems : result.problems;
  if (problems.length) {
    parts.push(`The bottleneck I would test first: ${problems[0]}.`);
    if (problems.length > 1) {
      parts.push(
        `Other issues in play: ${problems.slice(1).join('; ')}. I will not treat them as one package by default.`,
      );
    }
  }

  if (
    CONVERSION_SIGNAL.test(state.activeThread) &&
    !state.problems.includes('missed inquiries') &&
    !state.classified.concepts.includes('MISSED_INQUIRIES')
  ) {
    parts.push(
      'Why this is the bottleneck: traffic without purchase usually means offer, trust, or checkout — not “we need a new website” until those are checked.',
    );
  } else if (state.classified.concepts.includes('MISSED_INQUIRIES')) {
    parts.push(
      'I disagree that a website rebuild is the first fix if leads already arrive and follow-up is weak — that is a response process problem.',
    );
  } else if (state.classified.concepts.includes('POOR_REPORTING')) {
    parts.push(
      'Visibility/reporting is a separate thread from sales or website work; I will not bundle them unless you confirm both stay active.',
    );
  }

  if (facts.loadedLabourYearEur) {
    parts.push(
      `Business value (illustrative, not a promise): at ${facts.hoursPerMonth} hours/month × €${facts.hourlyEur}/hour that labour is about €${facts.loadedLabourYearEur.toLocaleString('en-US')}/year. A 30% reduction would be about €${facts.illustrativeSaveYearEur!.toLocaleString('en-US')}/year — an estimate only.`,
    );
  } else if (facts.hoursPerMonth && !facts.hourlyEur && !state.answeredQuestions.includes('hourly_cost')) {
    parts.push(
      `You mentioned about ${facts.hoursPerMonth} hours a month on this. What is the approximate loaded hourly cost of the people doing it? I can then show an illustrative annual labour burden — not a savings guarantee.`,
    );
  } else if (!state.enoughInfo && !state.confirmedBottleneck) {
    const ask = followUpsFromState(state)[0];
    parts.push(
      ask ||
        'Does that sound like the actual problem, or are we missing something? One useful figure: how often this happens, who does it, or what a missed case costs.',
    );
  } else if (state.confirmedBottleneck) {
    parts.push('If that diagnosis is right, say when you want a catalog match — I will not force a package.');
  }

  if (
    result.products[0] &&
    !CONVERSION_SIGNAL.test(state.lastMessage) &&
    state.intent !== 'deny' &&
    !state.topicDropped
  ) {
    const p = result.products[0];
    parts.push(
      `If you confirm this bottleneck, I would consider ${p.name} (€${p.priceEur} ${p.billing}) because it maps to that job — not because it is more expensive. It would not automatically fix ${problems[1] || 'unrelated issues'}. ${p.href}`,
    );
  }
  parts.push('I will not upsell a larger package unless the facts require it.');
  return parts.join(' ');
}

export function formatOmiRecommendReply(result: OmiConsultResultView, message: string): string {
  const state = result.conversation ?? buildOmiConversationStateFromCombined(message);
  const facts = state.facts;
  const parts: string[] = [];
  const problems = state.problems.length ? state.problems : result.problems;

  if (result.understood) parts.push(`What I understand: ${result.understood.slice(0, 220)}`);
  if (problems.length) parts.push(`The main problem: ${problems.join('; ')}.`);
  if (problems.length) {
    parts.push(`Why I think this is the bottleneck: it is what you actually described, not a generic industry script.`);
  }
  if (state.rejectedAssumptions.length) {
    parts.push(
      `Not treating earlier threads as active (${state.rejectedAssumptions
        .map((a) => a.replace(/^rejected:/, ''))
        .slice(0, 2)
        .join(', ')}).`,
    );
  }
  if (result.noSuitable || !result.products.length) {
    parts.push(
      'Omni does not currently have a verified solution for that requirement. I will not force a nearby package. Next step: /contact if you want a human to review it.',
    );
    return parts.join(' ');
  }
  const primary = result.products[0];
  const classified = state.classified.concepts.length
    ? state.classified
    : classifyOmiProblems(state.activeThread || message);
  const automationPick = /^(integration|workflow-design|setup-full)$/.test(primary.id);
  if (
    classified.concepts.includes('REPETITIVE_MANUAL_WORK') ||
    classified.concepts.includes('SYSTEMS_NOT_CONNECTED')
  ) {
    const hoursBit = facts.hoursPerMonth != null ? ` around ${facts.hoursPerMonth} hours each month` : '';
    parts.push(
      `You described a process where people spend${hoursBit} manually moving information. That makes workflow automation/integration more directly relevant than a general presence or portal package.`,
    );
    if (automationPick) {
      parts.push(`I'd therefore look at ${primary.name} first because it addresses the manual transfer itself.`);
    }
  }
  if (classified.concepts.includes('MISSED_INQUIRIES') || /follow[- ]?up/i.test(state.activeThread)) {
    parts.push(
      'Because the pain is follow-up after interest arrives, I am not steering you to a website rebuild by default.',
    );
  }
  parts.push(
    `What I would consider: ${primary.name} (${primary.id}) at €${primary.priceEur} ${primary.billing}. ${primary.href}`,
  );
  parts.push(
    `Why this fits you: ${primary.why || primary.description}${primary.exclusions ? ` It does not include: ${primary.exclusions}.` : ''}`,
  );
  if (problems.length > 1) {
    parts.push(
      `You described more than one issue. I will not automatically recommend a package for each. Separate issues, if they stay real: ${
        result.products.length > 1
          ? result.products
              .slice(1, 3)
              .map((p) => `${p.name} (€${p.priceEur})`)
              .join('; ')
          : problems.slice(1).join('; ')
      }. Do not buy all of them unless each problem is confirmed.`,
    );
  }
  if (facts.loadedLabourYearEur) {
    parts.push(
      `Business value (illustrative): ~€${facts.loadedLabourYearEur.toLocaleString('en-US')}/year labour capacity; Omni's price is the delivery investment, not that value figure. No promised savings.`,
    );
  }
  parts.push(
    `Investment is the catalog price above — not an internal cost floor. Next step: open the package on /products, or /contact if you want a human to scope it. Does that sound like the actual problem, or are we missing something?`,
  );
  return parts.join(' ');
}

export function formatOmiConsultVisitorReply(result: OmiConsultResultView, message: string): string {
  const state = result.conversation ?? buildOmiConversationStateFromCombined(message);
  const stage = result.consultStage ?? resolveOmiConsultStage(message, { ...result, conversation: state });
  if (stage === 'page') {
    return '';
  }
  if (stage === 'unavailable') {
    return 'Omni does not currently have a verified solution for that requirement. I will not force a nearby package. Use /contact if you want a human to review it.';
  }
  if (stage === 'discover') return formatOmiDiscoveryReply(message, result.problems, state);
  if (stage === 'diagnose') return formatOmiDiagnoseReply({ ...result, conversation: state }, message);
  return formatOmiRecommendReply({ ...result, conversation: state }, message);
}
