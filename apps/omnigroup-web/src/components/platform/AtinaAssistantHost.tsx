'use client';

import { usePathname } from 'next/navigation';
import { ClientAiAssistant } from '@/components/platform/ClientAiAssistant';

/** Site-wide Atina helper — hidden only on operator/dev consoles. */
export function AtinaAssistantHost() {
  const pathname = usePathname() ?? '';
  if (pathname.startsWith('/admin') || pathname.startsWith('/dev')) {
    return null;
  }
  return <ClientAiAssistant />;
}
