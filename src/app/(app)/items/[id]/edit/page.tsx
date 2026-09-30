import { notFound } from 'next/navigation';
import { ItemForm } from '@/components/ItemForm';
import { PageHeader } from '@/components/PageHeader';
import { PhotoManager } from '@/components/PhotoManager';
import { getItem } from '@/db/queries/items';
import { listTags } from '@/db/queries/tags';
import { getT } from '@/i18n/server';
import { currentHousehold } from '@/lib/household';

export default async function EditItemPage({ params }: PageProps<'/items/[id]/edit'>) {
  const { t } = await getT();
  const { householdId } = await currentHousehold();
  const id = Number((await params).id);
  const item = Number.isInteger(id) ? await getItem(householdId, id) : undefined;
  if (!item) notFound();
  const tags = await listTags(householdId);

  return (
    <div>
      <PageHeader title={t('edit.itemTitle')} fallback={`/items/${item.id}`} />
      <section className="mb-6 flex flex-col gap-2">
        <h2 className="text-sm font-medium">{t('photos.title')}</h2>
        <PhotoManager owner={{ itemId: item.id }} photos={item.photos} />
      </section>
      <ItemForm mode="edit" householdId={householdId} areas={[]} tags={tags} item={item} />
    </div>
  );
}
