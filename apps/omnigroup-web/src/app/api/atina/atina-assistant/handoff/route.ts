import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff, fetchAtinaPublicJson } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';
import { pushContactToCrm } from '@/lib/contact-crm-ingress';
import { isValidContactEmail, parseContactName } from '@/lib/contact-intake';

type HandoffSummary = {
  sessionId?: string;
  summary?: string;
  messageCount?: number;
};

export async function POST(req: Request) {
  let body: {
    sessionId?: string;
    name?: string;
    email?: string;
    note?: string;
    messages?: Array<{ role?: string; text?: string }>;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  const session = await getServerSession();
  const payload = JSON.stringify({ sessionId });

  let summary = '';
  if (session && !session.demo) {
    const r = await fetchAtinaForBff<HandoffSummary>(
      '/api/v1/video-meetings/support/avatar/handoff-summary',
      session,
      { method: 'POST', timeoutMs: 15000, body: payload },
    );
    if (!r.ok) {
      return clientSafeBffError('handoff_failed', r.message, r.status || 502);
    }
    summary = r.data?.summary ?? '';
  } else {
    const r = await fetchAtinaPublicJson<HandoffSummary>(
      '/api/v1/video-meetings/public/avatar/handoff-summary',
      {
        method: 'POST',
        timeoutMs: 15000,
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      },
    );
    if (!r.ok || !r.data) {
      // Fall back to client-supplied transcript if backend summary is unavailable.
      const local = (body.messages ?? [])
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
        .slice(-16)
        .map((m) => `${m.role === 'user' ? 'Visitor' : 'Omi'}: ${String(m.text).slice(0, 220)}`)
        .join('\n');
      if (!local) {
        return clientSafeBffError('handoff_failed', undefined, r.status || 502);
      }
      summary = local;
    } else {
      summary = r.data.summary ?? '';
    }
  }

  const name =
    parseContactName(body.name) ||
    (session && !session.demo ? parseContactName(session.user.name) : null) ||
    'OMI visitor';
  const emailRaw =
    (typeof body.email === 'string' ? body.email.trim() : '') ||
    (session && !session.demo ? session.user.email : '');
  if (!isValidContactEmail(emailRaw)) {
    return NextResponse.json({ ok: false, error: 'email_required' }, { status: 400 });
  }

  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : '';
  const message = [
    `OMI human handoff request`,
    `Conversation ID: ${sessionId}`,
    note ? `Visitor note: ${note}` : '',
    '',
    'Conversation summary:',
    summary || '(empty)',
  ]
    .filter(Boolean)
    .join('\n');

  const crm = await pushContactToCrm({
    name,
    email: emailRaw.trim(),
    message,
    topic: 'omi_handoff',
    service: 'omi-assistant',
  });

  if (!crm.ok && !crm.skipped) {
    return NextResponse.json(
      { ok: false, error: 'crm_push_failed', detail: crm.error },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      sessionId,
      crm: crm.skipped ? 'skipped' : 'ok',
      summaryPreview: summary.slice(0, 280),
    },
  });
}
