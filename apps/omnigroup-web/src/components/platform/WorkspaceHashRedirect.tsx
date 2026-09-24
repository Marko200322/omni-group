'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { resolveWorkspaceHashRedirect } from '@/lib/workspace-routes';

export function WorkspaceHashRedirect() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const dest = resolveWorkspaceHashRedirect(pathname, window.location.hash);
    if (!dest) return;
    const query = searchParams.toString();
    router.replace(query ? `${dest}?${query}` : dest);
  }, [pathname, router, searchParams]);

  return null;
}
