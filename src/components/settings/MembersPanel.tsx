'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useT } from '@/i18n/I18nProvider';
import type { TKey } from '@/i18n';
import { api } from '@/lib/apiClient';
import { Sheet } from '../Sheet';
import { useToast } from '../Toast';
import { Button, Card } from '../ui';

interface Member {
  userId: number;
  name: string;
  email: string;
  role: string;
}

const ERRORS: Record<string, TKey> = { last_owner: 'household.lastOwner', only_member: 'household.onlyMember' };

export function MembersPanel({
  members,
  meId,
  iAmOwner,
  householdName,
}: {
  members: Member[];
  meId: number;
  iAmOwner: boolean;
  householdName: string;
}) {
  const { t } = useT();
  const toast = useToast();
  const router = useRouter();
  const [confirm, setConfirm] = useState<{ text: string; label: string; action: () => Promise<void> } | null>(null);

  async function call(url: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown, after?: () => void) {
    const { ok, data } = await api(url, method, body);
    if (!ok) return toast(t(ERRORS[data.error ?? ''] ?? 'common.error'));
    after?.();
    router.refresh();
  }

  return (
    <Card className="flex flex-col gap-1 p-2">
      <ul>
        {members.map((m) => (
          <li key={m.userId} className="flex min-h-14 items-center gap-2 rounded-xl px-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">
                {m.name}
                {m.userId === meId && <span className="font-normal text-muted"> ({t('household.you')})</span>}
              </span>
              <span className="block truncate text-xs text-muted">
                {m.email}
                {m.role === 'owner' && ` · ${t('household.owner')}`}
              </span>
            </span>
            {iAmOwner && m.userId !== meId && (
              <span className="flex shrink-0 gap-1">
                {m.role !== 'owner' && (
                  <button
                    onClick={() => call(`/api/households/members/${m.userId}`, 'PATCH', { role: 'owner' })}
                    className="min-h-10 rounded-lg px-2 text-xs font-semibold text-accent hover:bg-surface-2"
                  >
                    {t('household.makeOwner')}
                  </button>
                )}
                <button
                  onClick={() =>
                    setConfirm({
                      text: t('household.removeConfirm', { name: m.name }),
                      label: t('household.remove', { name: m.name }),
                      action: () => call(`/api/households/members/${m.userId}`, 'DELETE'),
                    })
                  }
                  aria-label={t('household.remove', { name: m.name })}
                  className="min-h-10 rounded-lg px-2 text-xs font-semibold text-danger hover:bg-surface-2"
                >
                  {t('common.delete')}
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
      <button
        onClick={() =>
          setConfirm({
            text: t('household.leaveConfirm', { name: householdName }),
            label: t('household.leave'),
            action: () => call('/api/households/leave', 'POST', undefined, () => router.push('/')),
          })
        }
        className="min-h-11 self-start rounded-lg px-2 text-sm font-medium text-danger hover:bg-surface-2"
      >
        {t('household.leave')}
      </button>
      <Sheet open={confirm !== null} onClose={() => setConfirm(null)} title={t('household.members')} closeLabel={t('common.close')}>
        <p className="mb-4">{confirm?.text}</p>
        <div className="flex flex-col gap-2">
          <Button
            variant="danger"
            onClick={async () => {
              const action = confirm!.action;
              setConfirm(null);
              await action();
            }}
          >
            {confirm?.label}
          </Button>
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            {t('common.cancel')}
          </Button>
        </div>
      </Sheet>
    </Card>
  );
}
