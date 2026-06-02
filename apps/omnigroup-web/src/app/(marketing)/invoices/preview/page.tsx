import type { Metadata } from 'next';

import { InvoicePreviewClient } from './InvoicePreviewClient';

export const metadata: Metadata = {
  title: 'Pregled faktura',
  description: 'Premium HTML šabloni faktura koje Omni Group platforma šalje klijentima.',
  robots: { index: false, follow: false },
};

export default function InvoicePreviewPage() {
  return <InvoicePreviewClient />;
}
