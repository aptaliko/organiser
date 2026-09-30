import { NextResponse } from 'next/server';
import { z } from 'zod';
import { renameHousehold } from '@/db/queries/households';
import { requireHousehold } from '@/lib/household';
import { handle } from '@/lib/http';

export const PATCH = handle(async (request) => {
  const { householdId } = await requireHousehold(request);
  const { name } = z.object({ name: z.string().trim().min(1).max(120) }).parse(await request.json());
  await renameHousehold(householdId, name);
  return NextResponse.json({ ok: true });
});
