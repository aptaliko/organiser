import { NextResponse } from 'next/server';
import { deleteItem, getItem, updateItem } from '@/db/queries/items';
import { unreferencedUrls } from '@/db/queries/photos';
import { ownedTagIds } from '@/db/queries/tags';
import { requireHousehold } from '@/lib/household';
import { handle, notFound, parseId } from '@/lib/http';
import { deleteStoredPhotos } from '@/lib/photoStorage';
import { itemUpdateSchema } from '@/lib/schemas';

type Ctx = RouteContext<'/api/items/[id]'>;

export const GET = handle(async (request, ctx: Ctx) => {
  const { householdId } = await requireHousehold(request);
  const item = await getItem(householdId, parseId((await ctx.params).id));
  if (!item) throw notFound();
  return NextResponse.json(item);
});

/** Field edits (and tag replacement). Changing the place is a move (see /api/move). */
export const PATCH = handle(async (request, ctx: Ctx) => {
  const { householdId } = await requireHousehold(request);
  const id = parseId((await ctx.params).id);
  if (!(await getItem(householdId, id))) throw notFound();
  const patch = itemUpdateSchema.parse(await request.json());
  if (patch.tagIds) {
    patch.tagIds = [...new Set(patch.tagIds)];
    if ((await ownedTagIds(householdId, patch.tagIds)).length !== patch.tagIds.length) throw notFound();
  }
  await updateItem(householdId, id, patch);
  return NextResponse.json({ ok: true });
});

export const DELETE = handle(async (request, ctx: Ctx) => {
  const { householdId } = await requireHousehold(request);
  const urls = await deleteItem(householdId, parseId((await ctx.params).id));
  if (urls === null) throw notFound();
  await deleteStoredPhotos(await unreferencedUrls(urls));
  return NextResponse.json({ ok: true });
});
