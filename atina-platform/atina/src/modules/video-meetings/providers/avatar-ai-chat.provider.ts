import { getAiClient } from '../../../integrations';
import type { AgentType } from '../avatar/avatar-agent.personas';
import {
  DEFAULT_SALES_PERSONA,
  DEFAULT_SUPPORT_PERSONA,
} from '../avatar/avatar-agent.personas';

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

function fallbackReply(agentType: AgentType, userMessage: string, history: ChatTurn[]): string {
  const msg = normalize(userMessage);
  const isSupport = agentType === 'support';

  if (/^(zdravo|cao|hej|hello|hi|hey|good morning|good afternoon)/.test(msg)) {
    return isSupport
      ? 'Glad you\'re here! Describe the issue in one sentence — I\'ll suggest a fix right away.'
      : 'Glad to connect! Tell me if you\'re looking for a plan for yourself or a team — I can compare Starter, Pro, and Enterprise.';
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
      ? 'For API issues: check that `NEXT_PUBLIC_ATINA_API_BASE` is correct and you\'re signed in (not a demo session). If you see 401, sign in again. Want to schedule a screen-share call?'
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
      ? 'Manual bank transfer: under Billing on the dashboard, generate payment instructions, send the transfer, then an admin confirms. You\'ll get an email with the reference and invoice after confirmation.'
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
}): Promise<{ content: string; source: 'ai' | 'fallback' }> {
  const basePersona =
    input.systemPersona.trim() ||
    (input.agentType === 'support' ? DEFAULT_SUPPORT_PERSONA : DEFAULT_SALES_PERSONA);
  const system = input.clientMemoryContext?.trim()
    ? `${basePersona}\n\n${input.clientMemoryContext.trim()}`
    : basePersona;

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
    content: fallbackReply(input.agentType, input.userMessage, input.history),
    source: 'fallback',
  };
}
