import { NextResponse } from 'next/server';
import { notifyContactSlack } from '@/lib/contact-slack-notify';
import { pushContactToCrm } from '@/lib/contact-crm-ingress';

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
  const company = typeof body.company === 'string' ? body.company.trim() : '';
  const service =
    typeof body.service === 'string' && /^[a-z0-9_-]{1,64}$/.test(body.service) ? body.service : undefined;
  const category =
    typeof body.category === 'string' && /^[a-z0-9_-]{1,64}$/.test(body.category) ? body.category : undefined;
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

  const crm = await pushContactToCrm({
    name,
    email,
    company: company || undefined,
    message: messageText,
    service,
    category,
  });

  const slack = await notifyContactSlack({
    name,
    email,
    company: company || undefined,
    message: messageText,
    service,
    category,
  });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      ok: true,
      message: 'queued_local_stub',
      crm: crm.skipped ? 'skipped' : crm.ok ? 'ok' : 'failed',
      slack: slack.skipped ? 'skipped' : slack.ok ? 'ok' : 'failed',
    });
  }

  const from = process.env.CONTACT_EMAIL_FROM;
  const to = process.env.CONTACT_EMAIL_TO;
  if (!from || !to) {
    return NextResponse.json({ ok: false, error: 'contact_email_env_incomplete' }, { status: 500 });
  }

  const subject = service
    ? `Contact: ${name} — ${service}`
    : `Contact: ${name} <${email}>`;
  const companyLine = company ? `Company: ${company}` : '';
  const serviceLine = service ? `Service: ${service}` : '';
  const categoryLine = category ? `Category: ${category}` : '';
  const text = [`Name: ${name}`, `Email: ${email}`, companyLine, serviceLine, categoryLine, '', 'Message:', messageText]
    .filter(Boolean)
    .join('\n');
  const companyHtml = company
    ? `<p><strong>Company:</strong> ${escapeHtml(company)}</p>`
    : '';
  const serviceHtml = service ? `<p><strong>Service:</strong> ${escapeHtml(service)}</p>` : '';
  const categoryHtml = category ? `<p><strong>Category:</strong> ${escapeHtml(category)}</p>` : '';
  const html = `<p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p>${companyHtml}${serviceHtml}${categoryHtml}<p><strong>Message:</strong></p><pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(messageText)}</pre>`;

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
    if (crm.ok) {
      return NextResponse.json({
        ok: true,
        message: 'crm_ok_email_failed',
        error: 'email_provider_error',
        crm: 'ok',
        slack: slack.skipped ? 'skipped' : slack.ok ? 'ok' : 'failed',
      });
    }
    return NextResponse.json(
      {
        ok: false,
        error: 'email_provider_error',
        crm: crm.skipped ? 'skipped' : crm.ok ? 'ok' : 'failed',
        slack: slack.skipped ? 'skipped' : slack.ok ? 'ok' : 'failed',
      },
      { status: 502 },
    );
  }

  let providerId: string | undefined;
  try {
    const sent = (await res.json()) as { id?: string };
    providerId = typeof sent.id === 'string' ? sent.id : undefined;
  } catch {
    providerId = undefined;
  }

  return NextResponse.json({
    ok: true,
    message: 'sent_via_resend',
    id: providerId,
    crm: crm.skipped ? 'skipped' : crm.ok ? 'ok' : 'failed',
    slack: slack.skipped ? 'skipped' : slack.ok ? 'ok' : 'failed',
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

