import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AreaActions } from '@/components/AreaActions';
import { Breadcrumb } from '@/components/Breadcrumb';
import { FillBar } from '@/components/FillBar';
import { PencilIcon, PinIcon, PlusIcon } from '@/components/icons';
import { PageHeader } from '@/components/PageHeader';
import { PhotoGallery } from '@/components/PhotoGallery';
import { LinkRow, SectionTitle } from '@/components/Rows';
import { SelectableItems } from '@/components/SelectableItems';
import { getArea } from '@/db/queries/areas';
import { listItemsInArea } from '@/db/queries/items';
import { listPhotos } from '@/db/queries/photos';
import { getT } from '@/i18n/server';
import { byName, effectiveAddress, pathTo } from '@/lib/areaTree';
import { currentHousehold } from '@/lib/household';
import { formatDims } from '@/lib/units';
import { loadPlaces, mapsUrl } from '@/lib/viewModels';

export default async function AreaPage({ params }: PageProps<'/areas/[id]'>) {
  const { t, locale } = await getT();
  const { householdId } = await currentHousehold();
  const id = Number((await params).id);
  const area = Number.isInteger(id) ? await getArea(householdId, id) : undefined;
  if (!area) notFound();

  const [{ areas, usage, pickerAreas }, items, photos] = await Promise.all([
    loadPlaces(householdId),
    listItemsInArea(householdId, area.id),
    listPhotos(householdId, { areaId: area.id }),
  ]);
  const path = pathTo(areas, area.id).slice(0, -1);
  const children = areas.filter((a) => a.parentId === area.id).sort(byName);
  const address = effectiveAddress(areas, area.id);
  const dims = formatDims(area, locale);

  return (
    <div>
      <PageHeader
        title={area.name}
        fallback="/places"
        actions={
          <Link href={`/areas/${area.id}/edit`} aria-label={t('common.edit')} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-2">
            <PencilIcon className="h-5 w-5" />
          </Link>
        }
      />
      <div className="flex flex-col gap-3">
        <Breadcrumb path={path} />
        {photos.length > 0 && <PhotoGallery urls={photos.map((p) => p.url)} alt={area.name} />}
        {area.description && <p className="whitespace-pre-line">{area.description}</p>}
        <dl className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex gap-2">
            <dt className="text-muted">{t('area.dimensions')}:</dt>
            <dd>{dims ?? <span className="text-muted">{t('area.noDimensions')}</span>}</dd>
          </div>
          {address && (
            <div className="flex items-start gap-2">
              <dt className="sr-only">{t('area.address')}</dt>
              <PinIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
              <dd>
                <a href={mapsUrl(address)} target="_blank" rel="noreferrer" className="text-accent underline-offset-2 hover:underline">
                  {address}
                </a>
              </dd>
            </div>
          )}
        </dl>
        <FillBar usage={usage.get(area.id)!} />
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/add/item?areaId=${area.id}`} className="flex min-h-12 items-center justify-center gap-1 whitespace-nowrap rounded-xl bg-accent px-2 text-sm font-semibold text-on-accent">
            <PlusIcon className="h-4 w-4 shrink-0" />
            {t('area.addItemHere')}
          </Link>
          <Link href={`/add/place?parentId=${area.id}`} className="flex min-h-12 items-center justify-center gap-1 whitespace-nowrap rounded-xl border border-border bg-surface px-2 text-sm font-semibold">
            <PlusIcon className="h-4 w-4 shrink-0" />
            {t('area.addSubPlace')}
          </Link>
        </div>
        <AreaActions area={{ id: area.id, name: area.name }} pickerAreas={pickerAreas} householdId={householdId} />
      </div>

      {children.length > 0 && (
        <>
          <SectionTitle>{t('area.placesInside')}</SectionTitle>
          <ul>
            {children.map((c) => (
              <LinkRow
                key={c.id}
                href={`/areas/${c.id}`}
                kind="area"
                coverUrl={c.coverUrl}
                title={c.name}
                subtitle={c.itemCount === 1 ? t('places.itemCountOne') : c.itemCount ? t('places.itemCount', { count: c.itemCount }) : null}
              />
            ))}
          </ul>
        </>
      )}

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
