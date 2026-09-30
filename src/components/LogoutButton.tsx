'use client';

import { useRouter } from 'next/navigation';
import { useT } from '@/i18n/I18nProvider';
import { Button } from './ui';

export function LogoutButton() {
  const { t } = useT();
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      className="w-full text-danger"
      onClick={async () => {
        await fetch('/api/logout', { method: 'POST' });
        router.replace('/login');
        router.refresh();
      }}
    >
      {t('auth.logout')}
    </Button>
  );
}
