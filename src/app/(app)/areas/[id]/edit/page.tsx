import { notFound } from 'next/navigation';
import { AreaForm } from '@/components/AreaForm';
import { PageHeader } from '@/components/PageHeader';
import { PhotoManager } from '@/components/PhotoManager';
import { getArea } from '@/db/queries/areas';
import { listPhotos } from '@/db/queries/photos';
import { getT } from '@/i18n/server';
import { currentHousehold } from '@/lib/household';

export default async function EditAreaPage({ params }: PageProps<'/areas/[id]/edit'>) {
  const { t } = await getT();
  const { householdId } = await currentHousehold();
  const id = Number((await params).id);
  const area = Number.isInteger(id) ? await getArea(householdId, id) : undefined;
  if (!area) notFound();
  const photos = await listPhotos(householdId, { areaId: area.id });

  return (
    <div>
      <PageHeader title={t('edit.placeTitle')} fallback={`/areas/${area.id}`} />
      <section className="mb-6 flex flex-col gap-2">
        <h2 className="text-sm font-medium">{t('photos.title')}</h2>
        <PhotoManager owner={{ areaId: area.id }} photos={photos} />
      </section>
      <AreaForm mode="edit" householdId={householdId} areas={[]} area={area} />
    </div>
  );
}
