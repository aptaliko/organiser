import { AreaForm } from '@/components/AreaForm';
import { PageHeader } from '@/components/PageHeader';
import { listAreas } from '@/db/queries/areas';
import { getT } from '@/i18n/server';
import { currentHousehold } from '@/lib/household';
import { toPickerAreas } from '@/lib/viewModels';

export default async function AddPlacePage({ searchParams }: PageProps<'/add/place'>) {
  const { t } = await getT();
  const { householdId } = await currentHousehold();
  const areas = await listAreas(householdId);
  const requested = Number((await searchParams).parentId);
  const defaultParentId = areas.some((a) => a.id === requested) ? requested : null;

  return (
    <div>
      <PageHeader title={t('add.placeTitle')} fallback="/add" />
      <AreaForm mode="create" householdId={householdId} areas={toPickerAreas(areas)} defaultParentId={defaultParentId} />
    </div>
  );
}
