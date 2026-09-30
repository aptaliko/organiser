import { headers } from 'next/headers';
import QRCode from 'qrcode';
import { LabelSheet } from '@/components/LabelSheet';
import { PageHeader } from '@/components/PageHeader';
import { getT } from '@/i18n/server';
import { buildTree, pathTo, type TreeNode } from '@/lib/areaTree';
import { currentHousehold } from '@/lib/household';
import { loadPlaces } from '@/lib/viewModels';
import type { AreaListRow } from '@/db/queries/areas';

/** Public origin for the QR links: APP_URL, else the host this request came in on. */
async function origin() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${h.get('x-forwarded-host') ?? h.get('host')}`;
}

export default async function LabelsPage({ searchParams }: PageProps<'/labels'>) {
  const { t } = await getT();
  const { householdId } = await currentHousehold();
  const { areas } = await loadPlaces(householdId);
  const base = await origin();
  const byId = new Map(areas.map((a) => [a.id, a]));

  // Tree order with depth, so the chooser reads like the Places screen.
  const ordered: { area: AreaListRow; depth: number }[] = [];
  const walk = (nodes: TreeNode<AreaListRow>[], depth: number) =>
    nodes.forEach((n) => {
      ordered.push({ area: n, depth });
      walk(n.children, depth + 1);
    });
  walk(buildTree(areas), 0);

  const labels = await Promise.all(
    ordered.map(async ({ area, depth }) => ({
      id: area.id,
      name: area.name,
      depth,
      code: area.qrCode,
      path: pathTo(byId, area.id)
        .slice(0, -1)
        .map((a) => a.name)
        .join(' › '),
      svg: await QRCode.toString(`${base}/a/${area.qrCode}`, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' }),
    })),
  );

  const raw = (await searchParams).ids;
  const requested = new Set(
    (typeof raw === 'string' ? raw : '')
      .split(',')
      .map(Number)
      .filter((n) => byId.has(n)),
  );

  return (
    <div>
      <div className="print:hidden">
        <PageHeader title={t('labels.title')} fallback="/places" />
        <p className="mb-4 text-sm text-muted">{t('labels.hint')}</p>
      </div>
      <LabelSheet labels={labels} initialSelected={[...requested]} />
    </div>
  );
}
