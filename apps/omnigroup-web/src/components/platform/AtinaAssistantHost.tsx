'use client';

import { usePathname } from 'next/navigation';
import { ClientAiAssistant } from '@/components/platform/ClientAiAssistant';

/** Portal assistant only — marketing uses /contact (avoids “Omi” chip over cookie banner). */
export function AtinaAssistantHost() {
  const pathname = usePathname() ?? '';
  if (!pathname.startsWith('/dashboard')) {
    return null;
  }
  return <ClientAiAssistant userName={undefined} />;
}
