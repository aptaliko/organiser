'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useT } from '@/i18n/I18nProvider';
import { api } from '@/lib/apiClient';
import { useToast } from '../Toast';
import { Button, Card, TextInput } from '../ui';

/** Rename the current household, switch between households, or start a new one. */
export function HouseholdPanel({
  current,
  memberships,
}: {
  current: { id: number; name: string };
  memberships: { householdId: number; name: string }[];
}) {
  const { t } = useT();
  const toast = useToast();
  const router = useRouter();
  const [name, setName] = useState(current.name);
  const [newName, setNewName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<{ ok: boolean }>, done?: string) {
    setBusy(true);
    const { ok } = await fn();
    setBusy(false);
    if (!ok) return toast(t('common.error'));
    if (done) toast(done);
    router.refresh();
  }

  return (
    <Card className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim() && name.trim() !== current.name) void run(() => api('/api/households/current', 'PATCH', { name }), t('common.saved'));
        }}
      >
        <label htmlFor="household-name" className="text-sm font-medium">
          {t('household.name')}
        </label>
        <div className="flex gap-2">
          <TextInput id="household-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          <Button type="submit" variant="secondary" disabled={busy || !name.trim() || name.trim() === current.name}>
            {t('common.save')}
          </Button>
        </div>
      </form>

      {memberships.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t('household.switch')}</span>
          <ul className="flex flex-col gap-1">
            {memberships.map((m) => (
              <li key={m.householdId}>
                <button
                  disabled={busy || m.householdId === current.id}
                  onClick={() => run(() => api('/api/households/switch', 'POST', { householdId: m.householdId }))}
                  className="flex min-h-12 w-full items-center justify-between rounded-xl border border-border px-4 text-left disabled:border-accent disabled:bg-accent-soft"
                >
                  <span className="font-medium">{m.name}</span>
                  {m.householdId === current.id && <span className="text-xs font-semibold text-accent">{t('household.current')}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {newName === null ? (
        <button onClick={() => setNewName('')} className="self-start text-left text-sm font-semibold text-accent">
          + {t('household.create')}
          <span className="block text-xs font-normal text-muted">{t('household.createHint')}</span>
        </button>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (newName.trim())
              void run(async () => {
                const res = await api('/api/households', 'POST', { name: newName });
                if (res.ok) setNewName(null);
                return res;
              });
          }}
        >
          <TextInput autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t('household.createName')} aria-label={t('household.createName')} maxLength={120} />
          <Button type="submit" disabled={busy || !newName.trim()}>
            {t('picker.create')}
          </Button>
        </form>
      )}
    </Card>
  );
}
