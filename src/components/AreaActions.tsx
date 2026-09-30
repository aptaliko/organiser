'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/i18n/I18nProvider';
import type { SearchResponse } from '@/lib/searchService';
import { formatPath } from '@/lib/areaTree';
import { SearchIcon } from './icons';
import type { PickerArea } from './LocationPicker';
import { MoveSheet } from './MoveSheet';
import { Sheet } from './Sheet';
import { Thumb } from './Thumb';
import { useMoveAction } from './useMoveAction';
import { Button } from './ui';

/** Area page: move this place (with everything in it), or pull items into it. */
export function AreaActions({
  area,
  pickerAreas,
  householdId,
}: {
  area: { id: number; name: string };
  pickerAreas: PickerArea[];
  householdId: number;
}) {
  const { t } = useT();
  const [movingPlace, setMovingPlace] = useState(false);
  const [pulling, setPulling] = useState(false);
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button variant="secondary" className="px-2 text-sm" onClick={() => setPulling(true)}>
        {t('move.moveItemsHere')}
      </Button>
      <Button variant="secondary" className="px-2 text-sm" onClick={() => setMovingPlace(true)}>
        {t('move.movePlace')}
      </Button>
      {movingPlace && (
        <MoveSheet areaIds={[area.id]} pickerAreas={pickerAreas} householdId={householdId} onClose={() => setMovingPlace(false)} />
      )}
      {pulling && <MoveItemsHere area={area} onClose={() => setPulling(false)} />}
    </div>
  );
}

/** Search items anywhere, tick them, bring them into this place (natural when packing a box). */
function MoveItemsHere({ area, onClose }: { area: { id: number; name: string }; onClose: () => void }) {
  const { t } = useT();
  const { move, dialog } = useMoveAction();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse['items']>([]);
  const [selected, setSelected] = useState<Map<number, string>>(new Map());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (res.ok) setResults(((await res.json()) as SearchResponse).items);
      } catch {
        // aborted or offline: keep the previous results
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  async function submit() {
    setBusy(true);
    const ok = await move(
      { items: [...selected.keys()].map((id) => ({ id })), targetAreaId: area.id },
      selected.size > 1 ? t('move.movedCount', { count: selected.size, name: area.name }) : t('move.moved', { name: area.name }),
    );
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Sheet open onClose={onClose} title={t('move.moveItemsHere')} closeLabel={t('common.close')}>
      <label className="relative mb-3 block">
        <span className="sr-only">{t('move.findItems')}</span>
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('move.findItems')}
          className="min-h-12 w-full rounded-xl border border-border bg-surface-2 pl-10 pr-3 text-base outline-none focus:border-accent"
        />
      </label>
      <ul className="mb-3">
        {results.map((i) => {
          const here = i.areaId === area.id;
          return (
            <li key={i.id}>
              <label className={`flex min-h-14 items-center gap-3 rounded-xl px-2 ${here ? 'opacity-50' : 'cursor-pointer hover:bg-surface-2'}`}>
                <input
                  type="checkbox"
                  disabled={here}
                  checked={selected.has(i.id)}
                  onChange={() =>
                    setSelected((s) => {
                      const next = new Map(s);
                      if (next.has(i.id)) next.delete(i.id);
                      else next.set(i.id, i.name);
                      return next;
                    })
                  }
                  className="h-6 w-6 shrink-0 accent-[var(--accent)]"
                />
                <Thumb url={i.thumbUrl} kind="item" size={40} />
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {i.name}
                    {i.quantity > 1 && <span className="text-muted"> ×{i.quantity}</span>}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {here ? t('move.alreadyHere') : i.path.length ? formatPath(i.path) : t('search.unplaced')}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <Button className="sticky bottom-0 w-full" disabled={selected.size === 0 || busy} onClick={submit}>
        {t('move.moveNHere', { count: selected.size })}
      </Button>
      {dialog}
    </Sheet>
  );
}
