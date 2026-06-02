import { NextResponse } from 'next/server';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

type SubscriptionRow = {
  plan_name?: string;
  plan_slug?: string;
  billing_cycle?: string;
  status?: string;
  current_period_start?: string;
  current_period_end?: string;
};

type InvoiceRow = {
  invoice_number?: string;
  total_amount?: number | string;
  currency?: string;
  status?: string;
  line_items?: Array<{ description?: string; amount?: number; quantity?: number }>;
  created_at?: string;
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

export async function GET() {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const subRes = await fetchAtinaForBff<SubscriptionRow | null>(
    '/api/v1/billing/subscription',
    session,
  );
  const invRes = await fetchAtinaForBff<unknown>(
    '/api/v1/billing/invoices?limit=1&page=1',
    session,
  );

  const subscription = subRes.ok ? subRes.data : null;
  const invoices = invRes.ok ? unwrapList<InvoiceRow>(invRes.data) : [];
  const latestInvoice = invoices[0] ?? null;

  return NextResponse.json({
    ok: true,
    data: {
      subscription,
      latestInvoice,
      errors: [
        ...(subRes.ok ? [] : [subRes.message ?? 'subscription_failed']),
        ...(invRes.ok ? [] : [invRes.message ?? 'invoices_failed']),
      ],
    },
  });
}
