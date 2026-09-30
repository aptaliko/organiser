'use client';

import { useRouter } from 'next/navigation';
import { useT } from '@/i18n/I18nProvider';
import { ChevronLeftIcon } from './icons';

/** Title row with a back button (browser history when there is some, else `fallback`). */
export function PageHeader({ title, fallback = '/', actions }: { title: string; fallback?: string; actions?: React.ReactNode }) {
  const { t } = useT();
  const router = useRouter();
  return (
    <div className="mb-4 flex items-center gap-2">
      <button
        onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
        aria-label={t('common.back')}
        className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-surface-2"
      >
        <ChevronLeftIcon className="h-6 w-6" />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-xl font-bold">{title}</h1>
      {actions}
    </div>
  );
}
