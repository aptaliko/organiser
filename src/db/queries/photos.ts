import { and, asc, eq, inArray, max, sql } from 'drizzle-orm';
import { db } from '../client';
import { photos, type Photo } from '../schema';
import type { PhotoInput } from '@/lib/schemas';

export type PhotoOwner = { areaId: number } | { itemId: number };

export function listPhotos(householdId: number, owner: PhotoOwner): Promise<Photo[]> {
  const ownerCond = 'areaId' in owner ? eq(photos.areaId, owner.areaId) : eq(photos.itemId, owner.itemId);
  return db
    .select()
    .from(photos)
    .where(and(eq(photos.householdId, householdId), ownerCond))
    .orderBy(asc(photos.sortOrder), asc(photos.id));
}

export async function addPhoto(householdId: number, owner: PhotoOwner, input: PhotoInput): Promise<Photo> {
  const ownerCond = 'areaId' in owner ? eq(photos.areaId, owner.areaId) : eq(photos.itemId, owner.itemId);
  const [{ top }] = await db
    .select({ top: max(photos.sortOrder) })
    .from(photos)
    .where(and(eq(photos.householdId, householdId), ownerCond));
  const [row] = await db
    .insert(photos)
    .values({ householdId, ...owner, ...input, sortOrder: (top ?? -1) + 1 })
    .returning();
  return row;
}

export async function getPhoto(householdId: number, id: number): Promise<Photo | undefined> {
  const [row] = await db
    .select()
    .from(photos)
    .where(and(eq(photos.householdId, householdId), eq(photos.id, id)));
  return row;
}

export async function deletePhotoRow(householdId: number, id: number) {
  await db.delete(photos).where(and(eq(photos.householdId, householdId), eq(photos.id, id)));
}

/** Makes `id` the cover (sortOrder below every sibling). */
export async function makeCover(photo: Photo) {
  const ownerCond =
    photo.areaId != null ? eq(photos.areaId, photo.areaId) : eq(photos.itemId, photo.itemId!);
  await db
    .update(photos)
    .set({
      sortOrder: sql`(SELECT coalesce(min(sort_order), 0) - 1 FROM photos WHERE ${ownerCond})`,
    })
    .where(eq(photos.id, photo.id));
}

/**
 * Of the given URLs, those no photo row references any more — safe to delete from storage.
 * (A split item shares photo URLs with the original, so a URL can have several rows.)
 */
export async function unreferencedUrls(urls: string[]): Promise<string[]> {
  if (urls.length === 0) return [];
  const stillUsed = await db
    .selectDistinct({ url: photos.url })
    .from(photos)
    .where(inArray(photos.url, urls));
  const used = new Set(stillUsed.map((r) => r.url));
  return [...new Set(urls)].filter((u) => !used.has(u));
}

/** SQL fragment: JSON for a photos array, consumed by the create-with-photos CTEs. */
export function photosJson(list: PhotoInput[]) {
  return JSON.stringify(list.map((p) => ({ url: p.url, width: p.width, height: p.height })));
}
