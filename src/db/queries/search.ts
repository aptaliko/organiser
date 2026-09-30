import { sql } from 'drizzle-orm';
import { db } from '../client';

// Accent/case-insensitive via f_unaccent(lower(...)) on both sides (migration 0001);
// typo-tolerant via pg_trgm word_similarity. 0.5 was tuned on Greek data: it catches
// "κατσαβδι" → "Κατσαβίδια" (0.67) and "δραπνο" → "Δράπανο…" (0.57), not "κλειδι" (0.14).
const TYPO_THRESHOLD = 0.5;

export interface ItemHit {
  id: number;
  name: string;
  quantity: number;
  areaId: number | null;
  coverUrl: string | null;
}
export interface AreaHit {
  id: number;
  name: string;
  parentId: number | null;
  coverUrl: string | null;
}
export interface TagHit {
  id: number;
  name: string;
  color: string;
  itemCount: number;
}

/** Escapes LIKE wildcards so "50%" or "a_b" search literally. */
const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function searchItems(householdId: number, query: string, limit = 30): Promise<ItemHit[]> {
  const like = likeEscape(query);
  const result = await db.execute<{
    id: number;
    name: string;
    quantity: number;
    area_id: number | null;
    cover_url: string | null;
  }>(sql`
    WITH q AS (SELECT f_unaccent(lower(${query})) AS raw, f_unaccent(lower(${like})) AS pat)
    SELECT i.id, i.name, i.quantity, i.area_id,
      (SELECT p.url FROM photos p WHERE p.item_id = i.id ORDER BY p.sort_order, p.id LIMIT 1) AS cover_url
    FROM items i, q, LATERAL (SELECT f_unaccent(lower(i.name)) AS n) nn
    WHERE i.household_id = ${householdId} AND (
      nn.n LIKE '%' || q.pat || '%'
      OR f_unaccent(lower(coalesce(i.description, ''))) LIKE '%' || q.pat || '%'
      OR word_similarity(q.raw, nn.n) >= ${TYPO_THRESHOLD}
      OR EXISTS (
        SELECT 1 FROM item_tags it JOIN tags t ON t.id = it.tag_id
        WHERE it.item_id = i.id AND f_unaccent(lower(t.name)) LIKE '%' || q.pat || '%'
      )
    )
    ORDER BY
      CASE WHEN nn.n LIKE q.pat || '%' THEN 0
           WHEN nn.n LIKE '%' || q.pat || '%' THEN 1
           WHEN word_similarity(q.raw, nn.n) >= ${TYPO_THRESHOLD} THEN 2
           ELSE 3 END,
      word_similarity(q.raw, nn.n) DESC,
      i.name
    LIMIT ${limit}
  `);
  return result.rows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    quantity: Number(r.quantity),
    areaId: r.area_id === null ? null : Number(r.area_id),
    coverUrl: r.cover_url,
  }));
}

export async function searchAreas(householdId: number, query: string, limit = 10): Promise<AreaHit[]> {
  const like = likeEscape(query);
  const result = await db.execute<{ id: number; name: string; parent_id: number | null; cover_url: string | null }>(sql`
    WITH q AS (SELECT f_unaccent(lower(${query})) AS raw, f_unaccent(lower(${like})) AS pat)
    SELECT a.id, a.name, a.parent_id,
      (SELECT p.url FROM photos p WHERE p.area_id = a.id ORDER BY p.sort_order, p.id LIMIT 1) AS cover_url
    FROM areas a, q, LATERAL (SELECT f_unaccent(lower(a.name)) AS n) nn
    WHERE a.household_id = ${householdId}
      AND (nn.n LIKE '%' || q.pat || '%' OR word_similarity(q.raw, nn.n) >= ${TYPO_THRESHOLD})
    ORDER BY CASE WHEN nn.n LIKE q.pat || '%' THEN 0 WHEN nn.n LIKE '%' || q.pat || '%' THEN 1 ELSE 2 END,
      word_similarity(q.raw, nn.n) DESC, a.name
    LIMIT ${limit}
  `);
  return result.rows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    parentId: r.parent_id === null ? null : Number(r.parent_id),
    coverUrl: r.cover_url,
  }));
}

export async function searchTags(householdId: number, query: string, limit = 10): Promise<TagHit[]> {
  const like = likeEscape(query);
  const result = await db.execute<{ id: number; name: string; color: string; item_count: number }>(sql`
    SELECT t.id, t.name, t.color, (SELECT count(*) FROM item_tags it WHERE it.tag_id = t.id) AS item_count
    FROM tags t
    WHERE t.household_id = ${householdId}
      AND f_unaccent(lower(t.name)) LIKE '%' || f_unaccent(lower(${like})) || '%'
    ORDER BY t.name
    LIMIT ${limit}
  `);
  return result.rows.map((r) => ({ id: Number(r.id), name: r.name, color: r.color, itemCount: Number(r.item_count) }));
}

export async function itemsWithTag(householdId: number, tagId: number, limit = 100): Promise<ItemHit[]> {
  const result = await db.execute<{
    id: number;
    name: string;
    quantity: number;
    area_id: number | null;
    cover_url: string | null;
  }>(sql`
    SELECT i.id, i.name, i.quantity, i.area_id,
      (SELECT p.url FROM photos p WHERE p.item_id = i.id ORDER BY p.sort_order, p.id LIMIT 1) AS cover_url
    FROM items i JOIN item_tags it ON it.item_id = i.id
    WHERE i.household_id = ${householdId} AND it.tag_id = ${tagId}
    ORDER BY i.name
    LIMIT ${limit}
  `);
  return result.rows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    quantity: Number(r.quantity),
    areaId: r.area_id === null ? null : Number(r.area_id),
    coverUrl: r.cover_url,
  }));
}
