import { LanguageToggle } from '@/components/LanguageToggle';
import { LogoutButton } from '@/components/LogoutButton';
import { Card } from '@/components/ui';
import { getHousehold } from '@/db/queries/households';
import { getUserById } from '@/db/queries/users';
import { getT } from '@/i18n/server';
import { currentHousehold } from '@/lib/household';

export default async function SettingsPage() {
  const { t } = await getT();
  const { userId, householdId } = await currentHousehold();
  const [user, household] = await Promise.all([getUserById(userId), getHousehold(householdId)]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t('settings.household')}</h2>
        <Card>
          <p className="font-semibold">{household?.name}</p>
        </Card>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t('settings.language')}</h2>
        <LanguageToggle persist />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t('settings.account')}</h2>
        <Card>
          <p className="font-semibold">{user?.name}</p>
          <p className="text-sm text-muted">{user?.email}</p>
        </Card>
        <LogoutButton />
      </section>
    </div>
  );
}
