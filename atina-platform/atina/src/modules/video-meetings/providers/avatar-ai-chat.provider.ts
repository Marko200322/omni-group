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

  if (/^(zdravo|ćao|cao|hej|hello|hi|dobar dan)/.test(msg)) {
    return isSupport
      ? 'Drago mi je što si tu! Opiši problem u jednoj rečenici — odmah ću ti predložiti rešenje.'
      : 'Drago mi je! Reci mi da li tražiš plan za sebe ili tim — mogu da uporedim Starter, Pro i Enterprise.';
  }

  if (msg.includes('cena') || msg.includes('koliko') || msg.includes('plan') || msg.includes('pretplat')) {
    return isSupport
      ? 'Planove i cene vidiš na /pricing ili u dashboardu pod Billing. Ako ti nešto nije jasno oko uplate ili aktivacije, mogu da prođemo korak po korak.'
      : 'Starter je za solo korisnike, Pro za rastuće timove sa više automacija, Enterprise za custom kvote i SLA. Koji obim projekata planiraš?';
  }

  if (msg.includes('api') || msg.includes('integrac') || msg.includes('token') || msg.includes('deploy')) {
    return isSupport
      ? 'Za API: proveri da li je `NEXT_PUBLIC_ATINA_API_BASE` tačan i da si ulogovan (ne demo sesija). Ako vidiš 401, osveži prijavu. Hoćeš da zakazemo screen-share poziv?'
      : 'Integracije su uključene u Pro i Enterprise. Mogu da ti predložim plan prema broju API poziva i modula koje koristiš.';
  }

  if (msg.includes('plac') || msg.includes('uplat') || msg.includes('iban') || msg.includes('faktur')) {
    return isSupport
      ? 'Ručna uplata: na dashboardu pod Billing generišeš uputstvo, pošalješ transfer, pa admin potvrđuje. Email stiže automatski sa referencom i fakturom posle potvrde.'
      : 'Možemo krenuti sa ručnom uplatom dok ne aktiviraš Stripe. Hoćeš da ti pošaljem uporedni pregled planova pre odluke?';
  }

  if (msg.includes('hvala') || msg.includes('super') || msg.includes('ok')) {
    return isSupport
      ? 'Nema na čemu! Ako zatreba nešto drugo, tu sam — ili zakazi video poziv ispod.'
      : 'Hvala tebi! Javi kad budeš spreman za demo ili ako hoćeš ponudu za tim.';
  }

  const lastUser = [...history].reverse().find((h) => h.role === 'user')?.content;
  if (lastUser && lastUser !== userMessage) {
    return isSupport
      ? `Razumem — u vezi prethodnog i ovoga: "${userMessage.slice(0, 120)}". Predlažem da proverimo dashboard i log greške; mogu i da zakazem poziv sa inženjerom.`
      : `Razumem potrebu oko "${userMessage.slice(0, 120)}". Da li ti više odgovara mesečna ili godišnja pretplata?`;
  }

  return isSupport
    ? `Čujem te — "${userMessage.slice(0, 100)}". Da bih bila precizna, reci mi da li se radi o nalogu, plaćanju ili tehničkom problemu. Mogu i odmah da zakazem video poziv.`
    : `Razumem — "${userMessage.slice(0, 100)}". Koliko ljudi bi koristilo platformu i da li ti trebaju napredni moduli poput CRM-a ili automacija?`;
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
