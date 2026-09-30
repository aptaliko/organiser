import { expect, it } from 'vitest';
import { formatRelative } from './time';

const now = new Date('2026-09-30T12:00:00Z');
const ago = (s: number) => new Date(now.getTime() - s * 1000);

it.each([
  [10, 'en', 'now'],
  [90, 'en', '1 minute ago'],
  [3 * 3600, 'en', '3 hours ago'],
  [26 * 3600, 'en', 'yesterday'],
  [3 * 24 * 3600, 'en', '3 days ago'],
  [15 * 24 * 3600, 'en', '2 weeks ago'],
  [400 * 24 * 3600, 'en', 'last year'],
  [3 * 24 * 3600, 'el', 'πριν από 3 ημέρες'],
] as const)('%is ago (%s) → %s', (s, locale, out) => {
  expect(formatRelative(ago(s), locale, now)).toBe(out);
});
