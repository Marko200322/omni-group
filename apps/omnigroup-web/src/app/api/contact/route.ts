import { NextResponse } from 'next/server';

const MESSAGE_MAX_LEN = 5000;

/** Accepts contact form JSON; optional Resend when RESEND_API_KEY is set (server-only). */
export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }
  const email = typeof body.email === 'string' ? body.email : '';
  const name = typeof body.name === 'string' ? body.name : '';
  if (!email || !name) {
    return NextResponse.json({ ok: false, error: 'name_and_email_required' }, { status: 400 });
  }

  if (body.message !== undefined && body.message !== null) {
    if (typeof body.message !== 'string') {
      return NextResponse.json({ ok: false, error: 'message_invalid_type' }, { status: 400 });
    }
    if (body.message.length > MESSAGE_MAX_LEN) {
      return NextResponse.json(
        { ok: false, error: 'message_too_long', maxLength: MESSAGE_MAX_LEN },
        { status: 400 },
      );
    }
  }

  const messageText =
    typeof body.message === 'string' && body.message.length > 0 ? body.message : '(no message)';

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: true, message: 'queued_local_stub' });
  }

  const from = process.env.CONTACT_EMAIL_FROM;
  const to = process.env.CONTACT_EMAIL_TO;
  if (!from || !to) {
    return NextResponse.json({ ok: false, error: 'contact_email_env_incomplete' }, { status: 500 });
  }

  const subject = `Contact: ${name} <${email}>`;
  const text = [`Name: ${name}`, `Email: ${email}`, '', 'Message:', messageText].join('\n');
  const html = `<p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Message:</strong></p><pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(messageText)}</pre>`;

  let res: Response;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
        html,
      }),
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'email_send_failed' }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json({ ok: false, error: 'email_provider_error' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, message: 'sent_via_resend' });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
