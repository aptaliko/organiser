import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserById, updateUser } from '@/db/queries/users';
import { handle, HttpError } from '@/lib/http';
import { getUserId } from '@/lib/requestUser';

export const GET = handle(async (request) => {
  const user = await getUserById(getUserId(request));
  if (!user) throw new HttpError(401, 'unauthorized');
  return NextResponse.json({ id: user.id, name: user.name, email: user.email, locale: user.locale });
});

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    locale: z.enum(['en', 'el']),
  })
  .partial();

export const PATCH = handle(async (request) => {
  const patch = patchSchema.parse(await request.json());
  await updateUser(getUserId(request), patch);
  return NextResponse.json({ ok: true });
});
