import { ItemForm } from '@/components/ItemForm';
import { PageHeader } from '@/components/PageHeader';
import { listTags } from '@/db/queries/tags';
import { getT } from '@/i18n/server';
import { currentHousehold } from '@/lib/household';
import { loadPlaces } from '@/lib/viewModels';

export default async function AddItemPage({ searchParams }: PageProps<'/add/item'>) {
  const { t } = await getT();
  const { householdId } = await currentHousehold();
  const [{ areas, pickerAreas }, tags] = await Promise.all([loadPlaces(householdId), listTags(householdId)]);
  const requested = Number((await searchParams).areaId);
  const defaultAreaId = areas.some((a) => a.id === requested) ? requested : undefined;

  return (
    <div>
      <PageHeader title={t('add.itemTitle')} fallback="/add" />
      <ItemForm mode="create" householdId={householdId} areas={pickerAreas} tags={tags} defaultAreaId={defaultAreaId} />
    </div>
  );
}
