import { PageHeader } from '@/components/PageHeader';
import { LinkRow } from '@/components/Rows';
import { listItemsInArea } from '@/db/queries/items';
import { getT } from '@/i18n/server';
import { currentHousehold } from '@/lib/household';

export default async function UnplacedPage() {
  const { t } = await getT();
  const { householdId } = await currentHousehold();
  const items = await listItemsInArea(householdId, null);
  return (
    <div>
      <PageHeader title={t('places.unplaced')} fallback="/places" />
      <p className="mb-2 px-2 text-sm text-muted">{t('places.unplacedHint')}</p>
      <ul>
        {items.map((i) => (
          <LinkRow key={i.id} href={`/items/${i.id}`} kind="item" coverUrl={i.coverUrl} title={i.name} badge={i.quantity > 1 ? `×${i.quantity}` : null} />
        ))}
      </ul>
    </div>
  );
}
