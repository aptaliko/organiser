import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createUserWithHousehold } from '@/db/queries/users';
import { getDict } from '@/i18n';
import { createSessionToken, getAuthCookieName, getAuthCookieOptions } from '@/lib/auth';
import { handle, HttpError, isUniqueViolation } from '@/lib/http';
import { hashPassword } from '@/lib/passwordHash';

const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().max(254),
  password: z.string().min(8).max(200),
  locale: z.enum(['en', 'el']).default('en'),
});

export const POST = handle(async (request) => {
  const input = registerSchema.parse(await request.json());

  let userId: number;
  try {
    userId = await createUserWithHousehold({
      email: input.email,
      passwordHash: hashPassword(input.password),
      name: input.name,
      locale: input.locale,
      householdName: getDict(input.locale)['household.defaultName'],
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, 'email_taken');
    throw err;
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(getAuthCookieName(), createSessionToken(userId), getAuthCookieOptions());
  return response;
});
