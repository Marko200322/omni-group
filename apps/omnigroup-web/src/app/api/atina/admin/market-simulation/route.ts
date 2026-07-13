import { NextResponse } from 'next/server';
import { getServerSession, isAdminRole } from '@/lib/auth-session';
import { simulateIndustry } from '@/lib/market-analytics';

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const category = url.searchParams.get('category') ?? undefined;
  const verticalSlug = url.searchParams.get('verticalSlug') ?? undefined;
  const qualityRaw = url.searchParams.get('qualityPassRate');
  const qualityPassRate = qualityRaw ? Number(qualityRaw) : undefined;

  if (qualityPassRate != null && (Number.isNaN(qualityPassRate) || qualityPassRate < 0 || qualityPassRate > 1)) {
    return NextResponse.json({ ok: false, error: 'invalid_quality_pass_rate' }, { status: 400 });
  }

  try {
    const simulation = simulateIndustry({ category, verticalSlug, qualityPassRate });
    return NextResponse.json({ ok: true, data: simulation });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'simulation_failed' },
      { status: 500 },
    );
  }
}
