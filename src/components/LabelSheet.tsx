'use client';

import { useState } from 'react';
import { useT } from '@/i18n/I18nProvider';
import { Button } from './ui';

export interface Label {
  id: number;
  name: string;
  depth: number;
  code: string;
  path: string;
  svg: string;
}

/**
 * Choose places, preview, print. The printed page is only the label grid, laid out for the
 * common A4 sheets of 21 labels (3 × 7, 63.5 × 38.1 mm) — it also prints fine on plain paper.
 */
export function LabelSheet({ labels, initialSelected }: { labels: Label[]; initialSelected: number[] }) {
  const { t } = useT();
  const [selected, setSelected] = useState<Set<number>>(new Set(initialSelected));
  const chosen = labels.filter((l) => selected.has(l.id));

  const toggle = (id: number) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <div className="print:hidden">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t('labels.choose')}</h2>
          <button
            onClick={() => setSelected(selected.size === labels.length ? new Set() : new Set(labels.map((l) => l.id)))}
            className="min-h-10 px-2 text-sm font-semibold text-accent"
          >
            {selected.size === labels.length ? t('labels.selectNone') : t('labels.selectAll')}
          </button>
        </div>
        <ul className="mb-4 rounded-2xl border border-border bg-surface p-2">
          {labels.map((l) => (
            <li key={l.id}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 hover:bg-surface-2" style={{ paddingLeft: 8 + l.depth * 20 }}>
                <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} className="h-5 w-5 accent-[var(--accent)]" />
                <span className={l.depth === 0 ? 'font-semibold' : ''}>{l.name}</span>
              </label>
            </li>
          ))}
        </ul>
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 mb-4">
          <Button className="w-full shadow-lg" disabled={chosen.length === 0} onClick={() => window.print()}>
            {t('labels.print')} · {t('labels.selected', { count: chosen.length })}
          </Button>
        </div>
        {chosen.length === 0 && <p className="text-center text-sm text-muted">{t('labels.none')}</p>}
      </div>

      {/* Preview on screen = what gets printed. */}
      <div className="label-sheet grid grid-cols-2 gap-2 sm:grid-cols-3 print:gap-0">
        {chosen.map((l) => (
          <div key={l.id} className="label flex items-center gap-3 overflow-hidden rounded-lg border border-border bg-white p-2 text-black print:rounded-none print:border-dashed">
            <div className="label-qr aspect-square w-20 shrink-0" dangerouslySetInnerHTML={{ __html: l.svg }} />
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-bold leading-tight">{l.name}</p>
              {l.path && <p className="line-clamp-2 text-[10px] leading-tight text-gray-600">{l.path}</p>}
              <p className="mt-1 font-mono text-[10px] tracking-widest text-gray-500">{l.code}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
