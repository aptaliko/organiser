import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getArea } from '@/db/queries/areas';
import { getItem } from '@/db/queries/items';
import { addPhoto } from '@/db/queries/photos';
import { requireHousehold } from '@/lib/household';
import { handle, notFound } from '@/lib/http';
import { photoInputSchema } from '@/lib/schemas';

const bodySchema = z.union([
  photoInputSchema.extend({ areaId: z.number().int().positive() }),
  photoInputSchema.extend({ itemId: z.number().int().positive() }),
]);

/** Attaches an already-uploaded photo to an area or item. */
export const POST = handle(async (request) => {
  const { householdId } = await requireHousehold(request);
  const body = bodySchema.parse(await request.json());
  const photo = { url: body.url, width: body.width, height: body.height };
  if ('areaId' in body) {
    if (!(await getArea(householdId, body.areaId))) throw notFound();
    return NextResponse.json(await addPhoto(householdId, { areaId: body.areaId }, photo), { status: 201 });
  }
  if (!(await getItem(householdId, body.itemId))) throw notFound();
  return NextResponse.json(await addPhoto(householdId, { itemId: body.itemId }, photo), { status: 201 });
});
