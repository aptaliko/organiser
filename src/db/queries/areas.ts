import { and, eq, sql } from 'drizzle-orm';
import { db } from '../client';
import { areas, type Area } from '../schema';
import { isUniqueViolation } from '@/lib/http';
import { generateQrCode } from '@/lib/qrCode';
import type { AreaCreateInput, AreaUpdateInput } from '@/lib/schemas';
import { photosJson } from './photos';

export interface AreaListRow {
  id: number;
  parentId: number | null;
  name: string;
  address: string | null;
  widthCm: number | null;
  depthCm: number | null;
  heightCm: number | null;
  qrCode: string;
  coverUrl: string | null;
  /** Item rows directly in this area. */
  itemCount: number;
}

// Correlated subqueries spell out "areas"."id": drizzle renders ${areas.id} as a bare "id",
// which inside the subquery would resolve to the inner table's own id.
const coverUrl = sql<string | null>`(
  SELECT p.url FROM photos p WHERE p.area_id = "areas"."id" ORDER BY p.sort_order, p.id LIMIT 1
)`;

/** Every area in the household, flat (one household is small; trees are built in memory). */
export function listAreas(householdId: number): Promise<AreaListRow[]> {
  return db
    .select({
      id: areas.id,
      parentId: areas.parentId,
      name: areas.name,
      address: areas.address,
      widthCm: areas.widthCm,
      depthCm: areas.depthCm,
      heightCm: areas.heightCm,
      qrCode: areas.qrCode,
      coverUrl,
      itemCount: sql`(SELECT count(*) FROM items i WHERE i.area_id = "areas"."id")`.mapWith(Number),
    })
    .from(areas)
    .where(eq(areas.householdId, householdId));
}

export async function getArea(householdId: number, id: number): Promise<Area | undefined> {
  const [row] = await db
    .select()
    .from(areas)
    .where(and(eq(areas.householdId, householdId), eq(areas.id, id)));
  return row;
}

export async function getAreaByQrCode(qrCode: string) {
  const [row] = await db
    .select({ id: areas.id, householdId: areas.householdId })
    .from(areas)
    .where(eq(areas.qrCode, qrCode));
  return row;
}

/** Inserts the area and its photos atomically; retries on the (rare) QR code collision. */
export async function createArea(householdId: number, input: AreaCreateInput): Promise<number> {
  for (let attempt = 0; ; attempt++) {
    try {
      const result = await db.execute<{ id: number }>(sql`
        WITH a AS (
          INSERT INTO areas (household_id, parent_id, name, description, address, width_cm, depth_cm, height_cm, qr_code)
          VALUES (${householdId}, ${input.parentId}, ${input.name}, ${input.description}, ${input.address},
                  ${input.widthCm}, ${input.depthCm}, ${input.heightCm}, ${generateQrCode()})
          RETURNING id
        ), p AS (
          INSERT INTO photos (household_id, area_id, url, width, height, sort_order)
          SELECT ${householdId}, a.id, e.v->>'url', (e.v->>'width')::int, (e.v->>'height')::int, e.ord - 1
          FROM a, jsonb_array_elements(${photosJson(input.photos)}::jsonb) WITH ORDINALITY AS e(v, ord)
        )
        SELECT id FROM a
      `);
      return Number(result.rows[0].id);
    } catch (err) {
      if (attempt < 4 && isUniqueViolation(err) && String(err).includes('qr_code')) continue;
      throw err;
    }
  }
}

export async function updateArea(householdId: number, id: number, patch: AreaUpdateInput) {
  await db
    .update(areas)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(areas.householdId, householdId), eq(areas.id, id)));
}
