import { NextResponse } from 'next/server';
import { deleteTag, updateTag } from '@/db/queries/tags';
import { requireHousehold } from '@/lib/household';
import { handle, HttpError, isUniqueViolation, notFound, parseId } from '@/lib/http';
import { tagUpdateSchema } from '@/lib/schemas';

type Ctx = RouteContext<'/api/tags/[id]'>;

export const PATCH = handle(async (request, ctx: Ctx) => {
  const { householdId } = await requireHousehold(request);
  const patch = tagUpdateSchema.parse(await request.json());
  try {
    const tag = await updateTag(householdId, parseId((await ctx.params).id), patch);
    if (!tag) throw notFound();
    return NextResponse.json(tag);
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, 'tag_exists');
    throw err;
  }
});

export const DELETE = handle(async (request, ctx: Ctx) => {
  const { householdId } = await requireHousehold(request);
  if (!(await deleteTag(householdId, parseId((await ctx.params).id)))) throw notFound();
  return NextResponse.json({ ok: true });
});
