/**
 * Thin connection helpers for external AI vendors.
 * Keys-only wiring today — returns readiness + optional webhook/base URL for later adapters.
 */
import { config } from '../config';
import { EXTERNAL_AI_STACK, type ExternalAiVendorDef } from '../modules/billing/lib/external-ai-stack';

export type ExternalAiConnection = {
  id: string;
  name: string;
  configured: boolean;
  connectionReady: boolean;
  apiKeyPresent: boolean;
  connectionUrl?: string;
  purpose: string;
  purposeSr: string;
};

function keyPresent(v: string | undefined): boolean {
  const t = v?.trim() ?? '';
  return Boolean(t && t !== 'placeholder' && !t.startsWith('your_'));
}

function readStackField(field: keyof typeof config.externalAiStack): string {
  return config.externalAiStack[field]?.trim() ?? '';
}

const KEY_FIELD: Record<string, keyof typeof config.externalAiStack | 'heygen' | 'elevenlabs'> = {
  clay: 'clayApiKey',
  salesforge: 'salesforgeApiKey',
  intercom: 'intercomApiKey',
  sierra: 'sierraApiKey',
  make: 'makeApiKey',
  n8n: 'n8nApiKey',
  ramp: 'rampApiKey',
  vic_ai: 'vicAiApiKey',
  jasper: 'jasperApiKey',
  predis: 'predisApiKey',
  devin: 'devinApiKey',
  replit_agent: 'replitAgentApiKey',
  crewai: 'crewaiApiKey',
  langchain: 'langchainApiKey',
  heygen: 'heygen',
  elevenlabs: 'elevenlabs',
};

function resolveConnectionUrl(def: ExternalAiVendorDef): string | undefined {
  switch (def.id) {
    case 'make':
      return readStackField('makeWebhookUrl') || undefined;
    case 'n8n':
      return readStackField('n8nBaseUrl') || undefined;
    case 'crewai':
      return readStackField('crewaiBaseUrl') || undefined;
    default:
      return undefined;
  }
}

function resolveApiKeyPresent(id: string): boolean {
  const field = KEY_FIELD[id];
  if (!field) return false;
  if (field === 'heygen') {
    return keyPresent(config.videoMeetings.avatarMedia.heygenApiKey);
  }
  if (field === 'elevenlabs') {
    return keyPresent(config.pipelines.elevenLabsKey);
  }
  return keyPresent(readStackField(field));
}

export function getExternalAiConnection(id: string): ExternalAiConnection | null {
  const def = EXTERNAL_AI_STACK.find((v: ExternalAiVendorDef) => v.id === id);
  if (!def) return null;
  const apiKeyPresent = resolveApiKeyPresent(id);
  const connectionUrl = resolveConnectionUrl(def);
  const needsUrl = def.connectionMode === 'api_key_and_url';
  const connectionReady = apiKeyPresent && (!needsUrl || Boolean(connectionUrl));
  return {
    id: def.id,
    name: def.name,
    configured: apiKeyPresent,
    connectionReady,
    apiKeyPresent,
    connectionUrl,
    purpose: def.purpose,
    purposeSr: def.purposeSr,
  };
}

export function listExternalAiConnections(): ExternalAiConnection[] {
  return EXTERNAL_AI_STACK.map((v: ExternalAiVendorDef) => getExternalAiConnection(v.id)!).filter(Boolean);
}

/** Post JSON payload to Make/n8n webhook when configured; no-op otherwise. */
export async function dispatchExternalAutomationWebhook(
  vendorId: 'make' | 'n8n',
  payload: Record<string, unknown>
): Promise<{ ok: boolean; skipped: boolean; status?: number; error?: string }> {
  const conn = getExternalAiConnection(vendorId);
  if (!conn?.connectionReady || !conn.connectionUrl) {
    return { ok: false, skipped: true, error: `${vendorId} not connected` };
  }
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (vendorId === 'n8n' && keyPresent(readStackField('n8nApiKey'))) {
      headers['X-N8N-API-KEY'] = readStackField('n8nApiKey');
    }
    const res = await fetch(conn.connectionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ source: 'atina', vendor: vendorId, ...payload }),
    });
    return { ok: res.ok, skipped: false, status: res.status };
  } catch (err) {
    return {
      ok: false,
      skipped: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
