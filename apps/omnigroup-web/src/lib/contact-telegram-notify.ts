import 'server-only';

export type ContactTelegramInput = {
  name: string;
  email: string;
  company?: string;
  message: string;
  service?: string;
  category?: string;
  vertical?: string;
  topic?: string;
};

/** Direct Telegram ping for new website contacts (server-only env). */
export async function notifyContactTelegram(
  input: ContactTelegramInput,
): Promise<{ ok: boolean; skipped?: boolean }> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (process.env.ADMIN_TELEGRAM_NOTIFY === 'false') return { ok: true, skipped: true };
  if (!token || !chatId) return { ok: true, skipped: true };

  const lines = [
    '📩 Novi kontakt (sajt)',
    `Ime: ${input.name}`,
    `Email: ${input.email}`,
    input.company ? `Firma: ${input.company}` : null,
    input.service ? `Usluga: ${input.service}` : null,
    input.topic ? `Tema: ${input.topic}` : null,
    input.category ? `Kategorija: ${input.category}` : null,
    input.vertical ? `Vertikala: ${input.vertical}` : null,
    '',
    input.message.slice(0, 1200),
  ].filter(Boolean);

  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://omnigrouptech.com').replace(/\/+$/, '');
  lines.push('', `Admin: ${site}/admin`);

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join('\n').slice(0, 4000),
        disable_web_page_preview: true,
      }),
      cache: 'no-store',
    });
    const json = (await res.json()) as { ok?: boolean };
    return { ok: res.ok && json.ok === true };
  } catch {
    return { ok: false };
  }
}
