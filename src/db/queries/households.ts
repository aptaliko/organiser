import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../client';
import { householdInvites, householdMembers, households, users } from '../schema';

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

export async function renameHousehold(id: number, name: string) {
  await db.update(households).set({ name }).where(eq(households.id, id));
}

export function listMembers(householdId: number) {
  return db
    .select({ userId: users.id, name: users.name, email: users.email, role: householdMembers.role })
    .from(householdMembers)
    .innerJoin(users, eq(users.id, householdMembers.userId))
    .where(eq(householdMembers.householdId, householdId))
    .orderBy(asc(householdMembers.createdAt));
}

/** Adds the user (as member, if not already in) and makes it their active household. */
export async function joinHousehold(userId: number, householdId: number) {
  await db.batch([
    db.insert(householdMembers).values({ householdId, userId, role: 'member' }).onConflictDoNothing(),
    db.update(users).set({ activeHouseholdId: householdId }).where(eq(users.id, userId)),
  ]);
}

export async function removeMember(householdId: number, userId: number) {
  await db
    .delete(householdMembers)
    .where(and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, userId)));
}

export async function setRole(householdId: number, userId: number, role: Role) {
  await db
    .update(householdMembers)
    .set({ role })
    .where(and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, userId)));
}

export async function createInvite(householdId: number, createdBy: number, tokenHash: string, expiresAt: Date) {
  await db.insert(householdInvites).values({ householdId, createdBy, tokenHash, expiresAt });
}

export async function findInvite(tokenHash: string) {
  const [row] = await db
    .select({
      householdId: householdInvites.householdId,
      expiresAt: householdInvites.expiresAt,
      revokedAt: householdInvites.revokedAt,
      householdName: households.name,
    })
    .from(householdInvites)
    .innerJoin(households, eq(households.id, householdInvites.householdId))
    .where(eq(householdInvites.tokenHash, tokenHash));
  return row;
}

export async function revokeInvites(householdId: number) {
  await db
    .update(householdInvites)
    .set({ revokedAt: sql`now()` })
    .where(and(eq(householdInvites.householdId, householdId), isNull(householdInvites.revokedAt)));
}
