'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useT } from '@/i18n/I18nProvider';
import { TrashIcon } from './icons';
import { Sheet } from './Sheet';
import { useToast } from './Toast';
import { Button } from './ui';

/**
 * Deleting a place never silently deletes what's in it: a non-empty place offers "move its
 * contents up" (default, primary) or "delete everything" (red, secondary).
 */
export function DeleteAreaButton({
  area,
  totals,
  parentName,
}: {
  area: { id: number; name: string; parentId: number | null };
  /** Everything inside, at any depth. */
  totals: { items: number; places: number };
  parentName: string | null;
}) {
  const { t } = useT();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const empty = totals.items === 0 && totals.places === 0;

  async function remove(contents: 'moveUp' | 'deleteAll') {
    setBusy(true);
    const res = await fetch(`/api/areas/${area.id}?contents=${contents}`, { method: 'DELETE' });
    if (res.ok) {
      toast(t('common.deleted'));
      router.replace(area.parentId ? `/areas/${area.parentId}` : '/places');
      router.refresh();
    } else {
      toast(t('common.error'));
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="ghost" className="mt-6 self-start !text-danger" onClick={() => setOpen(true)}>
        <span className="inline-flex items-center gap-2">
          <TrashIcon className="h-5 w-5" />
          {t('deleteArea.title')}
        </span>
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t('deleteArea.title')} closeLabel={t('common.close')}>
        {empty ? (
          <>
            <p className="mb-4">{t('deleteArea.confirmEmpty', { name: area.name })}</p>
            <div className="flex flex-col gap-2">
              <Button variant="danger" disabled={busy} onClick={() => remove('moveUp')}>
                {t('common.delete')}
              </Button>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-4">
              {t('deleteArea.contents', {
                name: area.name,
                what: [
                  totals.items === 1 ? t('deleteArea.itemsOne') : totals.items > 1 ? t('deleteArea.items', { count: totals.items }) : null,
                  totals.places === 1 ? t('deleteArea.placesOne') : totals.places > 1 ? t('deleteArea.places', { count: totals.places }) : null,
                ]
                  .filter(Boolean)
                  .join(` ${t('common.and')} `),
              })}
            </p>
            <div className="flex flex-col gap-2">
              <Button disabled={busy} onClick={() => remove('moveUp')}>
                {t('deleteArea.moveUp', { target: parentName ? `«${parentName}»` : t('deleteArea.unplacedTarget') })}
              </Button>
              <Button variant="secondary" disabled={busy} className="!text-danger" onClick={() => remove('deleteAll')}>
                {t('deleteArea.deleteAll')}
              </Button>
              <p className="text-center text-xs text-muted">{t('deleteArea.deleteAllWarn')}</p>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </>
        )}
      </Sheet>
    </>
  );
}
