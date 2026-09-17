import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">404</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-white">Page not found</h1>
      <p className="mt-3 max-w-md text-slate-400">This link may be outdated or the page was moved.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary text-sm">
          Home
        </Link>
        <Link href="/contact" className="btn-glass text-sm">
          Contact
        </Link>
      </div>
    </div>
  );
}
