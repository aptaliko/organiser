import { NextResponse } from 'next/server';
import { getArea } from '@/db/queries/areas';
import { createItem } from '@/db/queries/items';
import { ownedTagIds } from '@/db/queries/tags';
import { requireHousehold } from '@/lib/household';
import { handle, notFound } from '@/lib/http';
import { itemCreateSchema } from '@/lib/schemas';

export const POST = handle(async (request) => {
  const { householdId } = await requireHousehold(request);
  const input = itemCreateSchema.parse(await request.json());
  if (input.areaId !== null && !(await getArea(householdId, input.areaId))) throw notFound();
  const tagIds = [...new Set(input.tagIds)];
  if ((await ownedTagIds(householdId, tagIds)).length !== tagIds.length) throw notFound();
  const id = await createItem(householdId, { ...input, tagIds });
  return NextResponse.json({ id }, { status: 201 });
});
