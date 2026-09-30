import { LanguageToggle } from '@/components/LanguageToggle';
import { LogoutButton } from '@/components/LogoutButton';
import { HouseholdPanel } from '@/components/settings/HouseholdPanel';
import { InvitePanel } from '@/components/settings/InvitePanel';
import { MembersPanel } from '@/components/settings/MembersPanel';
import { TagManager } from '@/components/settings/TagManager';
import { Card } from '@/components/ui';
import { getHousehold, getMemberships, listMembers } from '@/db/queries/households';
import { listTags } from '@/db/queries/tags';
import { getUserById } from '@/db/queries/users';
import { getT } from '@/i18n/server';
import { currentHousehold } from '@/lib/household';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const { t } = await getT();
  const { userId, householdId, role } = await currentHousehold();
  const [user, household, memberships, members, tags] = await Promise.all([
    getUserById(userId),
    getHousehold(householdId),
    getMemberships(userId),
    listMembers(householdId),
    listTags(householdId),
  ]);
  const name = household?.name ?? '';

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

      <Section title={t('household.title')}>
        <HouseholdPanel current={{ id: householdId, name }} memberships={memberships} />
      </Section>

      <Section title={t('invite.title')}>
        <InvitePanel householdName={name} iAmOwner={role === 'owner'} />
      </Section>

      <Section title={t('household.members')}>
        <MembersPanel members={members} meId={userId} iAmOwner={role === 'owner'} householdName={name} />
      </Section>

      <Section title={t('tagsAdmin.title')}>
        <TagManager tags={tags} />
      </Section>

      <Section title={t('settings.language')}>
        <LanguageToggle persist />
      </Section>

      <Section title={t('settings.account')}>
        <Card>
          <p className="font-semibold">{user?.name}</p>
          <p className="text-sm text-muted">{user?.email}</p>
        </Card>
        <LogoutButton />
      </Section>
    </div>
  );
}
