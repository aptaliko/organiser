import { getUserById, updateUser } from '@/db/queries/users';
import { createHouseholdFor, getMemberships, type Role } from '@/db/queries/households';
import { getDict, isLocale } from '@/i18n';
import { HttpError } from './http';
import { currentUserId, getUserId } from './requestUser';

export interface HouseholdContext {
  userId: number;
  householdId: number;
  role: Role;
}

/**
 * The household every read/write in this request is scoped to. `users.activeHouseholdId`
 * is only a preference: it is always re-checked against household_members, falling back
 * to the user's oldest membership (and repairing the stale pointer). A user with no
 * household left (e.g. they left their only one) gets a fresh personal one.
 */
export async function resolveHousehold(userId: number): Promise<HouseholdContext> {
  const user = await getUserById(userId);
  // A valid token for a deleted user: treat as signed out.
  if (!user) throw new HttpError(401, 'unauthorized');

  const memberships = await getMemberships(userId);
  const active = memberships.find((m) => m.householdId === user.activeHouseholdId) ?? memberships[0];
  if (active) {
    if (active.householdId !== user.activeHouseholdId) {
      await updateUser(userId, { activeHouseholdId: active.householdId });
    }
    return { userId, householdId: active.householdId, role: active.role as Role };
  }

  const dict = getDict(isLocale(user.locale) ? user.locale : 'en');
  const householdId = await createHouseholdFor(userId, dict['household.defaultName']);
  return { userId, householdId, role: 'owner' };
}

/** For API route handlers. */
export function requireHousehold(request: Request): Promise<HouseholdContext> {
  return resolveHousehold(getUserId(request));
}

/** For Server Components. */
export async function currentHousehold(): Promise<HouseholdContext> {
  return resolveHousehold(await currentUserId());
}
