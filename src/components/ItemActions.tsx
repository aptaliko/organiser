'use client';

import { useState } from 'react';
import { useT } from '@/i18n/I18nProvider';
import type { PickerArea } from './LocationPicker';
import { MoveSheet, type MoveItem } from './MoveSheet';
import { useMoveAction } from './useMoveAction';
import { Button } from './ui';

/** Item page: "Move" (picker, with "how many?" for quantities) and "Take out" (→ Unplaced). */
export function ItemActions({
  item,
  placed,
  pickerAreas,
  householdId,
}: {
  item: MoveItem;
  placed: boolean;
  pickerAreas: PickerArea[];
  householdId: number;
}) {
  const { t } = useT();
  const [moving, setMoving] = useState(false);
  const { move, dialog } = useMoveAction();

  return (
    <div className="grid grid-cols-2 gap-2">
      <Button onClick={() => setMoving(true)} className={placed ? '' : 'col-span-2'}>
        {t('move.move')}
      </Button>
      {placed && (
        <Button variant="secondary" onClick={() => move({ items: [{ id: item.id }], targetAreaId: null }, t('move.takenOut'))}>
          {t('move.takeOut')}
        </Button>
      )}
      {moving && <MoveSheet items={[item]} pickerAreas={pickerAreas} householdId={householdId} onClose={() => setMoving(false)} />}
      {dialog}
    </div>
  );
}
