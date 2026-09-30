import { Suspense } from 'react';
import { AuthForm } from '@/components/AuthForm';
import { getT } from '@/i18n/server';

export default async function Page() {
  const { t } = await getT();
  return (
    <>
      <h2 className="mb-4 text-lg font-semibold">{t('auth.login.title')}</h2>
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </>
  );
}
