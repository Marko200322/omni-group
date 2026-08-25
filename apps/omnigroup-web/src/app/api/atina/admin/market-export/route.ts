import { NextResponse } from 'next/server';
import { getServerSession, isAdminRole } from '@/lib/auth-session';
import {
  aggregateByCategory,
  buildFullMarketExportCsv,
  categoryAggregatesToCsv,
  listVerticalPricingRows,
  verticalRowsToCsv,
} from '@/lib/market-analytics';

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const scope = url.searchParams.get('scope') ?? 'full';
  const category = url.searchParams.get('category')?.trim().toLowerCase();
  const date = new Date().toISOString().slice(0, 10);

  let csv: string;
  let filename: string;

  if (scope === 'categories') {
    const rows = listVerticalPricingRows();
    csv = categoryAggregatesToCsv(aggregateByCategory(rows));
    filename = `market-categories-${date}.csv`;
  } else if (category) {
    const rows = listVerticalPricingRows().filter((r) => r.category === category);
    csv = verticalRowsToCsv(rows);
    filename = `market-verticals-${category}-${date}.csv`;
  } else {
    csv = buildFullMarketExportCsv();
    filename = `market-verticals-full-${date}.csv`;
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
