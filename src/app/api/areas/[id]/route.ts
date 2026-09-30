import { NextResponse } from 'next/server';
import { getArea, updateArea } from '@/db/queries/areas';
import { requireHousehold } from '@/lib/household';
import { badRequest, handle, notFound, parseId } from '@/lib/http';
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
