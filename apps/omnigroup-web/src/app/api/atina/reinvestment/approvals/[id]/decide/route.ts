import { NextResponse } from 'next/server';
import { reinvestmentBffPost } from '@/lib/reinvestment-bff';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ ok: false, error: 'missing_id' }, { status: 400 });
  }
  return reinvestmentBffPost(`/approvals/${encodeURIComponent(id)}/decide`, req);
}
