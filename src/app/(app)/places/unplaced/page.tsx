import { PageHeader } from '@/components/PageHeader';
import { SelectableItems } from '@/components/SelectableItems';
import { listItemsInArea } from '@/db/queries/items';
import { getT } from '@/i18n/server';
import { currentHousehold } from '@/lib/household';
import { formatDims } from '@/lib/units';
import { loadPlaces } from '@/lib/viewModels';

export default async function UnplacedPage() {
  const { t, locale } = await getT();
  const { householdId } = await currentHousehold();
  const [items, { pickerAreas }] = await Promise.all([listItemsInArea(householdId, null), loadPlaces(householdId)]);
  return (
    <div>
      <PageHeader title={t('places.unplaced')} fallback="/places" />
      <p className="px-2 text-sm text-muted">{t('places.unplacedHint')}</p>
      <SelectableItems
        title={t('area.items')}
        emptyText={t('area.noItems')}
        items={items.map((i) => ({ ...i, subtitle: formatDims(i, locale) }))}
        pickerAreas={pickerAreas}
        householdId={householdId}
      />
    </div>
  );
}
