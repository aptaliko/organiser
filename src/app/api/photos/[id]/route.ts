import { NextResponse } from 'next/server';
import { z } from 'zod';
import { deletePhotoRow, getPhoto, makeCover, unreferencedUrls } from '@/db/queries/photos';
import { requireHousehold } from '@/lib/household';
import { handle, notFound, parseId } from '@/lib/http';
import { deleteStoredPhotos } from '@/lib/photoStorage';

type Ctx = RouteContext<'/api/photos/[id]'>;

export const PATCH = handle(async (request, ctx: Ctx) => {
  const { householdId } = await requireHousehold(request);
  const photo = await getPhoto(householdId, parseId((await ctx.params).id));
  if (!photo) throw notFound();
  z.object({ cover: z.literal(true) }).parse(await request.json());
  await makeCover(photo);
  return NextResponse.json({ ok: true });
});

export const DELETE = handle(async (request, ctx: Ctx) => {
  const { householdId } = await requireHousehold(request);
  const photo = await getPhoto(householdId, parseId((await ctx.params).id));
  if (!photo) throw notFound();
  await deletePhotoRow(householdId, photo.id);
  await deleteStoredPhotos(await unreferencedUrls([photo.url]));
  return NextResponse.json({ ok: true });
});
