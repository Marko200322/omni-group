'use client';

import { useEffect, useState } from 'react';
import {
  fetchFoundingPromoStatus,
  type FoundingPromoPublic,
} from '@/lib/founding-promo-public';

export function useFoundingPromoStatus() {
  const [status, setStatus] = useState<FoundingPromoPublic | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchFoundingPromoStatus()
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { status };
}
