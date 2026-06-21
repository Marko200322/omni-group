import type { Metadata } from 'next';

import { InvoicePreviewClient } from './InvoicePreviewClient';

export const metadata: Metadata = {
  title: 'Invoice preview',
  description: 'Premium HTML invoice templates sent by the Omni Group platform to clients.',
  robots: { index: false, follow: false },
};

export default function InvoicePreviewPage() {
  return <InvoicePreviewClient />;
}
