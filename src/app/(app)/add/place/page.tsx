import { AreaForm } from '@/components/AreaForm';
import { PageHeader } from '@/components/PageHeader';
import { getT } from '@/i18n/server';
import { currentHousehold } from '@/lib/household';
import { loadPlaces } from '@/lib/viewModels';

export default async function AddPlacePage({ searchParams }: PageProps<'/add/place'>) {
  const { t } = await getT();
  const { householdId } = await currentHousehold();
  const { areas, pickerAreas } = await loadPlaces(householdId);
  const requested = Number((await searchParams).parentId);
  const defaultParentId = areas.some((a) => a.id === requested) ? requested : null;

  return (
    <div>
      <PageHeader title={t('add.placeTitle')} fallback="/add" />
      <AreaForm mode="create" householdId={householdId} areas={pickerAreas} defaultParentId={defaultParentId} />
    </div>
  );
}
