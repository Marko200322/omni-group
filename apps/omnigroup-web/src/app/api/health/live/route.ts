import { NextResponse } from 'next/server';

/** UptimeRobot / load-balancer liveness. Does not depend on Atina. */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(
    { ok: true, app: 'omnigroup-web', probe: 'live', ts: new Date().toISOString() },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  );
}
