import { Suspense } from 'react';
import { AuthForm } from '@/components/AuthForm';
import { findInvite } from '@/db/queries/households';
import { getT } from '@/i18n/server';
import { hashInviteToken, isInviteUsable, looksLikeInviteToken } from '@/lib/inviteToken';

export default async function Page({ searchParams }: PageProps<'/register'>) {
  const { t } = await getT();
  const token = (await searchParams).invite;
  const invite = typeof token === 'string' && looksLikeInviteToken(token) ? await findInvite(hashInviteToken(token)) : undefined;
  return (
    <>
      <h2 className="mb-4 text-lg font-semibold">{t('auth.register.title')}</h2>
      {invite && isInviteUsable(invite) && (
        <p className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-sm">{t('invite.joining', { name: invite.householdName })}</p>
      )}
      <Suspense>
        <AuthForm mode="register" />
      </Suspense>
    </>
  );
}
