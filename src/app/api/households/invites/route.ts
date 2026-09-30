import { NextResponse } from 'next/server';
import { createInvite, revokeInvites } from '@/db/queries/households';
import { requireHousehold } from '@/lib/household';
import { handle, HttpError } from '@/lib/http';
import { generateInviteToken, hashInviteToken, inviteExpiry } from '@/lib/inviteToken';

/** Any member can invite: returns a link valid for 7 days (multi-use). */
export const POST = handle(async (request) => {
  const { userId, householdId } = await requireHousehold(request);
  const token = generateInviteToken();
  const expiresAt = inviteExpiry();
  await createInvite(householdId, userId, hashInviteToken(token), expiresAt);
  const origin = process.env.APP_URL?.replace(/\/$/, '') || new URL(request.url).origin;
  return NextResponse.json({ url: `${origin}/invite/${token}`, expiresAt }, { status: 201 });
});

/** Owners can stop every outstanding link at once (e.g. one was shared too widely). */
export const DELETE = handle(async (request) => {
  const { householdId, role } = await requireHousehold(request);
  if (role !== 'owner') throw new HttpError(403, 'owner_only');
  await revokeInvites(householdId);
  return NextResponse.json({ ok: true });
});
