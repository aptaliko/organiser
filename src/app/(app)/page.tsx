import { SearchIcon } from '@/components/icons';
import { getT } from '@/i18n/server';

// Placeholder home — the real search arrives in milestone M3 (plan Task 15).
export default async function SearchPage() {
  const { t } = await getT();
  return (
    <div className="flex flex-col gap-6">
      <label className="relative block">
        <span className="sr-only">{t('nav.search')}</span>
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <input
          type="search"
          placeholder={t('search.placeholder')}
          className="min-h-14 w-full rounded-2xl border border-border bg-surface pl-12 pr-4 text-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
      </label>
      <div className="mt-8 text-center">
        <h1 className="text-lg font-semibold">{t('search.emptyTitle')}</h1>
        <p className="mx-auto mt-2 max-w-sm text-muted">{t('search.emptyBody')}</p>
      </div>
    </div>
  );
}
