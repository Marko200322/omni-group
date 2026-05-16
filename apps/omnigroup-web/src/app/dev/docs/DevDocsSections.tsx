'use client';

import { Check, Copy, Hash, Link2, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { sectionHeadingId } from './section-heading-id';

export type DocSection = {
  title: string;
  paths: string[];
};

/** Highlights every case-insensitive occurrence of `rawQuery` in `text` (for non-empty trimmed query). */
function highlightMatch(text: string, rawQuery: string): ReactNode {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return text;

  const lower = text.toLowerCase();
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;
  const len = q.length;

  while (i < text.length) {
    const j = lower.indexOf(q, i);
    if (j === -1) {
      out.push(text.slice(i));
      break;
    }
    if (j > i) out.push(text.slice(i, j));
    out.push(
      <mark
        key={`h-${key++}`}
        className="rounded bg-violet-600/35 px-0.5 text-violet-50 ring-1 ring-violet-400/25"
      >
        {text.slice(j, j + len)}
      </mark>,
    );
    i = j + len;
  }

  return <>{out}</>;
}

/** Scroll behavior for hash navigation: smooth unless the user prefers reduced motion. */
function hashScrollBehavior(): ScrollBehavior {
  if (typeof window === 'undefined') return 'auto';
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

export function DevDocsSections({ sections }: { sections: DocSection[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [pageLinkCopied, setPageLinkCopied] = useState(false);
  const [hashFragmentCopied, setHashFragmentCopied] = useState(false);
  const [urlHash, setUrlHash] = useState('');
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linkCopyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hashCopyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionLinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const [copiedSectionId, setCopiedSectionId] = useState<string | null>(null);

  const pushQueryToUrl = useCallback(
    (next: string) => {
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const qs = next.trim() ? `?${new URLSearchParams({ q: next }).toString()}` : '';
      router.replace(`${pathname}${qs}${hash}`, { scroll: false });
    },
    [pathname, router],
  );

  useEffect(() => {
    const fromUrl = searchParams.get('q') ?? '';
    setQuery((prev) => (prev === fromUrl ? prev : fromUrl));
  }, [searchParams]);

  useEffect(() => {
    const syncHash = () => {
      setUrlHash(typeof window !== 'undefined' ? window.location.hash : '');
    };
    syncHash();
    window.addEventListener('hashchange', syncHash);
    window.addEventListener('popstate', syncHash);
    return () => {
      window.removeEventListener('hashchange', syncHash);
      window.removeEventListener('popstate', syncHash);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (linkCopyTimerRef.current) clearTimeout(linkCopyTimerRef.current);
      if (hashCopyTimerRef.current) clearTimeout(hashCopyTimerRef.current);
      if (sectionLinkTimerRef.current) clearTimeout(sectionLinkTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const ae = document.activeElement;
        if (
          ae instanceof HTMLInputElement ||
          ae instanceof HTMLTextAreaElement ||
          ae instanceof HTMLSelectElement
        ) {
          if (ae === filterInputRef.current) return;
          return;
        }
        if (ae instanceof HTMLElement && ae.isContentEditable) return;
        e.preventDefault();
        filterInputRef.current?.focus();
        return;
      }

      if ((e.key !== 'k' && e.key !== 'K') || (!e.ctrlKey && !e.metaKey)) return;
      const ae = document.activeElement;
      if (
        ae instanceof HTMLInputElement ||
        ae instanceof HTMLTextAreaElement ||
        ae instanceof HTMLSelectElement
      ) {
        if (ae === filterInputRef.current) return;
        return;
      }
      e.preventDefault();
      filterInputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const copyPath = (p: string) => {
    void navigator.clipboard.writeText(p).then(() => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      setCopiedPath(p);
      copyTimerRef.current = setTimeout(() => {
        setCopiedPath((c) => (c === p ? null : c));
        copyTimerRef.current = null;
      }, 1600);
    });
  };

  const copyPageUrl = () => {
    void navigator.clipboard.writeText(window.location.href).then(() => {
      if (linkCopyTimerRef.current) clearTimeout(linkCopyTimerRef.current);
      setPageLinkCopied(true);
      linkCopyTimerRef.current = setTimeout(() => {
        setPageLinkCopied(false);
        linkCopyTimerRef.current = null;
      }, 1600);
    });
  };

  const copyHashFragment = () => {
    const h = typeof window !== 'undefined' ? window.location.hash : '';
    if (!h) return;
    void navigator.clipboard.writeText(h).then(() => {
      if (hashCopyTimerRef.current) clearTimeout(hashCopyTimerRef.current);
      setHashFragmentCopied(true);
      hashCopyTimerRef.current = setTimeout(() => {
        setHashFragmentCopied(false);
        hashCopyTimerRef.current = null;
      }, 1600);
    });
  };

  const clearSearch = () => {
    setQuery('');
    pushQueryToUrl('');
    filterInputRef.current?.focus();
  };

  const copySectionLink = (title: string) => {
    const id = sectionHeadingId(title);
    const u = new URL(window.location.href);
    u.hash = id;
    void navigator.clipboard.writeText(u.toString()).then(() => {
      if (sectionLinkTimerRef.current) clearTimeout(sectionLinkTimerRef.current);
      setCopiedSectionId(id);
      sectionLinkTimerRef.current = setTimeout(() => {
        setCopiedSectionId(null);
        sectionLinkTimerRef.current = null;
      }, 1600);
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;

    return sections
      .map((section) => {
        const titleMatch = section.title.toLowerCase().includes(q);
        const pathMatches = section.paths.filter((p) => p.toLowerCase().includes(q));
        if (titleMatch) return section;
        if (pathMatches.length === 0) return null;
        return { title: section.title, paths: pathMatches };
      })
      .filter((s): s is DocSection => s !== null);
  }, [sections, query]);

  const visiblePathCount = useMemo(
    () => filtered.reduce((n, s) => n + s.paths.length, 0),
    [filtered],
  );

  const totalPathCount = useMemo(
    () => sections.reduce((n, s) => n + s.paths.length, 0),
    [sections],
  );

  const showQuickJump = useMemo(() => {
    const q = query.trim();
    return (q ? filtered : sections).length > 0;
  }, [query, filtered, sections]);

  const searchAriaControls = useMemo(() => {
    const q = query.trim();
    const parts: string[] = [];
    if (showQuickJump) parts.push('dev-docs-quick-jump');
    parts.push('dev-docs-list');
    if (q && filtered.length === 0) parts.push('dev-docs-empty');
    return parts.join(' ');
  }, [query, filtered.length, showQuickJump]);

  useEffect(() => {
    const scrollToHashSection = () => {
      const id = window.location.hash.slice(1);
      if (id === 'dev-docs-filter') {
        requestAnimationFrame(() => {
          const el = filterInputRef.current;
          if (!el) return;
          el.focus();
          el.scrollIntoView({ behavior: hashScrollBehavior(), block: 'center' });
        });
        return;
      }
      if (id === 'dev-docs-search') {
        requestAnimationFrame(() => {
          const el = document.getElementById('dev-docs-search');
          if (!(el instanceof HTMLElement)) return;
          el.scrollIntoView({ behavior: hashScrollBehavior(), block: 'start' });
        });
        return;
      }
      if (!id.startsWith('sec-')) return;
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (!(el instanceof HTMLElement)) return;
        el.scrollIntoView({ behavior: hashScrollBehavior(), block: 'start' });
        el.focus({ preventScroll: true });
      });
    };
    scrollToHashSection();
    window.addEventListener('hashchange', scrollToHashSection);
    return () => window.removeEventListener('hashchange', scrollToHashSection);
  }, [filtered]);

  return (
    <>
      <nav
        aria-label="Preskok na sadržaj"
        className="fixed left-4 top-4 z-[100] flex -translate-y-[200vh] flex-col gap-2 transition motion-reduce:transition-none focus-within:translate-y-0"
      >
        <a
          href="#dev-docs-filter"
          className="rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white shadow-lg outline-none ring-violet-300 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950"
        >
          Preskoči na pretragu
        </a>
        <a
          href="#dev-docs-search"
          className="rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white shadow-lg outline-none ring-violet-300 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950"
          title="Skroluje do cele oblasti pretrage (sidro #dev-docs-search)"
        >
          Preskoči na oblast pretrage
        </a>
        {showQuickJump ? (
          <a
            href="#dev-docs-quick-jump"
            className="rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white shadow-lg outline-none ring-violet-300 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950"
          >
            Preskoči na Brzi skok
          </a>
        ) : null}
        <a
          href="#dev-docs-list"
          className="rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white shadow-lg outline-none ring-violet-300 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950"
        >
          Preskoči na listu dokumenata
        </a>
      </nav>
      <div
        id="dev-docs-search"
        className="mt-6 scroll-mt-20"
        role="search"
        aria-label="Pretraga repo putanja dokumenata"
      >
        <label htmlFor="dev-docs-filter" className="text-sm text-gray-400">
          Filtriraj putanje ili naslov sekcije (podudaranje je istaknuto;{' '}
          <kbd className="rounded border border-gray-600 bg-gray-900 px-1 font-mono text-xs text-gray-300">
            Esc
          </kbd>{' '}
          briše upit;{' '}
          <kbd className="rounded border border-gray-600 bg-gray-900 px-1 font-mono text-xs text-gray-300">
            Ctrl
          </kbd>
          {' / '}
          <kbd className="rounded border border-gray-600 bg-gray-900 px-1 font-mono text-xs text-gray-300">
            ⌘
          </kbd>
          {' + '}
          <kbd className="rounded border border-gray-600 bg-gray-900 px-1 font-mono text-xs text-gray-300">
            K
          </kbd>
          {' '}
          ili{' '}
          <kbd className="rounded border border-gray-600 bg-gray-900 px-1 font-mono text-xs text-gray-300">
            /
          </kbd>{' '}
          (van drugih polja) fokusira ovo polje; upit se i u URL-u kao{' '}
          <code className="text-violet-400">?q=…</code>; dugme <strong className="font-normal text-gray-300">Link</strong> kopira pun URL; dugme <strong className="font-normal text-gray-300">Hash</strong> kopira samo fragment iz adrese (npr. <code className="text-violet-400">#sec-…</code>) kad postoji; kada ima upita, dugme <strong className="font-normal text-gray-300">Obriši</strong> ga skida i iz adrese; pored svakog naslova sekcije: kopiraj URL sa <code className="text-violet-400">#sec-…</code>)
        </label>
        <div className="mt-2 flex max-w-xl flex-wrap items-stretch gap-2">
          <input
            ref={filterInputRef}
            id="dev-docs-filter"
            type="search"
            aria-controls={searchAriaControls}
            aria-describedby="dev-docs-search-stats"
            aria-keyshortcuts="Control+K Meta+K Slash"
            value={query}
            onChange={(e) => {
              const v = e.target.value;
              setQuery(v);
              pushQueryToUrl(v);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                clearSearch();
              }
            }}
            placeholder="npr. staging, smoke, NIVO-1…"
            autoComplete="off"
            className="min-w-[12rem] flex-1 rounded-md border border-gray-600 bg-gray-950/80 px-3 py-2 text-gray-200 placeholder:text-gray-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          {query.trim() ? (
            <button
              type="button"
              onClick={() => clearSearch()}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-gray-600 bg-gray-900/80 px-3 py-2 text-sm text-gray-300 hover:border-rose-500/40 hover:text-rose-200"
              aria-label="Obriši pretragu i ukloni q iz URL-a"
              title="Obriši filter"
            >
              <X className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Obriši</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => copyPageUrl()}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-gray-600 bg-gray-900/80 px-3 py-2 text-sm text-gray-300 hover:border-violet-500/50 hover:text-violet-200"
            aria-label="Kopiraj pun URL ove stranice (uključujući filter u adresi)"
            title="Kopiraj link stranice"
          >
            {pageLinkCopied ? (
              <Check className="h-4 w-4 text-emerald-400" aria-hidden />
            ) : (
              <Link2 className="h-4 w-4 text-gray-400" aria-hidden />
            )}
            <span className="hidden sm:inline">{pageLinkCopied ? 'Kopirano' : 'Link'}</span>
          </button>
          <button
            type="button"
            disabled={!urlHash}
            onClick={() => copyHashFragment()}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-gray-600 bg-gray-900/80 px-3 py-2 text-sm text-gray-300 hover:border-violet-500/50 hover:text-violet-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-600 disabled:hover:text-gray-300"
            aria-label="Kopiraj samo hash iz URL-a (npr. #sec-… ili #dev-docs-list)"
            title={urlHash ? `Kopiraj: ${urlHash}` : 'U adresi trenutno nema hash-a'}
          >
            {hashFragmentCopied ? (
              <Check className="h-4 w-4 text-emerald-400" aria-hidden />
            ) : (
              <Hash className="h-4 w-4 text-gray-400" aria-hidden />
            )}
            <span className="hidden sm:inline">{hashFragmentCopied ? 'Kopirano' : 'Hash'}</span>
          </button>
        </div>
        <output
          id="dev-docs-search-stats"
          htmlFor="dev-docs-filter"
          aria-label="Statistika: broj sekcija i putanja (posle filtera)"
          className="mt-2 block text-xs text-gray-500"
          aria-live="polite"
          aria-relevant="text"
        >
          {query.trim()
            ? `Prikaz: ${filtered.length} sekcija · ${visiblePathCount} putanja`
            : `Ukupno: ${sections.length} sekcija · ${totalPathCount} putanja`}
        </output>
      </div>
      {showQuickJump ? (
        <nav
          id="dev-docs-quick-jump"
          aria-label={
            query.trim()
              ? 'Brzi skok — trenutno prikazane sekcije (posle filtera)'
              : 'Brzi skok — sve sekcije'
          }
          className="mt-4 rounded-lg border border-gray-700/80 bg-gray-950/40 px-4 py-3"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Brzi skok</p>
          {query.trim() ? (
            <p className="mt-1 text-xs text-gray-600">Samo sekcije koje odgovaraju filteru.</p>
          ) : null}
          <ul className="mt-2 flex list-none flex-wrap gap-x-3 gap-y-1.5 pl-0">
            {(query.trim() ? filtered : sections).map((s) => (
              <li key={s.title}>
                <a
                  href={`#${sectionHeadingId(s.title)}`}
                  className="text-sm text-violet-400 decoration-violet-500/40 underline-offset-2 hover:text-violet-300 hover:underline"
                >
                  {highlightMatch(s.title, query)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <section
        id="dev-docs-list"
        aria-label="Lista dokumenata u repou po sekcijama"
        tabIndex={-1}
        className="scroll-mt-8 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
      >
        {filtered.length === 0 ? (
          <div
            id="dev-docs-empty"
            role="status"
            aria-live="polite"
            className="mt-8 rounded-lg border border-amber-500/20 bg-amber-950/15 px-4 py-5"
          >
            <p className="text-gray-200">
              Nema pogodaka za{' '}
              <q className="font-mono text-sm text-violet-300">{query.trim()}</q>.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Proveri pravopis ili skrati upit. Filter brišeš dugmetom <strong className="font-normal text-gray-400">Obriši</strong> pored polja, ili <strong className="font-normal text-gray-400">Esc</strong>.
            </p>
            <button
              type="button"
              onClick={() => clearSearch()}
              className="mt-4 inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-900/80 px-3 py-2 text-sm text-gray-200 hover:border-violet-500/50 hover:text-violet-200"
            >
              <X className="h-4 w-4 text-gray-400" aria-hidden />
              Obriši filter
            </button>
          </div>
        ) : (
          filtered.map((section, i) => {
            const headingId = sectionHeadingId(section.title);
            return (
            <div key={section.title} className={i === 0 ? 'mt-8' : 'mt-10'}>
              <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
                <h2
                  id={headingId}
                  tabIndex={-1}
                  className="min-w-0 flex-1 scroll-mt-20 text-lg font-semibold tracking-tight text-gray-200 outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                >
                  {highlightMatch(section.title, query)}
                </h2>
                <button
                  type="button"
                  onClick={() => copySectionLink(section.title)}
                  className="inline-flex shrink-0 items-center justify-center rounded border border-gray-600 bg-gray-900/80 p-1.5 text-gray-400 hover:border-violet-500/50 hover:text-violet-300"
                  aria-label={`Kopiraj link na sekciju: ${section.title}`}
                  title="Kopiraj link na ovu sekciju (trenutni URL + hash)"
                >
                  {copiedSectionId === headingId ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                  ) : (
                    <Link2 className="h-3.5 w-3.5" aria-hidden />
                  )}
                </button>
              </div>
              <ul className="mt-3 list-none space-y-2 pl-0 text-gray-300">
                {section.paths.map((p) => (
                  <li
                    key={p}
                    className="flex flex-wrap items-center gap-2 border-l-2 border-gray-700 pl-3"
                  >
                    <code className="break-all text-violet-300">{highlightMatch(p, query)}</code>
                    <button
                      type="button"
                      onClick={() => copyPath(p)}
                      className="inline-flex shrink-0 items-center justify-center rounded border border-gray-600 bg-gray-900/80 p-1.5 text-gray-400 hover:border-violet-500/50 hover:text-violet-300"
                      aria-label={`Kopiraj putanju ${p}`}
                      title="Kopiraj putanju"
                    >
                      {copiedPath === p ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                      ) : (
                        <Copy className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            );
          })
        )}
      </section>
    </>
  );
}
