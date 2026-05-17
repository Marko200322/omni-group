'use client';

import { useEffect, useState } from 'react';

/** Avoids React hydration mismatch for locale-formatted dates (SSR vs client). */
export function FormatLocalDateTime({
  iso,
  locale = 'sr-RS',
  className,
}: {
  iso: string;
  locale?: string;
  className?: string;
}) {
  const fallback = iso.slice(0, 19).replace('T', ' ');
  const [text, setText] = useState(fallback);

  useEffect(() => {
    setText(new Date(iso).toLocaleString(locale));
  }, [iso, locale]);

  return (
    <span suppressHydrationWarning className={className}>
      {text}
    </span>
  );
}
