import { NextResponse } from 'next/server';
import { z } from 'zod';
import { findInvite, joinHousehold } from '@/db/queries/households';
import { handle, HttpError } from '@/lib/http';
import { hashInviteToken, isInviteUsable, looksLikeInviteToken } from '@/lib/inviteToken';
import { getUserId } from '@/lib/requestUser';

export const POST = handle(async (request) => {
  const userId = getUserId(request);
  const { token } = z.object({ token: z.string() }).parse(await request.json());
  const invite = looksLikeInviteToken(token) ? await findInvite(hashInviteToken(token)) : undefined;
  if (!invite || !isInviteUsable(invite)) throw new HttpError(410, 'invite_invalid');
  await joinHousehold(userId, invite.householdId);
  return NextResponse.json({ ok: true, householdId: invite.householdId });
});
