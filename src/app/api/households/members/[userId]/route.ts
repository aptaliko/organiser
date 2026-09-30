import { NextResponse } from 'next/server';
import { z } from 'zod';
import { listMembers, removeMember, setRole } from '@/db/queries/households';
import { requireHousehold } from '@/lib/household';
import { badRequest, handle, HttpError, notFound, parseId } from '@/lib/http';
import { checkLeave } from '@/lib/householdRules';

type Ctx = RouteContext<'/api/households/members/[userId]'>;

async function ownerTarget(request: Request, ctx: Ctx) {
  const { userId, householdId, role } = await requireHousehold(request);
  if (role !== 'owner') throw new HttpError(403, 'owner_only');
  const targetId = parseId((await ctx.params).userId);
  const members = await listMembers(householdId);
  if (!members.some((m) => m.userId === targetId)) throw notFound();
  return { userId, householdId, targetId, members };
}

/** Owners only: make another member an owner. */
export const PATCH = handle(async (request, ctx: Ctx) => {
  const { householdId, targetId } = await ownerTarget(request, ctx);
  const { role } = z.object({ role: z.enum(['owner', 'member']) }).parse(await request.json());
  await setRole(householdId, targetId, role);
  return NextResponse.json({ ok: true });
});

/** Owners only: remove someone else (to remove yourself, leave). */
export const DELETE = handle(async (request, ctx: Ctx) => {
  const { userId, householdId, targetId, members } = await ownerTarget(request, ctx);
  if (targetId === userId) throw badRequest('use_leave');
  const verdict = checkLeave(members, targetId);
  if (verdict !== 'ok') throw badRequest(verdict);
  await removeMember(householdId, targetId);
  return NextResponse.json({ ok: true });
});
