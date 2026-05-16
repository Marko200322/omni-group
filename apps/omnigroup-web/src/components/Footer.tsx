import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/40 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 md:flex-row md:justify-between">
        <div>
          <p className="font-semibold text-gradient">Omnigroup</p>
          <p className="mt-2 max-w-sm text-sm text-gray-400">
            Web systems, automation, and AI infrastructure — built for operators who ship.
          </p>
        </div>
        <div className="flex gap-8 text-sm text-gray-400">
          <div className="flex flex-col gap-2">
            <span className="text-white">Product</span>
            <Link href="/services" className="hover:text-white">
              Services
            </Link>
            <Link href="/pricing" className="hover:text-white">
              Pricing
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-white">App</span>
            <Link href="/dashboard" className="hover:text-white">
              Client dashboard
            </Link>
            <Link href="/admin" className="hover:text-white">
              Admin
            </Link>
          </div>
        </div>
      </div>
      <p className="mt-8 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Omnigroup. Monorepo app — see repo README.
      </p>
    </footer>
  );
}
