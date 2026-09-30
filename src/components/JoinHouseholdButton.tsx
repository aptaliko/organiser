'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useT } from '@/i18n/I18nProvider';
import { Alert, Button } from './ui';

/** Joins (or, if already a member, just switches to) the invited household, then opens it. */
export function JoinHouseholdButton({ token, label }: { token: string; label: string }) {
  const { t } = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return (
    <>
      {error && <Alert>{t('invite.invalid')}</Alert>}
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await fetch('/api/households/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
          if (res.ok) {
            router.push('/places');
            router.refresh(); // the header shows the newly active household
          } else {
            setError(true);
            setBusy(false);
          }
        }}
      >
        {label}
      </Button>
    </>
  );
}
