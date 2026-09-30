import Link from 'next/link';
import { PlusIcon, BoxIcon } from '@/components/icons';
import { PlacesTree } from '@/components/PlacesTree';
import { LinkRow } from '@/components/Rows';
import { listAreas } from '@/db/queries/areas';
import { countUnplaced } from '@/db/queries/items';
import { getT } from '@/i18n/server';
import { buildTree } from '@/lib/areaTree';
import { currentHousehold } from '@/lib/household';

export default async function PlacesPage() {
  const { t } = await getT();
  const { householdId } = await currentHousehold();
  const [areas, unplaced] = await Promise.all([listAreas(householdId), countUnplaced(householdId)]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('places.title')}</h1>
        <Link
          href="/add/place"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-accent-soft px-3 font-semibold text-accent"
        >
          <PlusIcon className="h-5 w-5" />
          {t('places.new')}
        </Link>
      </div>

      {unplaced > 0 && (
        <ul className="mb-2">
          <LinkRow
            href="/places/unplaced"
            kind="item"
            coverUrl={null}
            title={t('places.unplaced')}
            subtitle={t('places.unplacedHint')}
            badge={String(unplaced)}
          />
        </ul>
      )}

      {areas.length === 0 ? (
        <div className="mt-12 flex flex-col items-center text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-accent-soft text-accent">
            <BoxIcon className="h-10 w-10" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">{t('places.emptyTitle')}</h2>
          <p className="mt-2 max-w-sm text-muted">{t('places.emptyBody')}</p>
          <Link href="/add/place" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-accent px-5 font-semibold text-on-accent">
            {t('places.new')}
          </Link>
        </div>
      ) : (
        <PlacesTree roots={buildTree(areas)} />
      )}
    </div>
  );
}
