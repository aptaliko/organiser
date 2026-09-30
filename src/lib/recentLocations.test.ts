import { expect, it } from 'vitest';
import { pushRecent } from './recentLocations';

it('puts the newest first', () => {
  expect(pushRecent([2, 3], 1)).toEqual([1, 2, 3]);
});
it('moves an existing id to the front instead of duplicating', () => {
  expect(pushRecent([1, 2, 3], 3)).toEqual([3, 1, 2]);
});
it('caps the list', () => {
  expect(pushRecent([1, 2, 3, 4, 5], 6)).toEqual([6, 1, 2, 3, 4]);
  expect(pushRecent([1, 2], 3, 2)).toEqual([3, 1]);
});
