import { listAreas, type AreaListRow } from '@/db/queries/areas';
import { itemSummariesByArea } from '@/db/queries/space';
import type { PickerArea } from '@/components/LocationPicker';
import { usageByArea, type Usage } from './space';

/** What the location picker needs, including free space for fit hints. */
export function toPickerAreas(rows: AreaListRow[], usage?: Map<number, Usage>): PickerArea[] {
  return rows.map(({ id, parentId, name, coverUrl, widthCm, depthCm, heightCm }) => ({
    id,
    parentId,
    name,
    coverUrl,
    dims: { widthCm, depthCm, heightCm },
    usage: usage?.get(id) ?? null,
  }));
}

/** All areas plus per-area usage — the data behind trees, pickers and free-space bars. */
export async function loadPlaces(householdId: number) {
  const [areas, summaries] = await Promise.all([listAreas(householdId), itemSummariesByArea(householdId)]);
  const usage = usageByArea(areas, summaries);
  return { areas, usage, pickerAreas: toPickerAreas(areas, usage) };
}

export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
