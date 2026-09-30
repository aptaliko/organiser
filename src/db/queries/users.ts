import { eq, sql } from 'drizzle-orm';
import { db } from '../client';
import { users, type User } from '../schema';
import type { Locale } from '@/i18n';

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const [row] = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));
  return row;
}

export async function getUserById(id: number): Promise<User | undefined> {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row;
}

/**
 * Creates a user together with their first household (as owner) in ONE statement —
 * neon-http has no interactive transactions, and this must be all-or-nothing.
 * Throws a unique violation if the email is taken.
 */
export async function createUserWithHousehold(input: {
  email: string;
  passwordHash: string;
  name: string;
  locale: Locale;
  householdName: string;
}): Promise<number> {
  const result = await db.execute<{ id: number }>(sql`
    WITH h AS (
      INSERT INTO households (name) VALUES (${input.householdName}) RETURNING id
    ), u AS (
      INSERT INTO users (email, password_hash, name, locale, active_household_id)
      SELECT ${input.email.trim().toLowerCase()}, ${input.passwordHash}, ${input.name}, ${input.locale}, h.id FROM h
      RETURNING id, active_household_id
    ), m AS (
      INSERT INTO household_members (household_id, user_id, role)
      SELECT active_household_id, id, 'owner' FROM u
    )
    SELECT id FROM u
  `);
  return Number(result.rows[0].id);
}

/** A new user who joins an existing household (from an invite) instead of getting their own. */
export async function createUserInHousehold(input: {
  email: string;
  passwordHash: string;
  name: string;
  locale: Locale;
  householdId: number;
}): Promise<number> {
  const result = await db.execute<{ id: number }>(sql`
    WITH u AS (
      INSERT INTO users (email, password_hash, name, locale, active_household_id)
      VALUES (${input.email.trim().toLowerCase()}, ${input.passwordHash}, ${input.name}, ${input.locale}, ${input.householdId})
      RETURNING id
    ), m AS (
      INSERT INTO household_members (household_id, user_id, role) SELECT ${input.householdId}, id, 'member' FROM u
    )
    SELECT id FROM u
  `);
  return Number(result.rows[0].id);
}

export async function updateUser(id: number, patch: Partial<Pick<User, 'name' | 'locale' | 'activeHouseholdId'>>) {
  await db.update(users).set(patch).where(eq(users.id, id));
}
