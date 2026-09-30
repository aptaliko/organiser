import { NextResponse } from 'next/server';
import { z } from 'zod';
import { findInvite } from '@/db/queries/households';
import { createUserInHousehold, createUserWithHousehold } from '@/db/queries/users';
import { getDict } from '@/i18n';
import { createSessionToken, getAuthCookieName, getAuthCookieOptions } from '@/lib/auth';
import { handle, HttpError, isUniqueViolation } from '@/lib/http';
import { hashInviteToken, isInviteUsable, looksLikeInviteToken } from '@/lib/inviteToken';
import { hashPassword } from '@/lib/passwordHash';

const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().max(254),
  password: z.string().min(8).max(200),
  locale: z.enum(['en', 'el']).default('en'),
  /** From an invite link: join that household instead of getting a new one. */
  invite: z.string().optional(),
});

export const POST = handle(async (request) => {
  const input = registerSchema.parse(await request.json());

  const invite =
    input.invite && looksLikeInviteToken(input.invite) ? await findInvite(hashInviteToken(input.invite)) : undefined;
  if (input.invite && (!invite || !isInviteUsable(invite))) throw new HttpError(410, 'invite_invalid');

  let userId: number;
  try {
    const common = { email: input.email, passwordHash: hashPassword(input.password), name: input.name, locale: input.locale };
    userId = invite
      ? await createUserInHousehold({ ...common, householdId: invite.householdId })
      : await createUserWithHousehold({ ...common, householdName: getDict(input.locale)['household.defaultName'] });
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, 'email_taken');
    throw err;
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(getAuthCookieName(), createSessionToken(userId), getAuthCookieOptions());
  return response;
});
