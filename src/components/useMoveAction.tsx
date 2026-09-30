'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useT } from '@/i18n/I18nProvider';
import type { MoveBody } from '@/lib/schemas';
import { Sheet } from './Sheet';
import { useToast } from './Toast';
import { Button } from './ui';

type MoveResponse = { ok: true; moved: number; undo: MoveBody[] | null } | { error: string; details?: { names?: string[] } };

async function postMove(body: MoveBody): Promise<{ status: number; data: MoveResponse }> {
  const res = await fetch('/api/move', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: (await res.json().catch(() => ({ error: 'server_error' }))) as MoveResponse };
}

/**
 * Runs a move with the shared UX: asks before merging into a same-named item, then shows
 * "Moved to X · Undo" and refreshes the page. Render `dialog` somewhere in the tree.
 */
export function useMoveAction() {
  const { t } = useT();
  const toast = useToast();
  const router = useRouter();
  const [mergeAsk, setMergeAsk] = useState<{ body: MoveBody; names: string[]; message: string; resolve: (ok: boolean) => void } | null>(null);

  async function undo(steps: MoveBody[]) {
    for (const step of steps) await postMove(step);
    toast(t('move.undone'));
    router.refresh();
  }

  async function send(body: MoveBody, message: string): Promise<boolean> {
    const { status, data } = await postMove(body);
    if ('ok' in data) {
      const steps = data.undo;
      toast(message, steps && steps.length ? { label: t('move.undo'), onClick: () => void undo(steps) } : undefined);
      router.refresh();
      return true;
    }
    if (status === 409 && data.error === 'merge_possible') {
      return new Promise((resolve) => setMergeAsk({ body, names: data.details?.names ?? [], message, resolve }));
    }
    toast(data.error === 'cycle' ? t('move.cycle') : t('common.error'));
    return false;
  }

  async function answerMerge(merge: boolean) {
    const ask = mergeAsk!;
    setMergeAsk(null);
    ask.resolve(await send({ ...ask.body, mergeSameName: merge }, ask.message));
  }

  const dialog = (
    <Sheet
      open={mergeAsk !== null}
      onClose={() => {
        mergeAsk?.resolve(false);
        setMergeAsk(null);
      }}
      title={t('move.mergeTitle')}
      closeLabel={t('common.close')}
    >
      <p className="mb-4">{t('move.mergeBody', { names: mergeAsk?.names.join('», «') ?? '' })}</p>
      <div className="flex flex-col gap-2">
        <Button onClick={() => answerMerge(true)}>{t('move.mergeYes')}</Button>
        <Button variant="secondary" onClick={() => answerMerge(false)}>
          {t('move.mergeNo')}
        </Button>
      </div>
    </Sheet>
  );

  return { move: send, dialog };
}
