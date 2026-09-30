import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAreaByQrCode } from '@/db/queries/areas';
import { getMembership } from '@/db/queries/households';
import { getUserById, updateUser } from '@/db/queries/users';
import { getT } from '@/i18n/server';
import { isQrCode } from '@/lib/qrCode';
import { currentUserId } from '@/lib/requestUser';

/**
 * Where a scanned label lands (the proxy sends signed-out people to log in first).
 * Opens the place, switching household if it belongs to another of the user's households.
 */
export default async function QrLandingPage({ params }: PageProps<'/a/[code]'>) {
  const code = (await params).code.toUpperCase();
  const userId = await currentUserId();
  const area = isQrCode(code) ? await getAreaByQrCode(code) : undefined;

  if (area && (await getMembership(userId, area.householdId))) {
    const user = await getUserById(userId);
    if (user?.activeHouseholdId !== area.householdId) await updateUser(userId, { activeHouseholdId: area.householdId });
    redirect(`/areas/${area.id}`);
  }

  const { t } = await getT();
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <p>{t('labels.notFound')}</p>
      <Link href="/" className="font-semibold text-accent">
        {t('app.name')}
      </Link>
    </main>
  );
}
