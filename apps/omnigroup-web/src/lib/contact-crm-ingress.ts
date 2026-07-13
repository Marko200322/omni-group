import 'server-only';

import { atinaLogin } from './atina-auth';
import { resolveAtinaApiBase } from './atina-api-base';

export type ContactLeadInput = {
  name: string;
  email: string;
  company?: string;
  message: string;
  service?: string;
  category?: string;
  vertical?: string;
};

export async function pushContactToCrm(
  input: ContactLeadInput,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const ingressEmail = process.env.CONTACT_CRM_INGRESS_EMAIL;
  const ingressPassword = process.env.CONTACT_CRM_INGRESS_PASSWORD;
  if (!ingressEmail || !ingressPassword) {
    return { ok: true, skipped: true };
  }

  const parts = input.name.trim().split(/\s+/);
  const firstName = parts[0] || input.name;
  const lastName = parts.slice(1).join(' ') || undefined;

  const tags = ['website_contact'];
  if (input.service) tags.push(`service:${input.service}`);
  if (input.category) tags.push(`category:${input.category}`);
  if (input.vertical) tags.push(`vertical:${input.vertical}`);

  const noteLines = [
    ...(input.service ? [`Service interest: ${input.service}`] : []),
    ...(input.category ? [`Industry category: ${input.category}`] : []),
    ...(input.vertical ? [`Vertical niche: ${input.vertical}`] : []),
    input.message,
  ];

  try {
    const login = await atinaLogin({
      email: ingressEmail,
      password: ingressPassword,
      rememberMe: false,
    });
    const apiBase = resolveAtinaApiBase('http://127.0.0.1:3000');
    const res = await fetch(`${apiBase}/api/v1/crm/contacts`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${login.accessToken}`,
      },
      body: JSON.stringify({
        firstName,
        lastName,
        email: input.email,
        company: input.company || undefined,
        status: 'lead',
        source: 'website_contact',
        tags,
        notes: noteLines.join('\n\n'),
        customFields: {
          ...(input.service ? { service: input.service } : {}),
          ...(input.category ? { category: input.category } : {}),
          ...(input.vertical ? { vertical: input.vertical } : {}),
        },
      }),
      cache: 'no-store',
    });

    if (!res.ok) {
      return { ok: false, error: `crm_http_${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'crm_push_failed' };
  }
}
