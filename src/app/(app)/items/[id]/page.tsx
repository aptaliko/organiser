import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumb } from '@/components/Breadcrumb';
import { DeleteItemButton } from '@/components/DeleteItemButton';
import { FindPlace } from '@/components/FindPlace';
import { ItemActions } from '@/components/ItemActions';
import { PencilIcon, PinIcon } from '@/components/icons';
import { PageHeader } from '@/components/PageHeader';
import { PhotoGallery } from '@/components/PhotoGallery';
import { SectionTitle } from '@/components/Rows';
import { getItem } from '@/db/queries/items';
import { getT } from '@/i18n/server';
import { pathTo } from '@/lib/areaTree';
import { currentHousehold } from '@/lib/household';
import { formatRelative } from '@/lib/time';
import { rankPlaces, volume } from '@/lib/space';
import { formatDims, pickDims } from '@/lib/units';
import { loadPlaces } from '@/lib/viewModels';

export default async function ItemPage({ params }: PageProps<'/items/[id]'>) {
  const { t, locale } = await getT();
  const { householdId } = await currentHousehold();
  const id = Number((await params).id);
  const item = Number.isInteger(id) ? await getItem(householdId, id) : undefined;
  if (!item) notFound();

  const { areas, usage, pickerAreas } = await loadPlaces(householdId);
  const byId = new Map(areas.map((a) => [a.id, a]));
  const path = item.areaId !== null ? pathTo(byId, item.areaId) : [];
  const dims = formatDims(item, locale);
  const itemDims = pickDims(item);
  // "Where would it fit?": every other place with room for the whole quantity, emptiest first.
  const places =
    volume(itemDims) === null
      ? null
      : rankPlaces(
          itemDims,
          item.quantity,
          areas.filter((a) => a.id !== item.areaId).map((a) => ({ id: a.id, dims: pickDims(a), usage: usage.get(a.id)! })),
        )
          .slice(0, 5)
          .map((c) => {
            const a = byId.get(c.id)!;
            return { id: a.id, name: a.name, coverUrl: a.coverUrl, free: c.usage.free!, path: pathTo(byId, a.id).slice(0, -1) };
          });

  return (
    <div>
      <PageHeader
        title={item.name}
        fallback="/"
        actions={
          <Link href={`/items/${item.id}/edit`} aria-label={t('common.edit')} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-2">
            <PencilIcon className="h-5 w-5" />
          </Link>
        }
      />
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-2 rounded-2xl bg-accent-soft px-3 py-3">
          <PinIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div className="min-w-0">
            <span className="sr-only">{t('item.location')}</span>
            {path.length > 0 ? (
              <Breadcrumb path={path} />
            ) : (
              <Link href="/places/unplaced" className="text-sm font-medium text-muted">
                {t('places.unplaced')}
              </Link>
            )}
          </div>
        </div>

        <ItemActions
          item={{ id: item.id, name: item.name, quantity: item.quantity, dims: itemDims }}
          placed={item.areaId !== null}
          pickerAreas={pickerAreas}
          householdId={householdId}
        />

        {item.photos.length > 0 && <PhotoGallery urls={item.photos.map((p) => p.url)} alt={item.name} />}

        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-surface p-3">
            <dt className="text-xs text-muted">{t('item.quantity')}</dt>
            <dd className="text-lg font-semibold">{item.quantity}</dd>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-3">
            <dt className="text-xs text-muted">{t('item.dimensions')}</dt>
            <dd className="font-semibold">{dims ?? '—'}</dd>
          </div>
        </dl>

        {item.tags.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label={t('item.tags')}>
            {item.tags.map((tag) => (
              <li key={tag.id}>
                <Link
                  href={`/?tag=${tag.id}`}
                  className="inline-flex min-h-9 items-center rounded-full px-3 text-sm font-medium text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {item.description && <p className="whitespace-pre-line">{item.description}</p>}

        <section>
          <SectionTitle>{t('findPlace.title')}</SectionTitle>
          {places === null ? (
            <p className="px-2 text-sm text-muted">{t('findPlace.needDims')}</p>
          ) : (
            <FindPlace itemId={item.id} options={places} />
          )}
        </section>

        <p className="text-sm text-muted">{t('time.updated', { when: formatRelative(item.updatedAt, locale) })}</p>

        <DeleteItemButton id={item.id} name={item.name} redirectTo={item.areaId !== null ? `/areas/${item.areaId}` : '/places'} />
      </div>
    </div>
  );
}
