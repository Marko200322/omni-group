import { NextResponse } from 'next/server';

/** UptimeRobot / load-balancer liveness. Does not depend on Atina. */
export async function GET() {
  return NextResponse.json(
    { ok: true, app: 'omnigroup-web', probe: 'live', ts: new Date().toISOString() },
    { status: 200 },
  );
}
