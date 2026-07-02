import 'server-only';

export type ContactSlackInput = {
  name: string;
  email: string;
  company?: string;
  message: string;
  service?: string;
  category?: string;
};

export async function notifyContactSlack(input: ContactSlackInput): Promise<{ ok: boolean; skipped?: boolean }> {
  const url = process.env.CONTACT_SLACK_WEBHOOK_URL?.trim();
  if (!url) return { ok: true, skipped: true };

  const lines = [
    '*New website contact*',
    `*Name:* ${input.name}`,
    `*Email:* ${input.email}`,
    input.company ? `*Company:* ${input.company}` : null,
    input.service ? `*Service:* ${input.service}` : null,
    input.category ? `*Category:* ${input.category}` : null,
    '',
    input.message.slice(0, 1500),
  ].filter(Boolean);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: lines.join('\n') }),
      cache: 'no-store',
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}
