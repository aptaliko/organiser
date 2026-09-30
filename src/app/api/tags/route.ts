import { NextResponse } from 'next/server';
import { findOrCreateTag, listTags } from '@/db/queries/tags';
import { requireHousehold } from '@/lib/household';
import { handle } from '@/lib/http';
import { tagCreateSchema } from '@/lib/schemas';

export const GET = handle(async (request) => {
  const { householdId } = await requireHousehold(request);
  return NextResponse.json(await listTags(householdId));
});

/** Idempotent by name (ignoring case/accents): returns the existing tag if there is one. */
export const POST = handle(async (request) => {
  const { householdId } = await requireHousehold(request);
  const { name } = tagCreateSchema.parse(await request.json());
  return NextResponse.json(await findOrCreateTag(householdId, name));
});
