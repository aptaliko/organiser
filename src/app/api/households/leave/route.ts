import { NextResponse } from 'next/server';
import { listMembers, removeMember } from '@/db/queries/households';
import { requireHousehold } from '@/lib/household';
import { badRequest, handle } from '@/lib/http';
import { checkLeave } from '@/lib/householdRules';

export const POST = handle(async (request) => {
  const { userId, householdId } = await requireHousehold(request);
  const verdict = checkLeave(await listMembers(householdId), userId);
  if (verdict !== 'ok') throw badRequest(verdict);
  await removeMember(householdId, userId);
  // resolveHousehold() moves them to another membership (or a fresh household) next request.
  return NextResponse.json({ ok: true });
});
