import { expect, it } from 'vitest';
import { matchesQuery, normalizeForSearch } from './search';

it('strips Greek accents and case', () => {
  expect(normalizeForSearch('Κατσαβίδι')).toBe('κατσαβιδι');
  expect(normalizeForSearch('ΐ Ϋ')).toBe('ι υ');
  expect(normalizeForSearch(' Café ')).toBe('cafe');
});

it('matches substrings ignoring accents', () => {
  expect(matchesQuery('Μπλε κουτί', 'κουτι')).toBe(true);
  expect(matchesQuery('Μπλε κουτί', 'ΚΟΥΤΊ')).toBe(true);
  expect(matchesQuery('Μπλε κουτί', 'ραφι')).toBe(false);
  expect(matchesQuery('anything', '  ')).toBe(true);
});
