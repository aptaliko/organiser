'use client';

import Link from 'next/link';
import { useT } from '@/i18n/I18nProvider';
import { formatPath } from '@/lib/areaTree';
import { formatVolume } from '@/lib/units';
import { Thumb } from './Thumb';
import { useMoveAction } from './useMoveAction';

export interface PlaceOption {
  id: number;
  name: string;
  path: { name: string }[];
  coverUrl: string | null;
  free: number;
}

/** "Where would it fit?" — places with room for the whole item, emptiest first. */
export function FindPlace({ itemId, options }: { itemId: number; options: PlaceOption[] }) {
  const { t, locale } = useT();
  const { move, dialog } = useMoveAction();
  if (options.length === 0) return <p className="px-2 text-sm text-muted">{t('findPlace.none')}</p>;
  return (
    <>
    <ul>
      {options.map((o) => (
        <li key={o.id} className="flex items-center gap-3 rounded-2xl px-2 py-2">
          <Link href={`/areas/${o.id}`} className="flex min-w-0 flex-1 items-center gap-3">
            <Thumb url={o.coverUrl} kind="area" size={44} />
            <span className="min-w-0">
              <span className="block truncate font-medium">{o.name}</span>
              <span className="block truncate text-xs text-muted">
                {[o.path.length ? formatPath(o.path) : null, t('space.free', { free: formatVolume(o.free, locale) })]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
          </Link>
          <button
            onClick={() => move({ items: [{ id: itemId }], targetAreaId: o.id }, t('move.moved', { name: o.name }))}
            className="min-h-11 shrink-0 rounded-xl bg-accent-soft px-3 text-sm font-semibold text-accent"
          >
            {t('findPlace.moveHere')}
          </button>
        </li>
      ))}
    </ul>
    {dialog}
    </>
  );
}
