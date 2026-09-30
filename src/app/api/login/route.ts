import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserByEmail } from '@/db/queries/users';
import { createSessionToken, getAuthCookieName, getAuthCookieOptions } from '@/lib/auth';
import { handle, HttpError } from '@/lib/http';
import { verifyPassword } from '@/lib/passwordHash';

const loginSchema = z.object({ email: z.string().trim().min(1), password: z.string().min(1) });

export const POST = handle(async (request) => {
  const parsed = loginSchema.safeParse(await request.json());
  // One generic error for every failure mode, so the form can't be used to probe accounts.
  if (!parsed.success) throw new HttpError(401, 'invalid_credentials');

  const user = await getUserByEmail(parsed.data.email);
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    throw new HttpError(401, 'invalid_credentials');
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(getAuthCookieName(), createSessionToken(user.id), getAuthCookieOptions());
  return response;
});
