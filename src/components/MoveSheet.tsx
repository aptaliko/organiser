'use client';

import { useMemo, useRef, useState } from 'react';
import { useT } from '@/i18n/I18nProvider';
import { descendantIds } from '@/lib/areaTree';
import { rememberRecent } from '@/lib/recentLocations';
import type { Dims } from '@/lib/units';
import { LocationPicker, type PickerArea } from './LocationPicker';
import { Sheet } from './Sheet';
import { useMoveAction } from './useMoveAction';
import { Button, TextInput } from './ui';

export interface MoveItem {
  id: number;
  name: string;
  quantity: number;
  dims?: Dims;
}

/**
 * The move flow: (for a single item with quantity > 1) "how many?", then the place picker
 * with free-space hints, then the shared move action (merge prompt, undo toast).
 * Mount it only while open.
 */
export function MoveSheet({
  items = [],
  areaIds = [],
  pickerAreas,
  householdId,
  onClose,
}: {
  items?: MoveItem[];
  areaIds?: number[];
  pickerAreas: PickerArea[];
  householdId: number;
  onClose: (moved: boolean) => void;
}) {
  const { t } = useT();
  const { move, dialog } = useMoveAction();
  const [areas, setAreas] = useState(pickerAreas);
  const single = items.length === 1 && areaIds.length === 0 ? items[0] : null;
  const [step, setStep] = useState<'quantity' | 'picker' | 'busy'>(single && single.quantity > 1 ? 'quantity' : 'picker');
  const [quantity, setQuantity] = useState(single?.quantity ?? 1);
  // The picker closes itself right after a choice; that close must not cancel the move.
  const choosing = useRef(false);

  // A place can't move into itself or anything inside it.
  const disabled = useMemo(() => {
    const ids = new Set<number>();
    for (const id of areaIds) for (const d of descendantIds(areas, id)) ids.add(d);
    return ids;
  }, [areas, areaIds]);

  async function choose(target: number | null) {
    choosing.current = true;
    setStep('busy');
    if (target !== null) rememberRecent(householdId, target);
    const targetName = target === null ? null : areas.find((a) => a.id === target)?.name ?? '';
    const count = items.length + areaIds.length;
    const message =
      target === null && items.length > 0 && areaIds.length === 0
        ? t('move.takenOut')
        : count > 1
          ? t('move.movedCount', { count, name: targetName ?? t('move.toTopLevel') })
          : t('move.moved', { name: targetName ?? t('move.toTopLevel') });
    const ok = await move(
      {
        items: items.map((i) => (single && quantity < i.quantity ? { id: i.id, quantity } : { id: i.id })),
        areas: areaIds,
        targetAreaId: target,
      },
      message,
    );
    onClose(ok);
  }

  return (
    <>
      {step === 'quantity' && single && (
        <Sheet open onClose={() => onClose(false)} title={t('move.howMany')} closeLabel={t('common.close')}>
          <p className="mb-3 font-medium">{single.name}</p>
          <div className="mb-4 flex items-center gap-2">
            <Button type="button" variant="secondary" className="w-12 px-0 text-xl" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="−1">
              −
            </Button>
            <TextInput
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(single.quantity, parseInt(e.target.value, 10) || 1)))}
              inputMode="numeric"
              className="!w-20 text-center"
              aria-label={t('move.howMany')}
            />
            <Button type="button" variant="secondary" className="w-12 px-0 text-xl" onClick={() => setQuantity((q) => Math.min(single.quantity, q + 1))} aria-label="+1">
              +
            </Button>
            <span className="text-muted">/ {single.quantity}</span>
          </div>
          <Button className="w-full" onClick={() => setStep('picker')}>
            {t('move.ofTotal', { count: quantity, total: single.quantity })}
          </Button>
        </Sheet>
      )}
      {step === 'picker' && (
        <LocationPicker
          open
          title={t('move.chooseTarget')}
          onClose={() => {
            if (!choosing.current) onClose(false);
          }}
          areas={areas}
          householdId={householdId}
          onSelect={(id) => void choose(id)}
          onCreated={(a) => setAreas((list) => [...list, a])}
          noneLabel={areaIds.length > 0 ? t('move.toTopLevel') : t('picker.none')}
          disabledIds={disabled}
          fitSubject={single?.dims ? { dims: single.dims, quantity } : undefined}
        />
      )}
      {dialog}
    </>
  );
}
