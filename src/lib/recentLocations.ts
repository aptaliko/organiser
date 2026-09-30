// The location picker offers the last few places used first — most adds and moves go to
// the same handful of boxes. Kept per household in localStorage (a per-device convenience).

export const MAX_RECENT = 5;

/** Most-recent-first, de-duplicated, capped. */
export function pushRecent(list: number[], id: number, max = MAX_RECENT): number[] {
  return [id, ...list.filter((x) => x !== id)].slice(0, max);
}

const key = (householdId: number) => `organiser:recent-areas:${householdId}`;

export function loadRecent(householdId: number): number[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key(householdId)) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((x): x is number => Number.isInteger(x)) : [];
  } catch {
    return [];
  }
}

export function rememberRecent(householdId: number, areaId: number) {
  try {
    localStorage.setItem(key(householdId), JSON.stringify(pushRecent(loadRecent(householdId), areaId)));
  } catch {
    // private mode / storage blocked: recents are optional
  }
}
