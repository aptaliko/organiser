'use client';

import { useState } from 'react';
import { useT } from '@/i18n/I18nProvider';
import { formatLength, parseLength, type Dims } from '@/lib/units';

type Side = keyof Dims;
const SIDES: { key: Side; label: 'form.width' | 'form.depth' | 'form.height' }[] = [
  { key: 'widthCm', label: 'form.width' },
  { key: 'depthCm', label: 'form.depth' },
  { key: 'heightCm', label: 'form.height' },
];

/**
 * Three free-text boxes (W × D × H). People type "45", "45 cm" or "1,2 m"; we store cm.
 * Reports `null` via onChange while any box holds something unparseable.
 */
export function DimsInput({ initial, onChange }: { initial: Dims; onChange: (dims: Dims | null) => void }) {
  const { t, locale } = useT();
  const [raw, setRaw] = useState<Record<Side, string>>({
    widthCm: initial.widthCm?.toString() ?? '',
    depthCm: initial.depthCm?.toString() ?? '',
    heightCm: initial.heightCm?.toString() ?? '',
  });

  function update(side: Side, text: string) {
    const next = { ...raw, [side]: text };
    setRaw(next);
    const parsed = SIDES.map(({ key }) => parseLength(next[key]));
    onChange(
      parsed.some((v) => Number.isNaN(v))
        ? null
        : { widthCm: parsed[0], depthCm: parsed[1], heightCm: parsed[2] },
    );
  }

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">{t('form.dimensions')}</legend>
      <div className="grid grid-cols-3 gap-2">
        {SIDES.map(({ key, label }) => {
          const value = parseLength(raw[key]);
          const invalid = Number.isNaN(value);
          // Show what we understood when the person typed a unit ("1,2 m" → "1,2 m" = 120 cm).
          const echo = value && !invalid && !/^\d+$/.test(raw[key].trim()) ? formatLength(value, locale) : null;
          return (
            <label key={key} className="flex flex-col gap-1">
              <span className="text-xs text-muted">{t(label)}</span>
              <span className="relative">
                <input
                  value={raw[key]}
                  onChange={(e) => update(key, e.target.value)}
                  inputMode="decimal"
                  aria-invalid={invalid}
                  className="min-h-12 w-full rounded-xl border border-border bg-surface px-3 pr-9 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 aria-[invalid=true]:border-danger"
                />
                {/^\d*$/.test(raw[key].trim()) && (
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">cm</span>
                )}
              </span>
              {echo && <span className="text-xs text-muted">= {echo}</span>}
            </label>
          );
        })}
      </div>
      {SIDES.some(({ key }) => Number.isNaN(parseLength(raw[key]))) ? (
        <span className="text-sm text-danger">{t('form.invalidLength')}</span>
      ) : (
        <span className="text-sm text-muted">{t('form.dimensionsHint')}</span>
      )}
    </fieldset>
  );
}
