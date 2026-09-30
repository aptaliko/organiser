'use client';

import { useState } from 'react';
import { useT } from '@/i18n/I18nProvider';
import { api } from '@/lib/apiClient';
import { CopyIcon, ShareIcon } from '../icons';
import { useToast } from '../Toast';
import { Button, Card } from '../ui';

/** Make a 7-day link and hand it over with the phone's share sheet (WhatsApp, Viber, …). */
export function InvitePanel({ householdName, iAmOwner }: { householdName: string; iAmOwner: boolean }) {
  const { t } = useT();
  const toast = useToast();
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    const { ok, data } = await api<{ url: string }>('/api/households/invites');
    setBusy(false);
    if (ok) setUrl(data.url);
    else toast(t('common.error'));
  }

  async function share(link: string) {
    // The share sheet where supported (phones); otherwise copy.
    if ('share' in navigator) {
      await navigator.share({ title: 'Organiser', text: t('invite.shareText', { name: householdName }), url: link }).catch(() => {});
    } else {
      await copy(link);
    }
  }

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      toast(t('invite.copied'));
    } catch {
      toast(t('common.error'));
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <p className="text-sm text-muted">{t('invite.hint')}</p>
      {url ? (
        <>
          <input readOnly value={url} onFocus={(e) => e.target.select()} className="min-h-12 w-full rounded-xl border border-border bg-surface-2 px-3 text-sm" aria-label={t('invite.title')} />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" className="px-2 text-sm" onClick={() => copy(url)}>
              <span className="inline-flex items-center gap-1.5">
                <CopyIcon className="h-4 w-4" />
                {t('invite.copy')}
              </span>
            </Button>
            <Button className="px-2 text-sm" onClick={() => share(url)}>
              <span className="inline-flex items-center gap-1.5">
                <ShareIcon className="h-4 w-4" />
                {t('invite.share')}
              </span>
            </Button>
          </div>
        </>
      ) : (
        <Button onClick={create} disabled={busy}>
          {t('invite.create')}
        </Button>
      )}
      {iAmOwner && (
        <button
          onClick={async () => {
            const { ok } = await api('/api/households/invites', 'DELETE');
            toast(ok ? t('invite.revoked') : t('common.error'));
            if (ok) setUrl(null);
          }}
          className="min-h-10 self-start text-sm font-medium text-danger"
        >
          {t('invite.revokeAll')}
        </button>
      )}
    </Card>
  );
}
