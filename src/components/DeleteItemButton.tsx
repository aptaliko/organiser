'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useT } from '@/i18n/I18nProvider';
import { TrashIcon } from './icons';
import { Sheet } from './Sheet';
import { useToast } from './Toast';
import { Button } from './ui';

export function DeleteItemButton({ id, name, redirectTo }: { id: number; name: string; redirectTo: string }) {
  const { t } = useT();
  const toast = useToast();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast(t('common.deleted'));
      router.push(redirectTo);
      router.refresh();
    } else {
      toast(t('common.error'));
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="ghost" className="mt-4 self-start !text-danger" onClick={() => setConfirming(true)}>
        <span className="inline-flex items-center gap-2">
          <TrashIcon className="h-5 w-5" />
          {t('common.delete')}
        </span>
      </Button>
      <Sheet open={confirming} onClose={() => setConfirming(false)} title={t('common.delete')} closeLabel={t('common.close')}>
        <p className="mb-4">{t('item.deleteConfirm', { name })}</p>
        <div className="flex flex-col gap-2">
          <Button variant="danger" disabled={busy} onClick={remove}>
            {t('common.delete')}
          </Button>
          <Button variant="secondary" onClick={() => setConfirming(false)}>
            {t('common.cancel')}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
