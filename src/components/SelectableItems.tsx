'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useT } from '@/i18n/I18nProvider';
import type { Dims } from '@/lib/units';
import { ChevronRightIcon } from './icons';
import type { PickerArea } from './LocationPicker';
import { MoveSheet } from './MoveSheet';
import { SectionTitle } from './Rows';
import { Thumb } from './Thumb';
import { Button } from './ui';

export interface SelectableItem extends Dims {
  id: number;
  name: string;
  quantity: number;
  coverUrl: string | null;
  subtitle: string | null;
}

/**
 * An item list with a "Select" mode: tick several, then "Move N to…" — the
 * "I reorganised the shelf" case.
 */
export function SelectableItems({
  title,
  emptyText,
  items,
  pickerAreas,
  householdId,
}: {
  title: string;
  emptyText: string;
  items: SelectableItem[];
  pickerAreas: PickerArea[];
  householdId: number;
}) {
  const { t } = useT();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [moving, setMoving] = useState(false);

  const toggle = (id: number) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const stop = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  return (
    <>
      <SectionTitle
        action={
          items.length > 0 && (
            <button onClick={() => (selecting ? stop() : setSelecting(true))} className="min-h-10 rounded-lg px-2 text-sm font-semibold text-accent">
              {selecting ? t('move.cancelSelect') : t('move.select')}
            </button>
          )
        }
      >
        {title}
      </SectionTitle>
      {items.length === 0 ? (
        <p className="px-2 py-4 text-muted">{emptyText}</p>
      ) : (
        <ul>
          {items.map((i) => {
            const body = (
              <>
                <Thumb url={i.coverUrl} kind="item" size={48} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium">{i.name}</span>
                    {i.quantity > 1 && (
                      <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">×{i.quantity}</span>
                    )}
                  </span>
                  {i.subtitle && <span className="block truncate text-sm text-muted">{i.subtitle}</span>}
                </span>
              </>
            );
            return (
              <li key={i.id}>
                {selecting ? (
                  <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl px-2 py-2 hover:bg-surface-2">
                    <input
                      type="checkbox"
                      checked={selected.has(i.id)}
                      onChange={() => toggle(i.id)}
                      aria-label={t('move.selectItem', { name: i.name })}
                      className="h-6 w-6 shrink-0 accent-[var(--accent)]"
                    />
                    {body}
                  </label>
                ) : (
                  <Link href={`/items/${i.id}`} className="flex min-h-16 items-center gap-3 rounded-2xl px-2 py-2 hover:bg-surface-2">
                    {body}
                    <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted" />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {/* Room to scroll the last rows above the floating "Move N to…" bar. */}
      {selecting && <div aria-hidden className="h-20" />}
      {selecting && selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-4 pb-3">
          <Button className="mx-auto flex w-full max-w-2xl items-center justify-center shadow-lg" onClick={() => setMoving(true)}>
            {t('move.moveSelected', { count: selected.size })}
          </Button>
        </div>
      )}
      {moving && (
        <MoveSheet
          items={items.filter((i) => selected.has(i.id)).map((i) => ({ id: i.id, name: i.name, quantity: i.quantity }))}
          pickerAreas={pickerAreas}
          householdId={householdId}
          onClose={(moved) => {
            setMoving(false);
            if (moved) stop();
          }}
        />
      )}
    </>
  );
}
