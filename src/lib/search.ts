/** Case- and accent-insensitive form for client-side matching ("Κατσαβίδι" → "κατσαβιδι"). */
export function normalizeForSearch(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

export function matchesQuery(text: string, query: string): boolean {
  const q = normalizeForSearch(query);
  return q === '' || normalizeForSearch(text).includes(q);
}
