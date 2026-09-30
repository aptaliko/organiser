'use client';

import { useMemo, useState } from 'react';
import { useT } from '@/i18n/I18nProvider';
import { matchesQuery, normalizeForSearch } from '@/lib/search';
import { XIcon } from './icons';

export interface TagOption {
  id: number;
  name: string;
  color: string;
}

/** Chips + type-ahead. Typing a new name offers to create it (shared with the household). */
export function TagInput({
  allTags,
  value,
  onChange,
}: {
  allTags: TagOption[];
  value: TagOption[];
  onChange: (tags: TagOption[]) => void;
}) {
  const { t } = useT();
  const [known, setKnown] = useState(allTags);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = new Set(value.map((tag) => tag.id));
  const suggestions = useMemo(
    () => (query.trim() ? known.filter((tag) => !selected.has(tag.id) && matchesQuery(tag.name, query)).slice(0, 6) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [known, query, value],
  );
  const exact = known.some((tag) => normalizeForSearch(tag.name) === normalizeForSearch(query));

  function add(tag: TagOption) {
    if (!selected.has(tag.id)) onChange([...value, tag]);
    setQuery('');
  }

  async function create() {
    const name = query.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const tag = (await res.json()) as TagOption;
        setKnown((k) => (k.some((x) => x.id === tag.id) ? k : [...k, tag]));
        add(tag);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <li key={tag.id}>
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x.id !== tag.id))}
                aria-label={t('tags.remove', { name: tag.name })}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full py-1 pl-3 pr-2 text-sm font-medium text-white"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (suggestions[0]) add(suggestions[0]);
              else if (!exact) void create();
            }
          }}
          placeholder={t('tags.placeholder')}
          className="min-h-12 w-full rounded-xl border border-border bg-surface px-4 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
        {query.trim() && (
          <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
            {suggestions.map((tag) => (
              <li key={tag.id}>
                <button type="button" onClick={() => add(tag)} className="flex min-h-11 w-full items-center gap-2 px-4 text-left hover:bg-surface-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </button>
              </li>
            ))}
            {!exact && (
              <li>
                <button type="button" onClick={create} disabled={busy} className="flex min-h-11 w-full items-center px-4 text-left font-medium text-accent hover:bg-surface-2">
                  {t('tags.create', { name: query.trim() })}
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
