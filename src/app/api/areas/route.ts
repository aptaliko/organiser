import { NextResponse } from 'next/server';
import { createArea, getArea, listAreas } from '@/db/queries/areas';
import { requireHousehold } from '@/lib/household';
import { badRequest, handle, notFound } from '@/lib/http';
import { areaCreateSchema } from '@/lib/schemas';

export const GET = handle(async (request) => {
  const { householdId } = await requireHousehold(request);
  return NextResponse.json(await listAreas(householdId));
});

export const POST = handle(async (request) => {
  const { householdId } = await requireHousehold(request);
  const input = areaCreateSchema.parse(await request.json());
  if (input.parentId !== null) {
    if (!(await getArea(householdId, input.parentId))) throw notFound();
    // Addresses belong to top-level places; children inherit theirs.
    if (input.address) throw badRequest('address_on_child');
  }
  const id = await createArea(householdId, input);
  return NextResponse.json({ id }, { status: 201 });
});
