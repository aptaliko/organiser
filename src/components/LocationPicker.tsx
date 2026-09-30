'use client';

import { useMemo, useState } from 'react';
import { useT } from '@/i18n/I18nProvider';
import { buildTree, byName, formatPath, pathTo } from '@/lib/areaTree';
import { loadRecent } from '@/lib/recentLocations';
import { matchesQuery } from '@/lib/search';
import { ChevronRightIcon, ClockIcon, PlusIcon, SearchIcon } from './icons';
import { Sheet } from './Sheet';
import { Thumb } from './Thumb';
import { Button } from './ui';

export interface PickerArea {
  id: number;
  parentId: number | null;
  name: string;
  coverUrl: string | null;
}

/**
 * Choose a place: recent places first, then search, then browse the tree. Tapping a row
 * chooses it; the chevron opens it to go deeper. A new place can be created on the spot.
 */
export function LocationPicker({
  open,
  onClose,
  areas,
  householdId,
  onSelect,
  onCreated,
  noneLabel,
  disabledIds,
}: {
  open: boolean;
  onClose: () => void;
  areas: PickerArea[];
  householdId: number;
  onSelect: (areaId: number | null) => void;
  onCreated: (area: PickerArea) => void;
  /** When set, offers a "no place" option with this label (Unplaced / Top level). */
  noneLabel?: string;
  /** Areas that can't be chosen (e.g. a place and its subtree, when moving it). */
  disabledIds?: Set<number>;
}) {
  const { t } = useT();
  const [query, setQuery] = useState('');
  const [browseId, setBrowseId] = useState<number | null>(null);
  const [newName, setNewName] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  // Read once per opening; localStorage is client-only and this component only renders on open.
  const [recentIds] = useState(() => (typeof window === 'undefined' ? [] : loadRecent(householdId)));

  const byId = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);
  const childCount = useMemo(() => {
    const counts = new Map<number, number>();
    for (const a of areas) if (a.parentId != null) counts.set(a.parentId, (counts.get(a.parentId) ?? 0) + 1);
    return counts;
  }, [areas]);
  const level = useMemo(
    () => (browseId === null ? buildTree(areas) : areas.filter((a) => a.parentId === browseId).sort(byName)),
    [areas, browseId],
  );
  const matches = useMemo(
    () => (query.trim() ? areas.filter((a) => matchesQuery(a.name, query)).sort(byName).slice(0, 50) : []),
    [areas, query],
  );
  const recent = recentIds.map((id) => byId.get(id)).filter((a): a is PickerArea => !!a && !disabledIds?.has(a.id));
  const browsePath = browseId !== null ? pathTo(byId, browseId) : [];

  function choose(id: number | null) {
    onSelect(id);
    onClose();
  }

  async function create() {
    const name = newName?.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch('/api/areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentId: browseId }),
      });
      if (res.ok) {
        const { id } = (await res.json()) as { id: number };
        onCreated({ id, name, parentId: browseId, coverUrl: null });
        setNewName(null);
        choose(id);
      }
    } finally {
      setCreating(false);
    }
  }

  const row = (a: PickerArea, showPath = false) => {
    const disabled = disabledIds?.has(a.id);
    const kids = childCount.get(a.id) ?? 0;
    return (
      <li key={a.id} className="flex items-stretch">
        <button
          type="button"
          disabled={disabled}
          onClick={() => choose(a.id)}
          className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl px-2 text-left hover:bg-surface-2 disabled:opacity-40"
        >
          <Thumb url={a.coverUrl} kind="area" size={40} />
          <span className="min-w-0">
            <span className="block truncate font-medium">{a.name}</span>
            {showPath && a.parentId != null && (
              <span className="block truncate text-xs text-muted">{formatPath(pathTo(byId, a.parentId))}</span>
            )}
          </span>
        </button>
        {kids > 0 && !showPath && (
          <button
            type="button"
            onClick={() => setBrowseId(a.id)}
            aria-label={t('picker.open', { name: a.name })}
            className="flex w-14 shrink-0 items-center justify-center gap-0.5 rounded-xl text-sm text-muted hover:bg-surface-2"
          >
            {kids}
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        )}
      </li>
    );
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('picker.title')} closeLabel={t('common.close')}>
      <label className="relative mb-3 block">
        <span className="sr-only">{t('picker.search')}</span>
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('picker.search')}
          className="min-h-12 w-full rounded-xl border border-border bg-surface-2 pl-10 pr-3 text-base outline-none focus:border-accent"
        />
      </label>

      {query.trim() ? (
        matches.length ? (
          <ul>{matches.map((a) => row(a, true))}</ul>
        ) : (
          <p className="py-6 text-center text-muted">{t('picker.noMatches')}</p>
        )
      ) : (
        <>
          {browseId === null && noneLabel && (
            <button
              type="button"
              onClick={() => choose(null)}
              className="mb-2 flex min-h-12 w-full items-center rounded-xl border border-dashed border-border px-4 text-left text-muted hover:bg-surface-2"
            >
              {noneLabel}
            </button>
          )}

          {browseId === null && recent.length > 0 && (
            <section className="mb-3">
              <h3 className="mb-1 flex items-center gap-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-muted">
                <ClockIcon className="h-3.5 w-3.5" /> {t('picker.recent')}
              </h3>
              <ul>{recent.map((a) => row(a, true))}</ul>
            </section>
          )}

          {browseId !== null && (
            <div className="mb-2 flex flex-col gap-2">
              <nav className="flex flex-wrap items-center gap-1 text-sm">
                <button type="button" onClick={() => setBrowseId(null)} className="rounded px-1 py-1 text-accent">
                  {t('picker.top')}
                </button>
                {browsePath.map((a, i) => (
                  <span key={a.id} className="inline-flex items-center gap-1">
                    <ChevronRightIcon className="h-3.5 w-3.5 text-muted" />
                    {i < browsePath.length - 1 ? (
                      <button type="button" onClick={() => setBrowseId(a.id)} className="rounded px-1 py-1 text-accent">
                        {a.name}
                      </button>
                    ) : (
                      <span className="px-1 font-semibold">{a.name}</span>
                    )}
                  </span>
                ))}
              </nav>
              {!disabledIds?.has(browseId) && (
                <Button type="button" onClick={() => choose(browseId)}>
                  {t('picker.here', { name: byId.get(browseId)?.name ?? '' })}
                </Button>
              )}
            </div>
          )}

          <section>
            {browseId === null && (recent.length > 0 || noneLabel) && (
              <h3 className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-muted">{t('picker.all')}</h3>
            )}
            <ul>{level.map((a) => row(a))}</ul>
          </section>

          {newName === null ? (
            <button
              type="button"
              onClick={() => setNewName('')}
              className="mt-2 flex min-h-12 w-full items-center gap-2 rounded-xl px-2 font-medium text-accent hover:bg-surface-2"
            >
              <PlusIcon className="h-5 w-5" />
              {browseId === null ? t('picker.newTopLevel') : t('picker.newHere')}
            </button>
          ) : (
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void create();
              }}
            >
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('picker.newName')}
                aria-label={t('picker.newName')}
                maxLength={120}
                className="min-h-12 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 text-base outline-none focus:border-accent"
              />
              <Button type="submit" disabled={creating || !newName.trim()}>
                {t('picker.create')}
              </Button>
            </form>
          )}
        </>
      )}
    </Sheet>
  );
}

/** Form field: shows the chosen place's path and opens the picker. */
export function LocationField({
  label,
  areas,
  onAreasChange,
  householdId,
  value,
  onChange,
  noneLabel,
  placeholder,
}: {
  label: string;
  areas: PickerArea[];
  onAreasChange: (areas: PickerArea[]) => void;
  householdId: number;
  value: number | null;
  onChange: (id: number | null) => void;
  noneLabel?: string;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const byId = new Map(areas.map((a) => [a.id, a]));
  const chosen = value !== null ? byId.get(value) : undefined;
  const path = value !== null ? pathTo(byId, value) : [];

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 text-left hover:border-accent"
      >
        <Thumb url={chosen?.coverUrl ?? null} kind="area" size={40} />
        <span className="min-w-0 flex-1">
          {chosen ? (
            <>
              <span className="block truncate font-medium">{chosen.name}</span>
              {path.length > 1 && <span className="block truncate text-xs text-muted">{formatPath(path.slice(0, -1))}</span>}
            </>
          ) : (
            <span className="text-muted">{value === null && noneLabel ? noneLabel : placeholder}</span>
          )}
        </span>
        <ChevronRightIcon className="h-5 w-5 text-muted" />
      </button>
      {open && (
        <LocationPicker
          open
          onClose={() => setOpen(false)}
          areas={areas}
          householdId={householdId}
          onSelect={onChange}
          onCreated={(a) => onAreasChange([...areas, a])}
          noneLabel={noneLabel}
        />
      )}
    </div>
  );
}
