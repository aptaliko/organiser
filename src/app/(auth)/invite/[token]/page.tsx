import Link from 'next/link';
import { JoinHouseholdButton } from '@/components/JoinHouseholdButton';
import { findInvite, getMembership } from '@/db/queries/households';
import { getT } from '@/i18n/server';
import { hashInviteToken, isInviteUsable, looksLikeInviteToken } from '@/lib/inviteToken';
import { maybeCurrentUserId } from '@/lib/requestUser';

/** Public: shows who invited you where; join (signed in) or sign up / log in first. */
export default async function InvitePage({ params }: PageProps<'/invite/[token]'>) {
  const { t } = await getT();
  const { token } = await params;
  const invite = looksLikeInviteToken(token) ? await findInvite(hashInviteToken(token)) : undefined;

  if (!invite || !isInviteUsable(invite)) {
    return <p className="rounded-2xl bg-surface-2 p-4 text-center">{t('invite.invalid')}</p>;
  }

  const userId = await maybeCurrentUserId();
  const name = invite.householdName;
  const linkClass = 'flex min-h-12 items-center justify-center rounded-xl px-5 font-semibold';

  return (
    <div className="flex flex-col gap-4 text-center">
      <h2 className="text-xl font-bold">{t('invite.pageTitle')}</h2>
      <p className="text-muted">{t('invite.pageBody', { name })}</p>
      {userId === null ? (
        <div className="mt-2 flex flex-col gap-2">
          <Link href={`/register?invite=${token}`} className={`${linkClass} bg-accent text-on-accent`}>
            {t('invite.signUp')}
          </Link>
          <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`} className={`${linkClass} border border-border bg-surface`}>
            {t('invite.logIn')}
          </Link>
        </div>
      ) : (await getMembership(userId, invite.householdId)) ? (
        <>
          <p>{t('invite.alreadyMember', { name })}</p>
          <JoinHouseholdButton token={token} label={t('invite.open')} />
        </>
      ) : (
        <JoinHouseholdButton token={token} label={t('invite.join', { name })} />
      )}
    </div>
  );
}
