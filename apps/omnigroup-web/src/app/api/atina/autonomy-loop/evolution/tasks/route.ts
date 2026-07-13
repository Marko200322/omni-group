import { NextResponse } from 'next/server';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { requireAdminSession } from '@/lib/bff-admin-gate';

export async function GET() {
  const gate = await requireAdminSession();
  if ('error' in gate) return gate.error;
  const { session } = gate;

  const r = await fetchAtinaForBff<unknown>('/api/v1/autonomy-loop/evolution/tasks', session, {
    method: 'GET',
  });

  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: 'evolution_tasks_failed', detail: r.message },
      { status: r.status || 502 },
    );
  }

  return NextResponse.json({ ok: true, data: r.data });
}
