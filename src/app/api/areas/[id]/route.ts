import { NextResponse } from 'next/server';
import { deleteAreaMovingContentsUp, deleteAreaSubtree, getArea, listAreas, updateArea } from '@/db/queries/areas';
import { unreferencedUrls } from '@/db/queries/photos';
import { descendantIds } from '@/lib/areaTree';
import { requireHousehold } from '@/lib/household';
import { badRequest, handle, HttpError, notFound, parseId } from '@/lib/http';
import { deleteStoredPhotos } from '@/lib/photoStorage';
import { areaUpdateSchema } from '@/lib/schemas';

type Ctx = RouteContext<'/api/areas/[id]'>;

export const GET = handle(async (request, ctx: Ctx) => {
  const { householdId } = await requireHousehold(request);
  const area = await getArea(householdId, parseId((await ctx.params).id));
  if (!area) throw notFound();
  return NextResponse.json(area);
});

/** Field edits. Changing the parent is a move (see /api/move), not an edit. */
export const PATCH = handle(async (request, ctx: Ctx) => {
  const { householdId } = await requireHousehold(request);
  const area = await getArea(householdId, parseId((await ctx.params).id));
  if (!area) throw notFound();
  const patch = areaUpdateSchema.parse(await request.json());
  if (patch.address && area.parentId !== null) throw badRequest('address_on_child');
  await updateArea(householdId, area.id, patch);
  return NextResponse.json({ ok: true });
});

/**
 * `?contents=moveUp` (what's directly inside goes to the parent) or `?contents=deleteAll`
 * (everything inside, at any depth). A non-empty place without a choice → 409 with counts,
 * so nothing is ever deleted by accident.
 */
export const DELETE = handle(async (request, ctx: Ctx) => {
  const { householdId } = await requireHousehold(request);
  const area = await getArea(householdId, parseId((await ctx.params).id));
  if (!area) throw notFound();
  const contents = new URL(request.url).searchParams.get('contents');

  const all = await listAreas(householdId);
  const subtree = [...descendantIds(all, area.id)];
  const inSubtree = new Set(subtree);
  const places = subtree.length - 1;
  const itemCount = all.filter((a) => inSubtree.has(a.id)).reduce((n, a) => n + a.itemCount, 0);

  let urls: string[];
  if (contents === 'deleteAll') {
    urls = await deleteAreaSubtree(householdId, subtree);
  } else if (contents === 'moveUp' || (places === 0 && itemCount === 0)) {
    urls = await deleteAreaMovingContentsUp(householdId, area);
  } else {
    throw new HttpError(409, 'not_empty', { items: itemCount, places });
  }
  await deleteStoredPhotos(await unreferencedUrls(urls));
  return NextResponse.json({ ok: true, parentId: area.parentId });
});
