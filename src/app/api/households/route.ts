import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createHouseholdFor } from '@/db/queries/households';
import { handle } from '@/lib/http';
import { getUserId } from '@/lib/requestUser';

/** A new, separate household owned by the caller, made active. */
export const POST = handle(async (request) => {
  const { name } = z.object({ name: z.string().trim().min(1).max(120) }).parse(await request.json());
  const id = await createHouseholdFor(getUserId(request), name);
  return NextResponse.json({ id }, { status: 201 });
});
