import { sql } from 'drizzle-orm';
import { db } from '../client';
import type { ItemSummary } from '@/lib/space';

/** Per area: Σ(w·d·h·qty) of items with full dimensions, and how many items lack them. */
export async function itemSummariesByArea(householdId: number): Promise<Map<number, ItemSummary>> {
  const result = await db.execute<{ area_id: number; volume: string; unknown: string }>(sql`
    SELECT area_id,
      coalesce(sum(width_cm::bigint * depth_cm * height_cm * quantity)
        FILTER (WHERE width_cm IS NOT NULL AND depth_cm IS NOT NULL AND height_cm IS NOT NULL), 0) AS volume,
      count(*) FILTER (WHERE width_cm IS NULL OR depth_cm IS NULL OR height_cm IS NULL) AS unknown
    FROM items
    WHERE household_id = ${householdId} AND area_id IS NOT NULL
    GROUP BY area_id
  `);
  return new Map(result.rows.map((r) => [Number(r.area_id), { volume: Number(r.volume), unknown: Number(r.unknown) }]));
}
