'use client';

import { usePathname } from 'next/navigation';
import { ClientAiAssistant } from '@/components/platform/ClientAiAssistant';

const HIDDEN = /^\/(admin|dev|login|register|forgot-password|reset-password)/;

/** Ask OMI on marketing + portal. Hidden on auth/admin to keep those screens clean. */
export function AtinaAssistantHost() {
  const pathname = usePathname() ?? '';
  if (HIDDEN.test(pathname)) return null;
  return <ClientAiAssistant userName={undefined} />;
}
