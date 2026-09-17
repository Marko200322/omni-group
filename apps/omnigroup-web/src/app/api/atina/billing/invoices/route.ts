import { NextResponse } from 'next/server';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

export type InvoiceRow = {
  id?: string;
  invoice_number?: string;
  total_amount?: number | string;
  amount?: number | string;
  currency?: string;
  status?: string;
  line_items?: Array<{ description?: string; amount?: number; quantity?: number }>;
  created_at?: string;
  billing_details?: Record<string, unknown> | null;
};

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const root = payload as { data?: T[] | { data?: T[]; items?: T[] } };
    const inner = root.data;
    if (Array.isArray(inner)) return inner;
    if (inner && Array.isArray(inner.data)) return inner.data;
    if (inner && Array.isArray(inner.items)) return inner.items;
  }
  return [];
}

function unwrapTotal(payload: unknown, fallback: number): number {
  if (payload && typeof payload === 'object') {
    const root = payload as { meta?: { total?: number }; total?: number; data?: { total?: number } };
    if (typeof root.meta?.total === 'number') return root.meta.total;
    if (typeof root.total === 'number') return root.total;
    if (typeof root.data?.total === 'number') return root.data.total;
  }
  return fallback;
}

/** GET /api/atina/billing/invoices?limit=&page= */
export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || '1') || 1);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || '20') || 20));

  const invRes = await fetchAtinaForBff<unknown>(
    `/api/v1/billing/invoices?limit=${limit}&page=${page}`,
    session,
  );

  if (!invRes.ok) {
    return NextResponse.json(
      { ok: false, error: invRes.message ?? 'invoices_failed' },
      { status: 502 },
    );
  }

  const invoices = unwrapList<InvoiceRow>(invRes.data);
  const total = unwrapTotal(invRes.data, invoices.length);

  return NextResponse.json({
    ok: true,
    data: { invoices, page, limit, total },
  });
}
