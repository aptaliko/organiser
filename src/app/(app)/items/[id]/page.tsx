import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumb } from '@/components/Breadcrumb';
import { DeleteItemButton } from '@/components/DeleteItemButton';
import { PencilIcon, PinIcon } from '@/components/icons';
import { PageHeader } from '@/components/PageHeader';
import { PhotoGallery } from '@/components/PhotoGallery';
import { listAreas } from '@/db/queries/areas';
import { getItem } from '@/db/queries/items';
import { getT } from '@/i18n/server';
import { pathTo } from '@/lib/areaTree';
import { currentHousehold } from '@/lib/household';
import { formatRelative } from '@/lib/time';
import { formatDims } from '@/lib/units';

export default async function ItemPage({ params }: PageProps<'/items/[id]'>) {
  const { t, locale } = await getT();
  const { householdId } = await currentHousehold();
  const id = Number((await params).id);
  const item = Number.isInteger(id) ? await getItem(householdId, id) : undefined;
  if (!item) notFound();

  const areas = item.areaId !== null ? await listAreas(householdId) : [];
  const path = item.areaId !== null ? pathTo(areas, item.areaId) : [];
  const dims = formatDims(item, locale);

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
              <li key={tag.id} className="rounded-full px-3 py-1 text-sm font-medium text-white" style={{ backgroundColor: tag.color }}>
                {tag.name}
              </li>
            ))}
          </ul>
        )}

        {item.description && <p className="whitespace-pre-line">{item.description}</p>}

        <p className="text-sm text-muted">{t('time.updated', { when: formatRelative(item.updatedAt, locale) })}</p>

        <DeleteItemButton id={item.id} name={item.name} redirectTo={item.areaId !== null ? `/areas/${item.areaId}` : '/places'} />
      </div>
    </div>
  );
}
