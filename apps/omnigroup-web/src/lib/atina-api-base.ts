/** Server-side Atina URL: Docker BFF koristi ATINA_API_BASE, browser NEXT_PUBLIC_*. */
export function resolveAtinaApiBase(defaultBase = 'http://127.0.0.1:3000'): string {
  const raw =
    process.env.ATINA_API_BASE ||
    process.env.NEXT_PUBLIC_ATINA_API_BASE ||
    defaultBase;
  return raw.replace(/\/+$/, '');
}
