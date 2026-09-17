import { getAiClient } from '../../../integrations';
import type { AgentType } from '../avatar/avatar-agent.personas';
import {
  CLIENT_PORTAL_AI_CONTEXT,
  DEFAULT_SALES_PERSONA,
  DEFAULT_SUPPORT_PERSONA,
  PUBLIC_SITE_AI_CONTEXT,
  PUBLIC_SITE_PERSONA,
} from '../avatar/avatar-agent.personas';

export type ChatTurn = { role: 'user' | 'assistant'; content: string };
export type ChatAudience = 'public' | 'portal';

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

function fallbackReply(
  agentType: AgentType,
  userMessage: string,
  history: ChatTurn[],
  audience: ChatAudience,
): string {
  const msg = normalize(userMessage);
  const isPublic = audience === 'public';
  const isSupport = agentType === 'support' && !isPublic;

  if (isPublic) {
    if (/^(zdravo|cao|hej|hello|hi|hey|good morning|good afternoon)/.test(msg)) {
      return "Glad you're here! I can walk you through packages, pricing, or how to start a project.";
    }
    if (
      msg.includes('price') ||
      msg.includes('cost') ||
      msg.includes('plan') ||
      msg.includes('cena') ||
      msg.includes('pricing')
    ) {
      return 'See live packages on /pricing and /products. If you want a tailored quote, use /contact and the team will follow up.';
    }
    if (msg.includes('contact') || msg.includes('human') || msg.includes('call') || msg.includes('kontakt')) {
      return 'The fastest way to reach us is /contact. You can also sign in at /login if you already have a client account.';
    }
    if (msg.includes('login') || msg.includes('register') || msg.includes('account') || msg.includes('nalog')) {
      return 'Existing clients sign in at /login. New accounts are invite-only — use /contact and we will set you up.';
    }
    return `I can help with that — "${userMessage.slice(0, 100)}". Check /pricing, /products, or /solutions, or send a note via /contact.`;
  }

  if (/^(zdravo|cao|hej|hello|hi|hey|good morning|good afternoon)/.test(msg)) {
    return isSupport
      ? 'Glad you\'re here! Ask me where to find billing, orders, or uploads — I\'ll point you to the right sidebar section.'
      : 'Glad to connect! Tell me if you\'re looking for a plan for yourself or a team — I can compare Starter, Pro, and Enterprise.';
  }

  if (
    msg.includes('order') ||
    msg.includes('delivery') ||
    msg.includes('status') ||
    msg.includes('narudz') ||
    msg.includes('porudz') ||
    msg.includes('isporuk')
  ) {
    return isSupport
      ? 'Open Orders in the sidebar for live status, or Deliveries when files are ready to download.'
      : 'Tell me your team size and I\'ll suggest the right package — you can order from New order in the portal.';
  }

  if (
    msg.includes('upload') ||
    msg.includes('document') ||
    msg.includes('file') ||
    msg.includes('brief') ||
    msg.includes('dokument')
  ) {
    return isSupport
      ? 'Go to Documents in the sidebar to upload briefs, logos, or contracts for your project team.'
      : 'We collect files in the client portal under Documents after you start a project.';
  }

  if (msg.includes('where') || msg.includes('how do i') || msg.includes('kako') || msg.includes('gde')) {
    return isSupport
      ? 'Use the sidebar: Billing for payments, New order for packages, Orders for status, Documents for uploads, Support for live help. Which one do you need?'
      : 'I can walk you through plans on /pricing or book a consultation from the portal.';
  }

  if (
    msg.includes('price') ||
    msg.includes('cost') ||
    msg.includes('plan') ||
    msg.includes('subscription') ||
    msg.includes('cena') ||
    msg.includes('pretplat')
  ) {
    return isSupport
      ? 'You can see plans and pricing on /pricing or under Billing in the dashboard. If anything is unclear about payment or activation, we can walk through it step by step.'
      : 'Starter is for solo users, Pro for growing teams with more automations, Enterprise for custom quotas and SLA. What scope of projects are you planning?';
  }

  if (msg.includes('api') || msg.includes('integrac') || msg.includes('token') || msg.includes('deploy')) {
    return isSupport
      ? 'For technical issues, open Support in the sidebar — you can chat here or schedule a live call with our team.'
      : 'Integrations are included in Pro and Enterprise. I can recommend a plan based on API call volume and modules you need.';
  }

  if (
    msg.includes('pay') ||
    msg.includes('bill') ||
    msg.includes('iban') ||
    msg.includes('invoice') ||
    msg.includes('plac') ||
    msg.includes('uplat') ||
    msg.includes('faktur')
  ) {
    return isSupport
      ? 'Open Billing in the sidebar to pay or view invoices. For a new package, use New order. Card and bank transfer options appear at checkout.'
      : 'We can start with manual bank transfer until Stripe is set up. Want a side-by-side plan comparison before you decide?';
  }

  if (msg.includes('thank') || msg.includes('hvala') || msg.includes('super') || msg.includes('great')) {
    return isSupport
      ? 'You\'re welcome! If you need anything else, I\'m here — or book a video call below.'
      : 'Thank you! Reach out when you\'re ready for a demo or if you want a team quote.';
  }

  const lastUser = [...history].reverse().find((h) => h.role === 'user')?.content;
  if (lastUser && lastUser !== userMessage) {
    return isSupport
      ? `Got it — regarding the previous message and this one: "${userMessage.slice(0, 120)}". I suggest checking the dashboard and error logs; I can also schedule a call with an engineer.`
      : `I understand the need around "${userMessage.slice(0, 120)}". Do you prefer monthly or annual billing?`;
  }

  return isSupport
    ? `I hear you — "${userMessage.slice(0, 100)}". To be precise, is this about account, billing, or a technical issue? I can also book a video call right away.`
    : `Understood — "${userMessage.slice(0, 100)}". How many people would use the platform, and do you need advanced modules like CRM or automations?`;
}

export async function generateAgentReply(input: {
  agentType: AgentType;
  systemPersona: string;
  history: ChatTurn[];
  userMessage: string;
  clientMemoryContext?: string;
  audience?: ChatAudience;
}): Promise<{ content: string; source: 'ai' | 'fallback' }> {
  const audience: ChatAudience = input.audience ?? 'portal';
  const basePersona =
    input.systemPersona.trim() ||
    (audience === 'public'
      ? PUBLIC_SITE_PERSONA
      : input.agentType === 'support'
        ? DEFAULT_SUPPORT_PERSONA
        : DEFAULT_SALES_PERSONA);
  const extraContext =
    audience === 'public'
      ? PUBLIC_SITE_AI_CONTEXT
      : input.agentType === 'support'
        ? CLIENT_PORTAL_AI_CONTEXT
        : '';
  const system = [basePersona, extraContext, input.clientMemoryContext?.trim()]
    .filter(Boolean)
    .join('\n\n');

  const ai = getAiClient();
  if (ai.isConfigured()) {
    const messages = [
      { role: 'system' as const, content: system },
      ...input.history.slice(-12).map((h) => ({ role: h.role, content: h.content })),
      { role: 'user' as const, content: input.userMessage },
    ];
    const result = await ai.chatCompletions({ messages, maxTokens: 320, temperature: 0.65 });
    if (result?.content) {
      return { content: result.content, source: 'ai' };
    }
  }

  return {
    content: fallbackReply(input.agentType, input.userMessage, input.history, audience),
    source: 'fallback',
  };
}
