import { SearchScreen } from '@/components/SearchScreen';
import { currentHousehold } from '@/lib/household';
import { runSearch } from '@/lib/searchService';

export default async function SearchPage({ searchParams }: PageProps<'/'>) {
  const { householdId } = await currentHousehold();
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q : '';
  const tag = Number(params.tag);
  const tagId = Number.isInteger(tag) && tag > 0 ? tag : null;
  const data = await runSearch(householdId, query, tagId ?? undefined);
  // Remount between tag view and search so the input starts from the URL each time.
  return <SearchScreen key={tagId ?? 'search'} query={query} tagId={tagId} data={data} />;
}
