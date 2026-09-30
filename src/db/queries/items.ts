import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../client';
import { items, itemTags, photos, tags, type Item, type Photo, type Tag } from '../schema';
import type { ItemCreateInput, ItemUpdateInput } from '@/lib/schemas';
import { listPhotos, photosJson } from './photos';

export interface ItemListRow {
  id: number;
  name: string;
  quantity: number;
  areaId: number | null;
  widthCm: number | null;
  depthCm: number | null;
  heightCm: number | null;
  coverUrl: string | null;
  updatedAt: Date;
}

const listColumns = {
  id: items.id,
  name: items.name,
  quantity: items.quantity,
  areaId: items.areaId,
  widthCm: items.widthCm,
  depthCm: items.depthCm,
  heightCm: items.heightCm,
  updatedAt: items.updatedAt,
  // "items"."id" spelled out: drizzle renders ${items.id} as a bare "id", which inside the
  // subquery would resolve to photos.id.
  coverUrl: sql<string | null>`(
    SELECT p.url FROM photos p WHERE p.item_id = "items"."id" ORDER BY p.sort_order, p.id LIMIT 1
  )`,
};

/** Items directly in `areaId`, or the Unplaced ones when null. */
export function listItemsInArea(householdId: number, areaId: number | null): Promise<ItemListRow[]> {
  return db
    .select(listColumns)
    .from(items)
    .where(and(eq(items.householdId, householdId), areaId === null ? isNull(items.areaId) : eq(items.areaId, areaId)))
    .orderBy(asc(items.name));
}

export function listRecentItems(householdId: number, limit = 10): Promise<ItemListRow[]> {
  return db
    .select(listColumns)
    .from(items)
    .where(eq(items.householdId, householdId))
    .orderBy(desc(items.updatedAt))
    .limit(limit);
}

export async function countUnplaced(householdId: number): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql`count(*)`.mapWith(Number) })
    .from(items)
    .where(and(eq(items.householdId, householdId), isNull(items.areaId)));
  return count;
}

export interface ItemDetail extends Item {
  photos: Photo[];
  tags: Tag[];
}

export async function getItem(householdId: number, id: number): Promise<ItemDetail | undefined> {
  const [row] = await db
    .select()
    .from(items)
    .where(and(eq(items.householdId, householdId), eq(items.id, id)));
  if (!row) return undefined;
  const [itemPhotos, itemTagRows] = await Promise.all([
    listPhotos(householdId, { itemId: id }),
    db
      .select({ tag: tags })
      .from(itemTags)
      .innerJoin(tags, eq(tags.id, itemTags.tagId))
      .where(eq(itemTags.itemId, id))
      .orderBy(asc(tags.name)),
  ]);
  return { ...row, photos: itemPhotos, tags: itemTagRows.map((r) => r.tag) };
}

/**
 * Item + its tags + its photos in one atomic statement. `tagIds` and `areaId` must already
 * be verified to belong to the household.
 */
export async function createItem(householdId: number, input: ItemCreateInput): Promise<number> {
  const result = await db.execute<{ id: number }>(sql`
    WITH i AS (
      INSERT INTO items (household_id, area_id, name, description, quantity, width_cm, depth_cm, height_cm)
      VALUES (${householdId}, ${input.areaId}, ${input.name}, ${input.description}, ${input.quantity},
              ${input.widthCm}, ${input.depthCm}, ${input.heightCm})
      RETURNING id
    ), t AS (
      INSERT INTO item_tags (item_id, tag_id)
      SELECT i.id, x::int FROM i, jsonb_array_elements_text(${JSON.stringify(input.tagIds)}::jsonb) AS x
    ), p AS (
      INSERT INTO photos (household_id, item_id, url, width, height, sort_order)
      SELECT ${householdId}, i.id, e.v->>'url', (e.v->>'width')::int, (e.v->>'height')::int, e.ord - 1
      FROM i, jsonb_array_elements(${photosJson(input.photos)}::jsonb) WITH ORDINALITY AS e(v, ord)
    )
    SELECT id FROM i
  `);
  return Number(result.rows[0].id);
}

/** Field updates and (optionally) a full tag replacement, atomically. */
export async function updateItem(householdId: number, id: number, patch: ItemUpdateInput) {
  const { tagIds, ...fields } = patch;
  const scope = and(eq(items.householdId, householdId), eq(items.id, id));
  const update = db.update(items).set({ ...fields, updatedAt: new Date() }).where(scope);
  if (tagIds === undefined) {
    await update;
    return;
  }
  const replaceTags = [db.delete(itemTags).where(eq(itemTags.itemId, id))] as const;
  if (tagIds.length === 0) {
    await db.batch([update, ...replaceTags]);
  } else {
    await db.batch([
      update,
      ...replaceTags,
      db.insert(itemTags).values(tagIds.map((tagId) => ({ itemId: id, tagId }))),
    ]);
  }
}

/** Deletes the item (photo rows cascade); returns its photo URLs for storage cleanup. */
export async function deleteItem(householdId: number, id: number): Promise<string[] | null> {
  const urls = await db.select({ url: photos.url }).from(photos).where(eq(photos.itemId, id));
  const rows = await db
    .delete(items)
    .where(and(eq(items.householdId, householdId), eq(items.id, id)))
    .returning({ id: items.id });
  return rows.length ? urls.map((r) => r.url) : null;
}
