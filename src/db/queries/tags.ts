import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../client';
import { tags, type Tag } from '../schema';

export const TAG_COLORS = ['#0f766e', '#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#ca8a04', '#4b5563'];

export function listTags(householdId: number): Promise<Tag[]> {
  return db.select().from(tags).where(eq(tags.householdId, householdId)).orderBy(asc(tags.name));
}

/** Returns the existing tag when one matches ignoring case and accents, else creates it. */
export async function findOrCreateTag(householdId: number, name: string): Promise<Tag> {
  const [existing] = await db
    .select()
    .from(tags)
    .where(
      and(eq(tags.householdId, householdId), sql`f_unaccent(lower(${tags.name})) = f_unaccent(lower(${name}))`),
    );
  if (existing) return existing;
  const [{ count }] = await db
    .select({ count: sql`count(*)`.mapWith(Number) })
    .from(tags)
    .where(eq(tags.householdId, householdId));
  const [row] = await db
    .insert(tags)
    .values({ householdId, name, color: TAG_COLORS[count % TAG_COLORS.length] })
    .onConflictDoNothing()
    .returning();
  // Lost a race with an identical insert: read the winner.
  return row ?? (await findOrCreateTag(householdId, name));
}

export async function updateTag(householdId: number, id: number, patch: { name?: string; color?: string }) {
  const [row] = await db
    .update(tags)
    .set(patch)
    .where(and(eq(tags.householdId, householdId), eq(tags.id, id)))
    .returning();
  return row;
}

export async function deleteTag(householdId: number, id: number) {
  const rows = await db
    .delete(tags)
    .where(and(eq(tags.householdId, householdId), eq(tags.id, id)))
    .returning({ id: tags.id });
  return rows.length > 0;
}

/** The subset of `ids` that are tags of this household. */
export async function ownedTagIds(householdId: number, ids: number[]): Promise<number[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.householdId, householdId), inArray(tags.id, ids)));
  return rows.map((r) => r.id);
}
