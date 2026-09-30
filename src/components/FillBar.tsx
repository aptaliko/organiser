'use client';

import { useT } from '@/i18n/I18nProvider';
import type { Usage } from '@/lib/space';
import { formatVolume } from '@/lib/units';

/** "62% full · ~0.4 m³ free" with a coloured bar; honest about unknowns and missing dims. */
export function FillBar({ usage }: { usage: Usage }) {
  const { t, locale } = useT();
  if (usage.capacity === null || usage.percent === null || usage.free === null) {
    return <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">{t('space.noDims')}</p>;
  }
  const pct = Math.round(usage.percent);
  const color = usage.percent >= 95 ? 'bg-danger' : usage.percent >= 70 ? 'bg-amber-500' : 'bg-accent';
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold">{t('space.full', { percent: pct })}</span>
        <span className={usage.free < 0 ? 'font-medium text-danger' : 'text-muted'}>
          {usage.free < 0
            ? t('space.over', { over: formatVolume(-usage.free, locale) })
            : t('space.free', { free: formatVolume(usage.free, locale) })}
        </span>
      </div>
      <div
        className="h-3 overflow-hidden rounded-full bg-surface-2"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, pct)}
        aria-label={t('space.title')}
      >
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(2, usage.percent))}%` }} />
      </div>
      {usage.unknownCount > 0 && (
        <p className="mt-2 text-xs text-muted">
          {usage.unknownCount === 1 ? t('space.unknownOne') : t('space.unknown', { count: usage.unknownCount })}
        </p>
      )}
    </div>
  );
}
