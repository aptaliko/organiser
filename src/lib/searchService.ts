import { listAreas } from '@/db/queries/areas';
import { listRecentItems } from '@/db/queries/items';
import { itemsWithTag, searchAreas, searchItems, searchTags, type ItemHit } from '@/db/queries/search';
import { locate, type Located } from './searchResults';

export type SearchItem = Omit<ItemHit, 'coverUrl'> & Located;
export type SearchArea = { id: number; name: string } & Located;
export interface SearchTag {
  id: number;
  name: string;
  color: string;
  itemCount: number;
}
export interface SearchResponse {
  items: SearchItem[];
  areas: SearchArea[];
  tags: SearchTag[];
  /** Set when showing a tag's items. */
  tag: SearchTag | null;
}

/**
 * Everything the search screen shows. Empty query → recently updated items.
 * Breadcrumbs are built in memory from one listAreas() call.
 */
export async function runSearch(householdId: number, query: string, tagId?: number): Promise<SearchResponse> {
  const q = query.trim().slice(0, 100);
  const [allAreas, itemHits, areaHits, tagHits] = await Promise.all([
    listAreas(householdId),
    tagId ? itemsWithTag(householdId, tagId) : q ? searchItems(householdId, q) : listRecentItems(householdId, 10),
    q && !tagId ? searchAreas(householdId, q) : Promise.resolve([]),
    q && !tagId ? searchTags(householdId, q) : Promise.resolve([]),
  ]);
  const byId = new Map(allAreas.map((a) => [a.id, a]));

  let tag: SearchTag | null = null;
  if (tagId) {
    const found = (await searchTags(householdId, '', 1000)).find((t) => t.id === tagId);
    tag = found ?? null;
  }

  return {
    items: itemHits.map(({ coverUrl, ...i }) => ({ ...i, ...locate(byId, i.areaId, coverUrl) })),
    areas: areaHits.map((a) => {
      const loc = locate(byId, a.parentId, a.coverUrl);
      return { id: a.id, name: a.name, ...loc };
    }),
    tags: tagHits,
    tag,
  };
}
