'use client';

import { usePathname } from 'next/navigation';
import { ClientAiAssistant } from '@/components/platform/ClientAiAssistant';

const HIDDEN = /^\/(admin|dev|login|register|forgot-password|reset-password|sites)(\/|$)/;

/** Ask OMI on marketing + portal. Hidden on auth/admin/client sites. */
export function AtinaAssistantHost() {
  const pathname = usePathname() ?? '';
  if (HIDDEN.test(pathname)) return null;
  return <ClientAiAssistant userName={undefined} />;
}
