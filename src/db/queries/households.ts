import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '../client';
import { householdMembers, households, users } from '../schema';

export type Role = 'owner' | 'member';

export async function getMemberships(userId: number) {
  return db
    .select({ householdId: householdMembers.householdId, role: householdMembers.role, name: households.name })
    .from(householdMembers)
    .innerJoin(households, eq(households.id, householdMembers.householdId))
    .where(eq(householdMembers.userId, userId))
    .orderBy(asc(householdMembers.createdAt));
}

export async function getMembership(userId: number, householdId: number) {
  const [row] = await db
    .select({ role: householdMembers.role })
    .from(householdMembers)
    .where(and(eq(householdMembers.userId, userId), eq(householdMembers.householdId, householdId)));
  return row as { role: Role } | undefined;
}

/** A new household owned by `userId`, made active. Single statement (atomic). */
export async function createHouseholdFor(userId: number, name: string): Promise<number> {
  const result = await db.execute<{ id: number }>(sql`
    WITH h AS (
      INSERT INTO households (name) VALUES (${name}) RETURNING id
    ), m AS (
      INSERT INTO household_members (household_id, user_id, role) SELECT id, ${userId}, 'owner' FROM h
    ), u AS (
      UPDATE ${users} SET active_household_id = (SELECT id FROM h) WHERE id = ${userId}
    )
    SELECT id FROM h
  `);
  return Number(result.rows[0].id);
}

export async function getHousehold(id: number) {
  const [row] = await db.select().from(households).where(eq(households.id, id));
  return row;
}
