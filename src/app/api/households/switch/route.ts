import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getMembership } from '@/db/queries/households';
import { updateUser } from '@/db/queries/users';
import { handle, notFound } from '@/lib/http';
import { getUserId } from '@/lib/requestUser';

export const POST = handle(async (request) => {
  const userId = getUserId(request);
  const { householdId } = z.object({ householdId: z.number().int().positive() }).parse(await request.json());
  if (!(await getMembership(userId, householdId))) throw notFound();
  await updateUser(userId, { activeHouseholdId: householdId });
  return NextResponse.json({ ok: true });
});
