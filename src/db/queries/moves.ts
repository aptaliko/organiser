import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { db } from '../client';
import { areas, items, photos } from '../schema';
import type { MoveOp } from '@/lib/moveItems';

export function getMovableItems(householdId: number, ids: number[]) {
  if (ids.length === 0) return Promise.resolve([]);
  return db
    .select({ id: items.id, name: items.name, quantity: items.quantity, areaId: items.areaId })
    .from(items)
    .where(and(eq(items.householdId, householdId), inArray(items.id, ids)));
}

export function getItemNamesIn(householdId: number, areaId: number | null) {
  return db
    .select({ id: items.id, name: items.name })
    .from(items)
    .where(and(eq(items.householdId, householdId), areaId === null ? isNull(items.areaId) : eq(items.areaId, areaId)));
}

/** Copies an item's row (with a new quantity and place), its tags and photo references. */
function splitStatement(householdId: number, fromId: number, quantity: number, targetAreaId: number | null) {
  return db.execute<{ id: number }>(sql`
    WITH n AS (
      INSERT INTO items (household_id, area_id, name, description, width_cm, depth_cm, height_cm, quantity)
      SELECT household_id, ${targetAreaId}, name, description, width_cm, depth_cm, height_cm, ${quantity}
      FROM items WHERE id = ${fromId} AND household_id = ${householdId}
      RETURNING id
    ), t AS (
      INSERT INTO item_tags (item_id, tag_id) SELECT n.id, it.tag_id FROM n, item_tags it WHERE it.item_id = ${fromId}
    ), p AS (
      INSERT INTO photos (household_id, item_id, url, width, height, sort_order)
      SELECT p.household_id, n.id, p.url, p.width, p.height, p.sort_order FROM n, photos p WHERE p.item_id = ${fromId}
    )
    SELECT id FROM n
  `);
}

/**
 * Executes planned item moves atomically (one neon-http batch). Returns, per op, the id of
 * the row that now holds the moved quantity (for undo) and the photo URLs of any source rows
 * deleted by a merge (for storage cleanup).
 */
export async function executeItemMoves(householdId: number, ops: MoveOp[], targetAreaId: number | null) {
  const now = new Date();
  const scope = (id: number) => and(eq(items.householdId, householdId), eq(items.id, id));
  const removedIds = ops.flatMap((op) => (op.kind === 'merge' && op.removesSource ? [op.fromId] : []));
  const removedUrls = removedIds.length
    ? (await db.select({ url: photos.url }).from(photos).where(inArray(photos.itemId, removedIds))).map((r) => r.url)
    : [];

  const statements: BatchItem<'pg'>[] = [];
  const splitIndexes = new Map<number, number>(); // op index → statement index
  ops.forEach((op, i) => {
    if (op.kind === 'relocate') {
      statements.push(db.update(items).set({ areaId: targetAreaId, updatedAt: now }).where(scope(op.itemId)));
    } else if (op.kind === 'split') {
      statements.push(
        db.update(items).set({ quantity: sql`${items.quantity} - ${op.quantity}`, updatedAt: now }).where(scope(op.fromId)),
      );
      splitIndexes.set(i, statements.length);
      statements.push(splitStatement(householdId, op.fromId, op.quantity, targetAreaId));
    } else {
      statements.push(
        db.update(items).set({ quantity: sql`${items.quantity} + ${op.quantity}`, updatedAt: now }).where(scope(op.intoId)),
      );
      statements.push(
        op.removesSource
          ? db.delete(items).where(scope(op.fromId))
          : db.update(items).set({ quantity: sql`${items.quantity} - ${op.quantity}`, updatedAt: now }).where(scope(op.fromId)),
      );
    }
  });
  if (statements.length === 0) return { resultIds: [] as number[], removedUrls: [] as string[] };

  const results = await db.batch(statements as [BatchItem<'pg'>, ...BatchItem<'pg'>[]]);
  const resultIds = ops.map((op, i) => {
    if (op.kind === 'relocate') return op.itemId;
    if (op.kind === 'merge') return op.intoId;
    const res = results[splitIndexes.get(i)!] as { rows: { id: number }[] };
    return Number(res.rows[0].id);
  });
  return { resultIds, removedUrls };
}

export async function moveAreas(householdId: number, ids: number[], targetParentId: number | null) {
  if (ids.length === 0) return;
  await db
    .update(areas)
    .set({ parentId: targetParentId, updatedAt: new Date() })
    .where(and(eq(areas.householdId, householdId), inArray(areas.id, ids)));
}
