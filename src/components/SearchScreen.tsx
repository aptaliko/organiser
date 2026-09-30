'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { useT } from '@/i18n/I18nProvider';
import { formatPath } from '@/lib/areaTree';
import type { SearchResponse } from '@/lib/searchService';
import { ChevronLeftIcon, PinIcon, SearchIcon, XIcon } from './icons';
import { SectionTitle } from './Rows';
import { Thumb } from './Thumb';

/**
 * The home screen: one big box, results as you type. Item results lead with *where* the
 * thing is (the whole point of the app). The query lives in the URL (`/?q=`, `/?tag=`) and
 * the server renders the results, so Back from an item returns to the same results.
 */
export function SearchScreen({
  query: urlQuery,
  tagId,
  data,
}: {
  query: string;
  tagId: number | null;
  data: SearchResponse;
}) {
  const { t } = useT();
  const router = useRouter();
  const [query, setQuery] = useState(urlQuery);
  const [loading, startTransition] = useTransition();

  useEffect(() => {
    if (tagId || query.trim() === urlQuery.trim()) return;
    const timer = setTimeout(() => {
      const q = query.trim();
      startTransition(() => router.replace(q ? `/?q=${encodeURIComponent(q)}` : '/', { scroll: false }));
    }, 250);
    return () => clearTimeout(timer);
  }, [query, urlQuery, tagId, router]);

  // `data` belongs to the URL's query; while the typed one is newer, show it dimmed.
  const q = urlQuery.trim();
  const stale = loading || query.trim() !== q;
  const nothing = q && !stale && !tagId && data.items.length + data.areas.length + data.tags.length === 0;

  return (
    <div className="flex flex-col">
      {tagId && data.tag ? (
        <div className="mb-2 flex items-center gap-2">
          <button
            onClick={() => router.back()}
            aria-label={t('search.showAll')}
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-2"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">
            <span className="mr-2 inline-block h-3 w-3 rounded-full" style={{ backgroundColor: data.tag.color }} />
            {t('search.tagged', { name: data.tag.name })}
          </h1>
        </div>
      ) : (
        <label className="relative block">
          <span className="sr-only">{t('nav.search')}</span>
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.placeholder')}
            enterKeyHint="search"
            autoComplete="off"
            className="min-h-14 w-full rounded-2xl border border-border bg-surface pl-12 pr-12 text-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label={t('search.clear')}
              className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-surface-2"
            >
              <XIcon className="h-5 w-5" />
            </button>
          )}
        </label>
      )}

      <div aria-busy={stale} className={stale ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
        {nothing && (
          <div className="mt-10 text-center">
            <p className="font-semibold">{t('search.noResults', { q })}</p>
            <p className="mt-1 text-muted">{t('search.noResultsHint')}</p>
          </div>
        )}

        {!q && !tagId && data.items.length === 0 && (
          <div className="mt-10 text-center">
            <h1 className="text-lg font-semibold">{t('search.emptyTitle')}</h1>
            <p className="mx-auto mt-2 max-w-sm text-muted">{t('search.emptyBody')}</p>
          </div>
        )}

        {data.tags.length > 0 && (
          <>
            <SectionTitle>{t('search.tags')}</SectionTitle>
            <ul className="flex flex-wrap gap-2 px-2">
              {data.tags.map((tag) => (
                <li key={tag.id}>
                  <button
                    onClick={() => router.push(`/?tag=${tag.id}`)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                    <span className="rounded-full bg-white/25 px-1.5 text-xs">{tag.itemCount}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {data.items.length > 0 && (
          <>
            <SectionTitle>{q || tagId ? t('search.items') : t('search.recent')}</SectionTitle>
            <ul>
              {data.items.map((i) => (
                <li key={i.id}>
                  <Link href={`/items/${i.id}`} className="flex min-h-18 items-center gap-3 rounded-2xl px-2 py-2 hover:bg-surface-2">
                    <Thumb url={i.thumbUrl} kind="item" size={56} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-semibold">{i.name}</span>
                        {i.quantity > 1 && (
                          <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">×{i.quantity}</span>
                        )}
                      </span>
                      <span className={`mt-0.5 flex items-start gap-1 text-sm ${i.path.length ? 'text-accent' : 'text-muted'}`}>
                        <PinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span className="line-clamp-2">{i.path.length ? formatPath(i.path) : t('search.unplaced')}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        {data.areas.length > 0 && (
          <>
            <SectionTitle>{t('search.places')}</SectionTitle>
            <ul>
              {data.areas.map((a) => (
                <li key={a.id}>
                  <Link href={`/areas/${a.id}`} className="flex min-h-16 items-center gap-3 rounded-2xl px-2 py-2 hover:bg-surface-2">
                    <Thumb url={a.thumbUrl} kind="area" size={48} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{a.name}</span>
                      {a.path.length > 0 && <span className="block truncate text-sm text-muted">{formatPath(a.path)}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
