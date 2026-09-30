import { NextResponse } from 'next/server';
import { requireHousehold } from '@/lib/household';
import { handle } from '@/lib/http';
import { runSearch } from '@/lib/searchService';

export const GET = handle(async (request) => {
  const { householdId } = await requireHousehold(request);
  const params = new URL(request.url).searchParams;
  const tag = Number(params.get('tag'));
  return NextResponse.json(await runSearch(householdId, params.get('q') ?? '', Number.isInteger(tag) && tag > 0 ? tag : undefined));
});
