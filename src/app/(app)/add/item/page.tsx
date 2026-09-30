import { ItemForm } from '@/components/ItemForm';
import { PageHeader } from '@/components/PageHeader';
import { listAreas } from '@/db/queries/areas';
import { listTags } from '@/db/queries/tags';
import { getT } from '@/i18n/server';
import { currentHousehold } from '@/lib/household';
import { toPickerAreas } from '@/lib/viewModels';

export default async function AddItemPage({ searchParams }: PageProps<'/add/item'>) {
  const { t } = await getT();
  const { householdId } = await currentHousehold();
  const [areas, tags] = await Promise.all([listAreas(householdId), listTags(householdId)]);
  const requested = Number((await searchParams).areaId);
  const defaultAreaId = areas.some((a) => a.id === requested) ? requested : undefined;

  return (
    <div>
      <PageHeader title={t('add.itemTitle')} fallback="/add" />
      <ItemForm mode="create" householdId={householdId} areas={toPickerAreas(areas)} tags={tags} defaultAreaId={defaultAreaId} />
    </div>
  );
}
